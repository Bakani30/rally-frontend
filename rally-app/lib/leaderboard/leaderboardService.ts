import { getCurrentSeasonId } from '@/lib/seasons/seasonRepository'
import {
  LEADERBOARD_ACTIVITIES,
  LEADERBOARD_TOP_N,
  type LeaderboardActivity,
  type LeaderboardCategory,
  type LeaderboardScope,
} from './leaderboardConfig'
import { coerceTier, toLeaderboardEntryFromApi } from './leaderboardMapper'
import { fetchMockLeaderboard, getMockLeaderboardUrl } from './mockLeaderboard'
import {
  listLeaderboardApi,
  listUserActivityRatingRows,
} from './leaderboardRepository'
import type {
  LeaderboardEntry,
  UserActivityRating,
} from './leaderboardTypes'

export async function getLeaderboard(
  activity: LeaderboardCategory,
  currentUserId: string | null = null,
  scope: LeaderboardScope = 'global',
): Promise<LeaderboardEntry[]> {
  const mockUrl = getMockLeaderboardUrl()
  if (mockUrl) return fetchMockLeaderboard(mockUrl, activity)

  const payload = await listLeaderboardApi({ activity, scope, limit: LEADERBOARD_TOP_N })
  const entries = payload.entries.map(toLeaderboardEntryFromApi)
  const ownEntry = payload.ownEntry ? toLeaderboardEntryFromApi(payload.ownEntry) : null

  if (!currentUserId || !ownEntry || entries.some((entry) => entry.userId === currentUserId)) {
    return entries
  }

  return [...entries, ownEntry]
}

const VALID_ACTIVITIES = new Set(LEADERBOARD_ACTIVITIES.map((activity) => activity.key))

export async function getUserActivityRatings(userId: string): Promise<UserActivityRating[]> {
  const seasonId = await getCurrentSeasonId()
  if (!seasonId) return []

  const rows = await listUserActivityRatingRows({ seasonId, userId })
  const byActivity = new Map(rows.map((row) => [row.activity_type, row]))

  return LEADERBOARD_ACTIVITIES.map((activity) => {
    const row = byActivity.get(activity.key)
    const rating = row?.rating ?? 0
    const matches = row?.matches_in_activity ?? 0
    return {
      activity: activity.key,
      rating,
      tier: coerceTier(row?.tier ?? '', rating, matches),
      matches,
      wins: row?.wins ?? 0,
      losses: row?.losses ?? 0,
    }
  }).filter((rating) => VALID_ACTIVITIES.has(rating.activity as LeaderboardActivity))
}
