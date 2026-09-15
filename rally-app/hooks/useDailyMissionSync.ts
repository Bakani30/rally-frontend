import { useMutation, useQueryClient } from '@tanstack/react-query'
import { profileQueryKeys } from '@/lib/profile/profileQueryKeys'
import type { ProfileSummary, UserProfile } from '@/lib/profile/profileRepository'
import { dailyMissionQueryKeys } from '@/lib/daily-mission/dailyMissionQueryKeys'
import { syncDailyMissionFromDevice } from '@/lib/daily-mission/dailyMissionService'
import type { DailyMissionSyncResult } from '@/lib/daily-mission/dailyMissionTypes'
import type { WalletSummary } from '@/lib/wallet/walletService'
import {
  applyPointTransactionToProfileDetail,
  applyPointTransactionToProfileSummary,
  applyPointTransactionToWalletSummary,
} from '@/lib/wallet/pointBalanceRealtime'

export function useDailyMissionSync(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      if (!userId) throw new Error('Sign in before syncing daily mission')
      return syncDailyMissionFromDevice()
    },
    onSuccess: (result) => {
      // Publish the result to a shared cache key so read-only observers (e.g. the
      // quest hub done-count via useDailyMissionToday) see today's metrics without
      // owning this mutation instance.
      queryClient.setQueryData<DailyMissionSyncResult>(
        dailyMissionQueryKeys.today(userId),
        result,
      )
      if (result.sync.rewardGranted && result.sync.pointsAwarded > 0) {
        queryClient.setQueryData<WalletSummary | undefined>(
          ['wallet-summary', userId],
          (current) => applyPointTransactionToWalletSummary(current, {
            type: 'activity_reward',
            spendable_after: result.sync.balanceAfter,
          }),
        )
        queryClient.setQueryData<ProfileSummary | null | undefined>(
          profileQueryKeys.summary(userId),
          (current) => applyPointTransactionToProfileSummary(current, {
            type: 'activity_reward',
            spendable_after: result.sync.balanceAfter,
          }),
        )
        queryClient.setQueryData<UserProfile | undefined>(
          profileQueryKeys.detail(userId),
          (current) => applyPointTransactionToProfileDetail(current, {
            type: 'activity_reward',
            spendable_after: result.sync.balanceAfter,
          }),
        )
      }
      queryClient.invalidateQueries({ queryKey: ['wallet-summary', userId] })
      queryClient.invalidateQueries({ queryKey: profileQueryKeys.summary(userId) })
      queryClient.invalidateQueries({ queryKey: profileQueryKeys.detail(userId) })
    },
  })
}
