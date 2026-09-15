import { useQuery } from '@tanstack/react-query'
import { getActivityTierEvents } from '@/lib/ranks/rankHistoryService'
import type { LeaderboardActivity } from '@/lib/leaderboard/leaderboardConfig'

// Full tier_events history for the current user, scoped to one activity, for
// the "ประวัติแรงค์" timeline on the rank page. Distinct from
// useUnseenTierEvents (which drives the promotion-moment queue and only reads
// unseen rows); this reads the whole history and never marks anything seen.
export function useTierEventHistory(
  activity: LeaderboardActivity,
  userId: string | undefined,
) {
  return useQuery({
    queryKey: ['tier-event-history', userId, activity],
    queryFn: () => getActivityTierEvents(activity),
    enabled: !!userId,
    staleTime: 60_000,
  })
}
