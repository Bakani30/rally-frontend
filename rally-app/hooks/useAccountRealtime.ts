import { useEffect } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import { profileQueryKeys } from '@/lib/profile/profileQueryKeys'
import type { ProfileSummary, UserProfile } from '@/lib/profile/profileRepository'
import { supabase } from '@/lib/supabase'
import type { WalletSummary } from '@/lib/wallet/walletService'
import { homeWalletSnapshotQueryKey } from '@/lib/wallet/homeWalletSnapshot'
import {
  applyPointTransactionToProfileDetail,
  applyPointTransactionToProfileSummary,
  applyPointTransactionToWalletSummary,
  reconcilePendingOptimisticLockedDelta,
  type PointTransactionRealtimeRow,
} from '@/lib/wallet/pointBalanceRealtime'

type AccountSubscription = {
  channel: ReturnType<typeof supabase.channel>
  listeners: number
}

const accountSubscriptions = new Map<string, AccountSubscription>()

function patchPointTransactionCaches(
  queryClient: QueryClient,
  userId: string,
  transaction: PointTransactionRealtimeRow,
) {
  queryClient.setQueryData<ProfileSummary | null | undefined>(
    profileQueryKeys.summary(userId),
    (current) => applyPointTransactionToProfileSummary(current, transaction),
  )

  queryClient.setQueryData<UserProfile | undefined>(
    profileQueryKeys.detail(userId),
    (current) => applyPointTransactionToProfileDetail(current, transaction),
  )

  queryClient.setQueryData<WalletSummary | undefined>(
    ['wallet-summary', userId],
    (current) => applyPointTransactionToWalletSummary(current, transaction),
  )
}

function attachAccountSubscription(queryClient: QueryClient, userId: string) {
  const existing = accountSubscriptions.get(userId)
  if (existing) {
    existing.listeners += 1
    return
  }

  const channel = supabase
    .channel(`account:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'point_transactions',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        patchPointTransactionCaches(
          queryClient,
          userId,
          reconcilePendingOptimisticLockedDelta(userId, payload.new as PointTransactionRealtimeRow),
        )
        // Ledger list + earn-cap meter aren't patchable in place (list insert /
        // server-computed aggregate) — refetch them instead.
        void queryClient.invalidateQueries({ queryKey: homeWalletSnapshotQueryKey(userId) })
        void queryClient.invalidateQueries({ queryKey: ['wallet-transactions', userId] })
        void queryClient.invalidateQueries({ queryKey: ['daily-earn-cap', userId] })
      },
    )
    .subscribe()

  accountSubscriptions.set(userId, { channel, listeners: 1 })
}

function detachAccountSubscription(userId: string) {
  const subscription = accountSubscriptions.get(userId)
  if (!subscription) return

  subscription.listeners -= 1
  if (subscription.listeners > 0) return

  accountSubscriptions.delete(userId)
  void supabase.removeChannel(subscription.channel)
}

export function useAccountRealtime(userId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    attachAccountSubscription(queryClient, userId)
    return () => {
      detachAccountSubscription(userId)
    }
  }, [queryClient, userId])
}
