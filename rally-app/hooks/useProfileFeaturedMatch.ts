import { useQuery } from '@tanstack/react-query'
import { getProfileFeaturedMatch } from '@/lib/match/featuredMatchService'

export const featuredMatchKey = (userId: string | undefined) => ['featured-match', userId] as const

// Public-safe featured match for any user (own or other).
export function useProfileFeaturedMatch(userId: string | undefined) {
  return useQuery({
    queryKey: featuredMatchKey(userId),
    queryFn: () => getProfileFeaturedMatch(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  })
}
