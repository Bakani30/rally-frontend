import { useQuery } from '@tanstack/react-query'

import { getVisibleMatchesForUser } from '@/lib/match/matchService'

export function useVisibleMatchesForUser(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['visible-matches-for-user', userId],
    queryFn: () => getVisibleMatchesForUser(userId!),
    enabled: enabled && !!userId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}
