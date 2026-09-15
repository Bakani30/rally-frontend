import { useQuery } from '@tanstack/react-query'
import { fetchRecentRatingHistory } from '@/lib/ranks/ratingHistoryRepository'
import type { LeaderboardActivity } from '@/lib/leaderboard/leaderboardConfig'

// Recent per-match rating history for the current user in ONE activity, from
// the read-only list_my_recent_rating_history RPC. Single source for both the
// "RP ล่าสุด" list and the STREAK stat (derived client-side from the same
// rows). The RPC hard-gates on auth.uid(); userId only toggles `enabled` and
// scopes the cache key.
export function useRecentRatingHistory(
  activity: LeaderboardActivity,
  userId: string | undefined,
) {
  return useQuery({
    queryKey: ['recent-rating-history', userId, activity],
    queryFn: () => fetchRecentRatingHistory(activity),
    enabled: !!userId,
    staleTime: 60_000,
  })
}
