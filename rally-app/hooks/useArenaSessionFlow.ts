import { useCallback, useEffect, useRef, useState } from 'react'
import * as Crypto from 'expo-crypto'
import {
  onlineManager,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { advanceArenaQueue, readyArenaTeamMember, reorderArenaSessionQueue } from '@/lib/arenas/arenaRepository'
import { arenaSessionActions } from '@/lib/arena-sessions/arenaSessionActions'
import { arenaSessionQueryKeys } from '@/lib/arena-sessions/arenaSessionQueryKeys'
import { getArenaSessionSnapshot } from '@/lib/arena-sessions/arenaSessionRepository'
import { arenaSessionSnapshotQueryKey } from '@/lib/arena-sessions/arenaSessionSnapshotQuery'
import {
  ARENA_SESSION_RECONNECT_POLICY,
  createArenaSessionCreateAttempt,
  type ArenaSessionCreatePayload,
  mapArenaSessionSnapshot,
  resolveArenaSessionArenaId,
} from '@/lib/arena-sessions/arenaSessionService'
import { supabase } from '@/lib/supabase'
import type {
  ArenaSessionActionOutput,
} from '@/types/arenaSession'

const ACTIVE_REFETCH_MS = 10_000

export const ARENA_TEAM_PARTICIPATION_MUTATION_POLICY = {
  retry: false,
  networkMode: 'always',
} as const
export const ARENA_ROUND_STAKE_MUTATION_POLICY = {
  retry: false,
  networkMode: 'always',
} as const

type CreateArenaSessionMutationInput = ArenaSessionCreatePayload

type UseArenaSessionFlowInput = {
  userId?: string
  arenaId?: string
  enabled?: boolean
}

export function getArenaSessionSnapshotQueryOptions(
  userId: string | undefined,
  arenaId: string | undefined,
) {
  return queryOptions({
    queryKey: arenaSessionSnapshotQueryKey(userId, arenaId),
    queryFn: () => getArenaSessionSnapshot(arenaId!),
    enabled: Boolean(userId && arenaId),
    staleTime: 5_000,
    refetchInterval: (query) => {
      const sessionState = query.state.data?.session.sessionState
      return sessionState === 'closed' || sessionState === 'cancelled'
        ? false
        : ACTIVE_REFETCH_MS
    },
    // Reconnect is deliberately read-only. TanStack Query refetches the
    // actor-scoped snapshot; no Presence/readiness action is retried here.
    refetchOnReconnect: ARENA_SESSION_RECONNECT_POLICY.refetchSnapshot,
    refetchOnWindowFocus: true,
  })
}

export function subscribeToArenaSessionReconnect({
  onReconnect,
  onReconnectingChange,
  isEnabled,
}: {
  onReconnect: () => Promise<unknown>
  onReconnectingChange: (isReconnecting: boolean) => void
  isEnabled: () => boolean
}) {
  let wasOffline = !onlineManager.isOnline()
  let reconnectAttempt = 0
  let active = true

  const unsubscribe = onlineManager.subscribe((isOnline) => {
    if (!active) return
    if (!isOnline) {
      wasOffline = true
      return
    }
    if (!wasOffline) return
    wasOffline = false
    if (!isEnabled()) return

    const attempt = ++reconnectAttempt
    onReconnectingChange(true)
    void Promise.resolve()
      .then(onReconnect)
      .catch(() => undefined)
      .finally(() => {
        if (active && attempt === reconnectAttempt) onReconnectingChange(false)
      })
  })

  return () => {
    active = false
    unsubscribe()
  }
}

export function subscribeToArenaSessionRealtime({
  userId,
  arenaId,
  onInvalidate,
}: {
  userId: string
  arenaId: string
  onInvalidate: () => void
}) {
  const channel = supabase
    .channel('arena-session-snapshot:' + userId + ':' + arenaId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'arena_events', filter: 'id=eq.' + arenaId },
      onInvalidate,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'arena_teams', filter: 'arena_id=eq.' + arenaId },
      onInvalidate,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'arena_team_members', filter: 'arena_id=eq.' + arenaId },
      onInvalidate,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'arena_realtime_revisions',
        filter: 'arena_id=eq.' + arenaId,
      },
      onInvalidate,
    )

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') onInvalidate()
  })

  return () => {
    void supabase.removeChannel(channel)
  }
}

export function useArenaSessionFlow({
  userId,
  arenaId: requestedArenaId,
  enabled = true,
}: UseArenaSessionFlowInput) {
  const queryClient = useQueryClient()
  const [trackedArena, setTrackedArena] = useState<{ userId?: string; arenaId?: string }>({})
  const actorEnabled = enabled && Boolean(userId)
  const rememberedArenaId = trackedArena.userId === userId ? trackedArena.arenaId : undefined
  const arenaId = requestedArenaId ?? rememberedArenaId

  useEffect(() => {
    if (!userId || !requestedArenaId) return
    if (trackedArena.userId === userId && trackedArena.arenaId === requestedArenaId) return
    setTrackedArena({ userId, arenaId: requestedArenaId })
  }, [requestedArenaId, trackedArena.arenaId, trackedArena.userId, userId])

  const snapshotQuery = useQuery({
    ...getArenaSessionSnapshotQueryOptions(userId, arenaId),
    enabled: actorEnabled && Boolean(arenaId),
  })
  const [isReconnecting, setIsReconnecting] = useState(false)

  useEffect(() => subscribeToArenaSessionReconnect({
    onReconnect: () => queryClient.refetchQueries({
      queryKey: arenaSessionSnapshotQueryKey(userId, arenaId),
      type: 'active',
    }),
    onReconnectingChange: setIsReconnecting,
    isEnabled: () => actorEnabled && Boolean(arenaId),
  }), [actorEnabled, arenaId, queryClient, userId])

  const invalidateSnapshot = useCallback((nextArenaId = arenaId) => {
    if (!userId || !nextArenaId) return
    void queryClient.invalidateQueries({ queryKey: arenaSessionSnapshotQueryKey(userId, nextArenaId) })
  }, [arenaId, queryClient, userId])

  const refreshActorSnapshot = useCallback((nextArenaId: string) => {
    return refreshArenaSessionActorSnapshot(queryClient, userId, nextArenaId)
  }, [queryClient, userId])

  const trackArena = useCallback((nextArenaId: string) => {
    setTrackedArena({ userId, arenaId: nextArenaId })
  }, [userId])

  useEffect(() => {
    if (!actorEnabled || !userId || !arenaId) return
    return subscribeToArenaSessionRealtime({
      userId,
      arenaId,
      onInvalidate: invalidateSnapshot,
    })
  }, [actorEnabled, arenaId, invalidateSnapshot, userId])

  const invalidateArenaSessionOutput = useCallback((nextArenaId: string) => {
    trackArena(nextArenaId)
    invalidateSnapshot(nextArenaId)
    void queryClient.invalidateQueries({ queryKey: arenaSessionQueryKeys.all })
    void queryClient.invalidateQueries({ queryKey: arenaSessionQueryKeys.detail(nextArenaId) })
  }, [invalidateSnapshot, queryClient, trackArena])

  const createAttempt = useRef(createArenaSessionCreateAttempt(Crypto.randomUUID))
  const createMutation = useMutation({
    mutationFn: (
      input: CreateArenaSessionMutationInput,
    ) => createAttempt.current.execute(input, arenaSessionActions.create),
    onSuccess: (output) => {
      const createdArenaId = resolveArenaSessionArenaId({}, output)
      invalidateArenaSessionOutput(createdArenaId)
      void queryClient.invalidateQueries({
        queryKey: arenaSessionQueryKeys.membershipCandidates(userId),
      })
    },
  })

  const recordPresence = useCallback(async (input: {
    arenaEventId: string
    currentLat: number
    currentLng: number
    accuracyM: number
  }) => {
    // Raw coordinates are request-only and never enter query or mutation state.
    const output = await arenaSessionActions.recordPresence(input)
    invalidateArenaSessionOutput(input.arenaEventId)
    return output
  }, [invalidateArenaSessionOutput])

  const openMutation = useArenaSessionMutation<string>(
    queryClient,
    arenaSessionActions.open,
    userId,
    invalidateArenaSessionOutput,
  )
  const stagePartyMutation = useArenaSessionMutation<{
    arenaEventId: string
    partyId: string
    memberUserIds: string[]
  }>(
    queryClient,
    arenaSessionActions.stageParty,
    userId,
    invalidateArenaSessionOutput,
  )
  // Queue/round mutations stay on the Arena Events authority surface. The
  // Session snapshot is invalidated after the atomic queue transition.
  const advanceQueueMutation = useMutation({
    mutationFn: advanceArenaQueue,
    onSuccess: (output) => invalidateArenaSessionOutput(output.arenaId),
  })
  const reorderQueueMutation = useMutation({
    mutationFn: reorderArenaSessionQueue,
    onSuccess: (output) => invalidateArenaSessionOutput(output.arenaId),
  })
  const updateStakeProposalMutation = useArenaRoundStakeMutation(
    queryClient,
    arenaSessionActions.updateStakeProposal,
    userId,
    arenaId,
  )
  const confirmFinalStakeMutation = useArenaRoundStakeMutation(
    queryClient,
    arenaSessionActions.confirmFinalStake,
    userId,
    arenaId,
  )
  const startRoundMutation = useArenaRoundStakeMutation(
    queryClient,
    arenaSessionActions.startRound,
    userId,
    arenaId,
  )
  const chooseTeamParticipationMutation = useMutation({
    mutationFn: arenaSessionActions.chooseTeamParticipation,
    ...ARENA_TEAM_PARTICIPATION_MUTATION_POLICY,
    onMutate: (input): ArenaTeamParticipationMutationContext => ({
      userId,
      arenaId: input.arenaId,
    }),
    onSettled: async (_output, _error, _input, context) => {
      if (!context?.userId || !context.arenaId) return
      await refreshArenaSessionActorSnapshot(queryClient, context.userId, context.arenaId)
    },
  })
  const leaveMutation = useArenaSessionMutation<string>(
    queryClient,
    arenaSessionActions.leave,
    userId,
    invalidateArenaSessionOutput,
  )
  const beginDrainMutation = useArenaSessionMutation<string>(
    queryClient,
    arenaSessionActions.beginDrain,
    userId,
    invalidateArenaSessionOutput,
  )
  const closeMutation = useArenaSessionMutation<{ arenaEventId: string; cancel?: boolean }>(
    queryClient,
    arenaSessionActions.close,
    userId,
    invalidateArenaSessionOutput,
  )
  const readyMutation = useMutation({
    mutationFn: (arenaTeamId: string) => readyArenaTeamMember(arenaTeamId),
    onSuccess: (output) => invalidateArenaSessionOutput(output.arenaId),
  })

  const state = userId && arenaId
    ? snapshotQuery.isPending && !snapshotQuery.data
      ? { status: 'syncing' as const, arenaId }
      : snapshotQuery.data
        ? mapArenaSessionSnapshot(snapshotQuery.data)
        : { status: 'idle' as const }
    : { status: 'idle' as const }

  return {
    state,
    arenaId,
    snapshot: snapshotQuery.data,
    snapshotQuery,
    isReconnecting,
    // Keep this adapter name for callers that only need a query-shaped value;
    // its data is now the actor-scoped Session snapshot, never raw event data.
    arenaQuery: snapshotQuery,
    createMutation,
    recordPresence,
    readyMutation,
    openMutation,
    stagePartyMutation,
    advanceQueueMutation,
    reorderQueueMutation,
    updateStakeProposalMutation,
    confirmFinalStakeMutation,
    startRoundMutation,
    chooseTeamParticipationMutation,
    leaveMutation,
    beginDrainMutation,
    closeMutation,
  }
}

type ArenaRoundStakeMutationContext = {
  userId: string | undefined
  arenaId: string | undefined
}

type ArenaTeamParticipationMutationContext = {
  userId: string | undefined
  arenaId: string
}

function useArenaRoundStakeMutation<TInput>(
  queryClient: ReturnType<typeof useQueryClient>,
  mutationFn: (input: TInput) => Promise<unknown>,
  userId: string | undefined,
  arenaId: string | undefined,
) {
  return useMutation({
    mutationFn,
    ...ARENA_ROUND_STAKE_MUTATION_POLICY,
    onMutate: (): ArenaRoundStakeMutationContext => ({ userId, arenaId }),
    onSettled: async (_output, _error, _input, context) => {
      if (!context?.userId || !context.arenaId) return
      await refreshArenaSessionActorSnapshot(queryClient, context.userId, context.arenaId)
    },
  })
}

export async function refreshArenaSessionActorSnapshot(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string | undefined,
  arenaId: string,
) {
  if (!userId) return
  const queryKey = arenaSessionSnapshotQueryKey(userId, arenaId)
  await queryClient.invalidateQueries({ queryKey, refetchType: 'none' })
  // A decision response is not a replacement snapshot. Always fetch the
  // actor-scoped source of truth, including after a conflict or network error.
  await queryClient.refetchQueries({ queryKey, type: 'active' })
}

function useArenaSessionMutation<TInput>(
  queryClient: ReturnType<typeof useQueryClient>,
  mutationFn: (input: TInput) => Promise<ArenaSessionActionOutput>,
  userId: string | undefined,
  onResource: (arenaId: string) => void,
) {
  return useMutation({
    mutationFn,
    onSuccess: (output, input) => {
      const arenaId = resolveArenaSessionArenaId(
        input as string | { arenaEventId?: string },
        output,
      )
      onResource(arenaId)
      void queryClient.invalidateQueries({ queryKey: arenaSessionQueryKeys.all })
      void queryClient.invalidateQueries({
        queryKey: arenaSessionQueryKeys.membershipCandidates(userId),
      })
    },
  })
}
