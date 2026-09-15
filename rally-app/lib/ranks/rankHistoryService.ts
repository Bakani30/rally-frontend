import { fetchTierEventHistory } from './rankHistoryRepository'
import { selectActivityTierEvents } from './rankHistorySelect'
import type { LeaderboardActivity } from '../leaderboard/leaderboardConfig'
import type { TierEvent } from './tierEventTypes'

export { RANK_HISTORY_LIMIT, selectActivityTierEvents } from './rankHistorySelect'

/** Fetches the current user's tier_events, scoped to one activity. */
export async function getActivityTierEvents(
  activity: LeaderboardActivity,
): Promise<TierEvent[]> {
  const all = await fetchTierEventHistory()
  return selectActivityTierEvents(all, activity)
}
