import { useQuery } from '@tanstack/react-query'
import { getProfilePinnedMatches } from '@/lib/match/featuredMatchService'

export const pinnedMatchesKey = (userId: string | undefined) => ['pinned-matches', userId] as const

// Public-safe ordered pinned matches for any user (own or other).
export function useProfilePinnedMatches(userId: string | undefined) {
  return useQuery({
    queryKey: pinnedMatchesKey(userId),
    queryFn: () => getProfilePinnedMatches(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  })
}
