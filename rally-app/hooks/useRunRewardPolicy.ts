import { useQuery } from '@tanstack/react-query'

import { getRunRewardPolicy } from '@/lib/run-tracking/session/runRewardPolicyRepository'

export function useRunRewardPolicy(
  matchId: string | null | undefined,
  userId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['run-reward-policy', userId, matchId ?? null],
    queryFn: () => getRunRewardPolicy(matchId),
    enabled: Boolean(userId),
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 6 * 60 * 60 * 1000,
  })
}
