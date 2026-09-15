import { useQuery } from '@tanstack/react-query'
import { getLeaderboard } from '@/lib/leaderboard/leaderboardService'
import type {
  LeaderboardCategory,
  LeaderboardScope,
} from '@/lib/leaderboard/leaderboardConfig'
import type { LeaderboardEntry } from '@/lib/leaderboard/leaderboardTypes'

// Public ranking is throttled to a 15-minute refresh window to keep
// load on the leaderboard view predictable when many players watch the
// same season concurrently.
const LEADERBOARD_REFRESH_MS = 15 * 60 * 1000

export function useLeaderboard(
  activity: LeaderboardCategory,
  currentUserId: string | null,
  scope: LeaderboardScope = 'global',
) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', activity, scope, { currentUserId }],
    queryFn: () => getLeaderboard(activity, currentUserId, scope),
    staleTime: LEADERBOARD_REFRESH_MS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}
