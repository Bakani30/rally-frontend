import type { LeaderboardActivity } from '../leaderboard/leaderboardConfig'
import type { TierEvent } from './tierEventTypes'

// Max timeline rows per sport (mock shows ~4, keep a small headroom).
export const RANK_HISTORY_LIMIT = 8

/** Pure: keep one activity's tier_events, newest-first, capped. */
export function selectActivityTierEvents(
  events: TierEvent[],
  activity: LeaderboardActivity,
  limit: number = RANK_HISTORY_LIMIT,
): TierEvent[] {
  return events
    .filter((event) => event.activityType === activity)
    .slice(0, limit)
}
