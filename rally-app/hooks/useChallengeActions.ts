import { useMutation, useQueryClient } from '@tanstack/react-query'
import { challengeQueryKeys } from '@/lib/challenges/challengeQueryKeys'
import {
  claimChallengeReward,
  joinChallenge,
  leaveChallenge,
  updateMyProgress,
} from '@/lib/challenges/challengeService'
import { profileQueryKeys } from '@/lib/profile/profileQueryKeys'
import type { ProfileSummary, UserProfile } from '@/lib/profile/profileRepository'
import type { WalletSummary } from '@/lib/wallet/walletService'
import {
  applyPointTransactionToProfileDetail,
  applyPointTransactionToProfileSummary,
  applyPointTransactionToWalletSummary,
} from '@/lib/wallet/pointBalanceRealtime'
import type { ChallengeRewardClaim } from '@/types/challenge'

export function useChallengeActions(challengeId?: string, userId?: string) {
  const qc = useQueryClient()

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: challengeQueryKeys.all })
    if (challengeId) {
      qc.invalidateQueries({ queryKey: challengeQueryKeys.detail(challengeId) })
    }
  }

  const invalidateRewardSideEffects = () => {
    invalidate()
    qc.invalidateQueries({ queryKey: ['wallet-summary'] })
    qc.invalidateQueries({ queryKey: ['profile'] })
    qc.invalidateQueries({ queryKey: ['user-stats'] })
  }

  const joinMutation = useMutation({
    mutationFn: (id: string) => joinChallenge(id),
    onSuccess: invalidate,
  })

  const leaveMutation = useMutation({
    mutationFn: (id: string) => leaveChallenge(id),
    onSuccess: invalidate,
  })

  const updateProgressMutation = useMutation({
    mutationFn: (id: string) => updateMyProgress(id),
    onSuccess: invalidate,
  })

  const claimRewardMutation = useMutation<ChallengeRewardClaim, Error, string>({
    mutationFn: (id: string) => claimChallengeReward(id),
    onSuccess: (result) => {
      if (result.kind === 'points' && result.amount > 0) {
        const pointTransaction = {
          type: 'challenge_reward',
          score_after: result.scoreAfter,
          spendable_after: result.spendableAfter ?? result.balanceAfter,
          balance_after: result.balanceAfter,
        }
        qc.setQueriesData<WalletSummary | undefined>(
          { queryKey: ['wallet-summary'] },
          (current) => applyPointTransactionToWalletSummary(current, pointTransaction),
        )
        if (userId) {
          qc.setQueryData<ProfileSummary | null | undefined>(
            profileQueryKeys.summary(userId),
            (current) => applyPointTransactionToProfileSummary(current, pointTransaction),
          )
          qc.setQueryData<UserProfile | undefined>(
            profileQueryKeys.detail(userId),
            (current) => applyPointTransactionToProfileDetail(current, pointTransaction),
          )
        }
      }
      invalidateRewardSideEffects()
    },
  })

  return {
    joinMutation,
    leaveMutation,
    updateProgressMutation,
    claimRewardMutation,
  }
}
