import { useMutation, useQueryClient } from '@tanstack/react-query'
import { profileQueryKeys } from '@/lib/profile/profileQueryKeys'
import type { ProfileSummary, UserProfile } from '@/lib/profile/profileRepository'
import { changeUsername } from '@/lib/username/usernameService'
import type { WalletSummary } from '@/lib/wallet/walletService'
import { applyOptimisticPointBalanceDeltaToWalletSummary } from '@/lib/wallet/pointBalanceRealtime'
import type { ChangeUsernameInput, ChangeUsernameResult } from '@/types/username'

type ChangeUsernameCacheSnapshot = {
  profileDetail?: UserProfile
  profileSummary?: ProfileSummary | null
  walletSummary?: WalletSummary
}

export function useChangeUsername(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<ChangeUsernameResult, Error, ChangeUsernameInput, ChangeUsernameCacheSnapshot>({
    mutationFn: changeUsername,
    onMutate: (): ChangeUsernameCacheSnapshot => ({
      profileDetail: userId ? queryClient.getQueryData<UserProfile>(profileQueryKeys.detail(userId)) : undefined,
      profileSummary: userId
        ? queryClient.getQueryData<ProfileSummary | null>(profileQueryKeys.summary(userId))
        : undefined,
      walletSummary: userId ? queryClient.getQueryData<WalletSummary>(['wallet-summary', userId]) : undefined,
    }),
    onSuccess: (result, _variables, snapshot) => {
      if (!userId) return

      const updatedAt = new Date().toISOString()
      const spendableDelta = Math.max(0, result.charged)

      queryClient.setQueryData<UserProfile | undefined>(
        profileQueryKeys.detail(userId),
        (current) => {
          const source = snapshot?.profileDetail ?? current
          if (!source) return current
          const profileSpendableDelta = snapshot?.profileDetail ? spendableDelta : 0
          return {
            ...source,
            display_name: result.username,
            handle: result.username,
            spendable_points: Math.max(0, source.spendable_points - profileSpendableDelta),
            username_set_at: source.username_set_at ?? updatedAt,
            username_changes_used: result.changesUsed,
          }
        },
      )
      queryClient.setQueryData<ProfileSummary | null | undefined>(
        profileQueryKeys.summary(userId),
        (current) => {
          const source = snapshot?.profileSummary ?? current
          if (!source) return current
          const profileSpendableDelta = snapshot?.profileSummary ? spendableDelta : 0
          return {
            ...source,
            display_name: result.username,
            spendable_points: Math.max(0, source.spendable_points - profileSpendableDelta),
          }
        },
      )
      queryClient.setQueryData<WalletSummary | undefined>(
        ['wallet-summary', userId],
        (current) => snapshot?.walletSummary
          ? applyOptimisticPointBalanceDeltaToWalletSummary(snapshot.walletSummary, {
              spendableDelta: -spendableDelta,
            })
          : current,
      )

      void queryClient.invalidateQueries({ queryKey: profileQueryKeys.detail(userId) })
      void queryClient.invalidateQueries({ queryKey: profileQueryKeys.summary(userId) })
      void queryClient.invalidateQueries({ queryKey: ['wallet-summary', userId] })
    },
  })
}
