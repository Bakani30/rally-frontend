import { useQuery } from '@tanstack/react-query'
import { getUserActivityRatings } from '@/lib/leaderboard/leaderboardService'

export function useUserActivityRatings(userId: string | undefined) {
  return useQuery({
    queryKey: ['activity-ratings', userId],
    queryFn: () => getUserActivityRatings(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  })
}
