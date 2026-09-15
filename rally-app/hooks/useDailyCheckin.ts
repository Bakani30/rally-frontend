import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyDailyCheckinResultToProfile } from '@/lib/profile/profileCheckin'
import { profileQueryKeys } from '@/lib/profile/profileQueryKeys'
import type { ProfileSummary, UserProfile } from '@/lib/profile/profileRepository'
import { dailyCheckin, todayLocalDate } from '@/lib/profile/profileService'
import type { WalletSummary } from '@/lib/wallet/walletService'
import {
  applyOptimisticPointBalanceDeltaToWalletSummary,
  applyPointTransactionToWalletSummary,
} from '@/lib/wallet/pointBalanceRealtime'

type DailyCheckinCacheSnapshot = {
  profileDetail?: UserProfile
  profileSummary?: ProfileSummary | null
  walletSummary?: WalletSummary
}

export function useDailyCheckin(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => dailyCheckin(userId!),
    onMutate: (): DailyCheckinCacheSnapshot => ({
      profileDetail: queryClient.getQueryData<UserProfile>(profileQueryKeys.detail(userId)),
      profileSummary: queryClient.getQueryData<ProfileSummary | null>(profileQueryKeys.summary(userId)),
      walletSummary: queryClient.getQueryData<WalletSummary>(['wallet-summary', userId]),
    }),
    onSuccess: (result, _variables, snapshot) => {
      const today = todayLocalDate()
      queryClient.setQueryData<UserProfile | undefined>(
        profileQueryKeys.detail(userId),
        (current) => snapshot?.profileDetail
          ? applyDailyCheckinResultToProfile(snapshot.profileDetail, result, today)
          : current,
      )
      queryClient.setQueryData<ProfileSummary | undefined>(
        profileQueryKeys.summary(userId),
        (current) => snapshot?.profileSummary
          ? applyDailyCheckinResultToProfile(snapshot.profileSummary, result, today)
          : current,
      )
      queryClient.setQueryData<WalletSummary | undefined>(
        ['wallet-summary', userId],
        (current) => {
          if (!snapshot?.walletSummary) return current
          if (result.score_after != null || result.spendable_after != null) {
            return applyPointTransactionToWalletSummary(snapshot.walletSummary, {
              type: 'daily_checkin',
              score_after: result.score_after,
              spendable_after: result.spendable_after,
            })
          }
          return applyOptimisticPointBalanceDeltaToWalletSummary(snapshot.walletSummary, {
            leaderboardDelta: Math.max(0, result.score_earned ?? result.points_earned),
            spendableDelta: Math.max(0, result.points_earned),
          })
        },
      )
      queryClient.invalidateQueries({ queryKey: profileQueryKeys.summary(userId) })
      queryClient.invalidateQueries({ queryKey: profileQueryKeys.detail(userId) })
      queryClient.invalidateQueries({ queryKey: ['wallet-summary', userId] })
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKeys.detail(userId) })
    },
  })
}
