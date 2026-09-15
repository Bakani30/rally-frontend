import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { BASKETBALL_COURT_MODE_DURATION_SECONDS } from '@/lib/activities/basketball/courtModeTypes'
import {
  syncBasketballCourtModeFromDevice,
  type BasketballCourtModeSyncResult,
} from '@/lib/activities/basketball/courtModeService'
import { profileQueryKeys } from '@/lib/profile/profileQueryKeys'
import type { ProfileSummary, UserProfile } from '@/lib/profile/profileRepository'
import type { WalletSummary } from '@/lib/wallet/walletService'
import {
  applyPointTransactionToProfileDetail,
  applyPointTransactionToProfileSummary,
  applyPointTransactionToWalletSummary,
} from '@/lib/wallet/pointBalanceRealtime'

export type BasketballCourtModePhase = 'idle' | 'active' | 'pending_sync' | 'synced'

export type BasketballCourtModeState = {
  phase: BasketballCourtModePhase
  sessionKey: string | null
  startedAt: Date | null
  endedAt: Date | null
  elapsedSeconds: number
  remainingSeconds: number
  canCancel: boolean
  result: BasketballCourtModeSyncResult | null
  isSyncing: boolean
  error: Error | null
  start: () => void
  cancel: () => void
  sync: () => Promise<void>
  reset: () => void
}

export function useBasketballCourtMode(userId?: string): BasketballCourtModeState {
  const queryClient = useQueryClient()
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const [endedAt, setEndedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [result, setResult] = useState<BasketballCourtModeSyncResult | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const elapsedSeconds = useMemo(() => {
    if (!startedAt) return 0
    return Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000))
  }, [now, startedAt])
  const remainingSeconds = Math.max(0, BASKETBALL_COURT_MODE_DURATION_SECONDS - elapsedSeconds)
  const timerFinished = !!startedAt && !!endedAt && now.getTime() >= endedAt.getTime()
  const phase: BasketballCourtModePhase = result
    ? 'synced'
    : startedAt
      ? timerFinished
        ? 'pending_sync'
        : 'active'
      : 'idle'
  const canCancel = phase === 'active' && elapsedSeconds < 60

  useEffect(() => {
    if (!startedAt || result) return
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [result, startedAt])

  const reset = useCallback(() => {
    setSessionKey(null)
    setStartedAt(null)
    setEndedAt(null)
    setNow(new Date())
    setResult(null)
    setError(null)
    setIsSyncing(false)
  }, [])

  const start = useCallback(() => {
    const startTime = new Date()
    setSessionKey(createCourtModeSessionKey(startTime))
    setStartedAt(startTime)
    setEndedAt(new Date(startTime.getTime() + BASKETBALL_COURT_MODE_DURATION_SECONDS * 1000))
    setNow(startTime)
    setResult(null)
    setError(null)
  }, [])

  const cancel = useCallback(() => {
    if (!startedAt) return
    const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000)
    if (elapsed >= 60) return
    reset()
  }, [reset, startedAt])

  const sync = useCallback(async () => {
    if (!startedAt || !endedAt) return
    if (Date.now() < endedAt.getTime()) {
      setError(new Error('Court Mode sync opens when the 15-minute timer finishes.'))
      return
    }
    setIsSyncing(true)
    setError(null)
    try {
      const synced = await syncBasketballCourtModeFromDevice(startedAt, endedAt, {
        sessionKey: sessionKey ?? undefined,
        claimReward: !!userId,
      })
      setResult(synced)
      const pointsAwarded = synced.claim?.rewardGranted
        ? Math.max(0, synced.claim.pointsAwarded)
        : 0
      if (pointsAwarded > 0) {
        queryClient.setQueryData<WalletSummary | undefined>(
          ['wallet-summary', userId],
          (current) => applyPointTransactionToWalletSummary(current, {
            type: 'activity_reward',
            spendable_after: synced.claim?.balanceAfter,
          }),
        )
        queryClient.setQueryData<ProfileSummary | null | undefined>(
          profileQueryKeys.summary(userId),
          (current) => applyPointTransactionToProfileSummary(current, {
            type: 'activity_reward',
            spendable_after: synced.claim?.balanceAfter,
          }),
        )
        queryClient.setQueryData<UserProfile | undefined>(
          profileQueryKeys.detail(userId),
          (current) => applyPointTransactionToProfileDetail(current, {
            type: 'activity_reward',
            spendable_after: synced.claim?.balanceAfter,
          }),
        )
      }
      if (synced.claim) {
        queryClient.invalidateQueries({ queryKey: ['wallet-summary', userId] })
        queryClient.invalidateQueries({ queryKey: profileQueryKeys.summary(userId) })
        queryClient.invalidateQueries({ queryKey: profileQueryKeys.detail(userId) })
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Could not sync Basketball Court Mode.'))
    } finally {
      setIsSyncing(false)
      setNow(new Date())
    }
  }, [
    endedAt,
    queryClient,
    sessionKey,
    startedAt,
    userId,
  ])

  return {
    phase,
    sessionKey,
    startedAt,
    endedAt,
    elapsedSeconds,
    remainingSeconds,
    canCancel,
    result,
    isSyncing,
    error,
    start,
    cancel,
    sync,
    reset,
  }
}

function createCourtModeSessionKey(startedAt: Date): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `court:${startedAt.toISOString()}:${random}`
}
