import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'

import {
  arenaResultService,
  getArenaResultSnapshot,
} from '@/lib/arena-results/arenaResultService'
import {
  arenaSessionSnapshotQueryPrefix,
  isArenaSessionSnapshotQueryForArena,
} from '@/lib/arena-sessions/arenaSessionSnapshotQuery'
import type {
  ApproveArenaResultInput,
  ArenaResultActionOutput,
  ArenaRoundResultSnapshot,
  MutualCancelArenaResultInput,
  RequestArenaResultCorrectionInput,
  SubmitArenaResultInput,
} from '@/types/arenaResult'

const ARENA_RESULT_REFETCH_MS = 5_000

export const arenaResultQueryKey = (matchId: string) =>
  ['arena-result', matchId] as const

export type ArenaResultSubmitMutationInput = Omit<SubmitArenaResultInput, 'matchId' | 'expectedReviewEpoch'>

export type ArenaResultApproveMutationInput = Omit<ApproveArenaResultInput, 'matchId' | 'expectedReviewEpoch'>

export type ArenaResultCorrectionMutationInput = Omit<
  RequestArenaResultCorrectionInput,
  'matchId' | 'expectedReviewEpoch'
>

export type ArenaResultCancelMutationInput = {
  cancelAction: 'request' | 'agree' | 'decline' | 'withdraw'
}

export type UseArenaResultOptions = {
  enabled?: boolean
  onConflict?: () => void
}

type AuthoritativeRefreshState = {
  locked: boolean
  isRefreshing: boolean
  hasError: boolean
}

const IDLE_AUTHORITATIVE_REFRESH: AuthoritativeRefreshState = {
  locked: false,
  isRefreshing: false,
  hasError: false,
}

export function getArenaResultRefetchInterval(
  snapshot: ArenaRoundResultSnapshot | undefined,
  isForeground: boolean,
): number | false {
  if (!isForeground || !snapshot) return false
  return snapshot.roundStatus === 'settled' || snapshot.roundStatus === 'cancelled'
    ? false
    : ARENA_RESULT_REFETCH_MS
}

export function getArenaResultInvalidationKeys(
  snapshot: ArenaRoundResultSnapshot,
): QueryKey[] {
  const keys: QueryKey[] = [
    arenaResultQueryKey(snapshot.matchId),
    ['match', snapshot.matchId],
    arenaSessionSnapshotQueryPrefix,
  ]
  if (snapshot.roundStatus === 'settled' || snapshot.roundStatus === 'cancelled') {
    keys.push(['arena-events'])
  }
  return keys
}

export function isArenaResultVersionConflict(error: unknown): boolean {
  const conflictCodes = new Set([
    'arena_result_version_conflict',
    'arena_result_review_epoch_conflict',
    'arena_result_review_epoch_required',
    'arena_result_draft_revision_conflict',
  ])
  return Boolean(
    error
    && typeof error === 'object'
    && 'code' in error
    && typeof (error as { code?: unknown }).code === 'string'
    && conflictCodes.has((error as { code: string }).code),
  )
}

export function useArenaResult(
  matchId: string | undefined,
  options: UseArenaResultOptions = {},
) {
  const queryClient = useQueryClient()
  const enabled = options.enabled ?? true
  const onConflict = options.onConflict
  const [isForeground, setIsForeground] = useState(() => AppState.currentState === 'active')
  const [hasVersionConflict, setHasVersionConflict] = useState(false)
  const [authoritativeRefresh, setAuthoritativeRefresh] = useState<AuthoritativeRefreshState>(
    IDLE_AUTHORITATIVE_REFRESH,
  )
  const snapshotRef = useRef<ArenaRoundResultSnapshot | undefined>(undefined)
  const authoritativeArenaEventRef = useRef<string | undefined>(undefined)
  const resultKey = matchId ? arenaResultQueryKey(matchId) : ['arena-result', undefined] as const

  const resultQuery = useQuery({
    queryKey: resultKey,
    queryFn: () => getArenaResultSnapshot(matchId!),
    enabled: Boolean(matchId) && enabled,
    staleTime: 2_000,
    refetchInterval: (query) => getArenaResultRefetchInterval(query.state.data, isForeground),
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    snapshotRef.current = resultQuery.data
  }, [resultQuery.data])

  useEffect(() => {
    const onAppStateChange = (status: AppStateStatus) => {
      const foreground = status === 'active'
      setIsForeground(foreground)
      if (foreground && matchId && enabled) {
        void queryClient.refetchQueries({ queryKey: arenaResultQueryKey(matchId), type: 'active' })
      }
    }
    const subscription = AppState.addEventListener('change', onAppStateChange)
    return () => subscription.remove()
  }, [enabled, matchId, queryClient])

  const refreshAuthoritativeSnapshot = useCallback(async (arenaEventId?: string) => {
    if (!matchId) return
    const targetArenaEventId = arenaEventId
      ?? authoritativeArenaEventRef.current
      ?? snapshotRef.current?.arenaEventId
    authoritativeArenaEventRef.current = targetArenaEventId
    setAuthoritativeRefresh({ locked: true, isRefreshing: true, hasError: false })

    try {
      await invalidateArenaResultBaseQueries(queryClient, matchId)
      if (targetArenaEventId) {
        await invalidateArenaSessionSnapshotQueries(queryClient, targetArenaEventId)
      }
      await queryClient.refetchQueries({
        queryKey: arenaResultQueryKey(matchId),
        type: 'active',
      }, { throwOnError: true })
      const afterRefetch = queryClient.getQueryData<ArenaRoundResultSnapshot>(arenaResultQueryKey(matchId))
      if (afterRefetch && isTerminalArenaResult(afterRefetch)) {
        await invalidateArenaResultQueries(queryClient, afterRefetch)
      } else if (afterRefetch) {
        authoritativeArenaEventRef.current = afterRefetch.arenaEventId
        await invalidateArenaSessionSnapshotQueries(queryClient, afterRefetch.arenaEventId)
      }
      setAuthoritativeRefresh(IDLE_AUTHORITATIVE_REFRESH)
    } catch {
      setAuthoritativeRefresh({ locked: true, isRefreshing: false, hasError: true })
    }
  }, [matchId, queryClient])

  const recoverFromConflict = useCallback(async () => {
    setHasVersionConflict(true)
    onConflict?.()
    await refreshAuthoritativeSnapshot()
  }, [onConflict, refreshAuthoritativeSnapshot])

  const clearConflict = useCallback(() => setHasVersionConflict(false), [])

  const refreshAfterStatSave = useCallback(async () => {
    await refreshAuthoritativeSnapshot()
  }, [refreshAuthoritativeSnapshot])

  const retryAuthoritativeRefresh = useCallback(async () => {
    await refreshAuthoritativeSnapshot()
  }, [refreshAuthoritativeSnapshot])

  const submitMutation = useArenaResultMutation<ArenaResultSubmitMutationInput>(
    matchId,
    (input) => {
      const snapshot = requireArenaResultSnapshot(snapshotRef)
      return arenaResultService.submit({
        matchId: resolveMatchId(matchId),
        side0Score: input.side0Score,
        side1Score: input.side1Score,
        expectedReviewEpoch: snapshot.reviewEpoch,
        ...(input.note === undefined ? {} : { note: input.note }),
      })
    },
    snapshotRef,
    recoverFromConflict,
    clearConflict,
    refreshAuthoritativeSnapshot,
  )
  const approveMutation = useArenaResultMutation<ArenaResultApproveMutationInput>(
    matchId,
    (input) => {
      const snapshot = requireArenaResultSnapshot(snapshotRef)
      return arenaResultService.approve({
        matchId: resolveMatchId(matchId),
        resultVersion: input.resultVersion,
        payloadHash: input.payloadHash,
        expectedReviewEpoch: snapshot.reviewEpoch,
      })
    },
    snapshotRef,
    recoverFromConflict,
    clearConflict,
    refreshAuthoritativeSnapshot,
  )
  const correctionMutation = useArenaResultMutation<ArenaResultCorrectionMutationInput>(
    matchId,
    (input) => {
      const snapshot = requireArenaResultSnapshot(snapshotRef)
      return arenaResultService.requestCorrection({
        matchId: resolveMatchId(matchId),
        resultVersion: input.resultVersion,
        payloadHash: input.payloadHash,
        expectedReviewEpoch: snapshot.reviewEpoch,
        ...(input.note === undefined ? {} : { note: input.note }),
      })
    },
    snapshotRef,
    recoverFromConflict,
    clearConflict,
    refreshAuthoritativeSnapshot,
  )
  const cancelMutation = useArenaResultMutation<ArenaResultCancelMutationInput>(
    matchId,
    (input) => arenaResultService.mutualCancel(buildMutualCancelInput(
      resolveMatchId(matchId),
      requireArenaResultSnapshot(snapshotRef),
      input,
    )),
    snapshotRef,
    recoverFromConflict,
    clearConflict,
    refreshAuthoritativeSnapshot,
  )

  return {
    resultQuery,
    snapshot: resultQuery.data,
    submitMutation,
    approveMutation,
    correctionMutation,
    cancelMutation,
    hasVersionConflict,
    conflict: hasVersionConflict,
    clearConflict,
    refreshAfterStatSave,
    authoritativeRefresh,
    retryAuthoritativeRefresh,
  }
}

function useArenaResultMutation<TInput>(
  matchId: string | undefined,
  mutationFn: (input: TInput) => Promise<ArenaResultActionOutput>,
  snapshotRef: { current: ArenaRoundResultSnapshot | undefined },
  recoverFromConflict: () => Promise<void>,
  clearConflict: () => void,
  refreshAuthoritativeSnapshot: (arenaEventId?: string) => Promise<void>,
) {
  return useMutation({
    mutationFn,
    retry: false,
    onSuccess: async (output) => {
      clearConflict()
      await refreshAuthoritativeSnapshot(snapshotRef.current?.arenaEventId ?? output.arenaId)
    },
    onError: async (error) => {
      if (isArenaResultVersionConflict(error)) await recoverFromConflict()
    },
  })
}

async function invalidateArenaResultQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshot: ArenaRoundResultSnapshot,
) {
  await Promise.all(getArenaResultInvalidationKeys(snapshot).map((queryKey) => {
    if (queryKey === arenaSessionSnapshotQueryPrefix) {
      return queryClient.invalidateQueries({
        predicate: (query) => isArenaSessionSnapshotQueryForArena(query.queryKey, snapshot.arenaEventId),
        refetchType: 'none',
      })
    }
    return queryClient.invalidateQueries({ queryKey, refetchType: 'none' })
  }))
}

async function invalidateArenaResultBaseQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  matchId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: arenaResultQueryKey(matchId), refetchType: 'none' }),
    queryClient.invalidateQueries({ queryKey: ['match', matchId], refetchType: 'none' }),
  ])
}

async function invalidateArenaSessionSnapshotQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  arenaEventId: string,
) {
  await queryClient.invalidateQueries({
    predicate: (query) => isArenaSessionSnapshotQueryForArena(query.queryKey, arenaEventId),
    refetchType: 'none',
  })
}

function isTerminalArenaResult(snapshot: ArenaRoundResultSnapshot): boolean {
  return snapshot.roundStatus === 'settled' || snapshot.roundStatus === 'cancelled'
}

function resolveMatchId(hookMatchId: string | undefined): string {
  if (!hookMatchId) throw new Error('Arena result mutation requires matchId')
  return hookMatchId
}

function requireArenaResultSnapshot(
  snapshotRef: { current: ArenaRoundResultSnapshot | undefined },
): ArenaRoundResultSnapshot {
  if (snapshotRef.current) return snapshotRef.current
  const error = new Error('Arena result mutation requires an authoritative snapshot') as Error & {
    code: 'arena_result_review_epoch_required'
  }
  error.code = 'arena_result_review_epoch_required'
  throw error
}

function buildMutualCancelInput(
  matchId: string,
  snapshot: ArenaRoundResultSnapshot,
  input: ArenaResultCancelMutationInput,
): MutualCancelArenaResultInput {
  if (input.cancelAction === 'request') {
    return {
      matchId,
      cancelAction: 'request',
      expectedReviewEpoch: snapshot.reviewEpoch,
    }
  }
  if (snapshot.cancellation.status !== 'pending') {
    const error = new Error('Arena cancel response requires a pending request') as Error & {
      code: 'arena_cancel_request_id_required'
    }
    error.code = 'arena_cancel_request_id_required'
    throw error
  }
  return {
    matchId,
    cancelAction: input.cancelAction,
    cancelRequestId: snapshot.cancellation.cancelRequestId,
    expectedReviewEpoch: snapshot.reviewEpoch,
  }
}
