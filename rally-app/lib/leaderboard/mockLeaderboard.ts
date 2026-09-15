// Mock leaderboard source — used when EXPO_PUBLIC_MOCK_LEADERBOARD_URL is set
// to a json-server URL (e.g. http://localhost:4000). Lets the UI iterate against
// the design without touching Supabase. Strictly dev-only.

import type { LeaderboardCategory } from './leaderboardConfig'
import type { LeaderboardEntry } from './leaderboardTypes'
import type { Tier } from './tierRules'

type MockRow = {
  userId: string
  rank: number
  displayName: string
  handle: string | null
  letter: string
  rating: number
  delta: number
  avatarColor: string
  avatarUrl?: string | null
  isYou?: boolean
}

const COLLECTION_BY_ACTIVITY: Record<LeaderboardCategory, string> = {
  basketball: 'leaderboard_basketball',
  running: 'leaderboard_running',
  badminton: 'leaderboard_badminton',
}

export function getMockLeaderboardUrl(): string | null {
  const url = process.env.EXPO_PUBLIC_MOCK_LEADERBOARD_URL
  return url && url.length > 0 ? url.replace(/\/$/, '') : null
}

export async function fetchMockLeaderboard(
  baseUrl: string,
  activity: LeaderboardCategory,
): Promise<LeaderboardEntry[]> {
  const collection = COLLECTION_BY_ACTIVITY[activity]
  const res = await fetch(`${baseUrl}/${collection}`)
  if (!res.ok) throw new Error(`mock leaderboard fetch failed: ${res.status}`)
  const rows = (await res.json()) as MockRow[]
  return rows.map(toEntry)
}

function toEntry(row: MockRow): LeaderboardEntry {
  // Mock rows already include presentation fields; tier is unused by the design
  // but required by the type — pick a stable placeholder.
  const tier: Tier = row.rank === 1 ? 'challenger' : row.rank <= 3 ? 'diamond' : 'gold'
  return {
    userId: row.userId,
    displayName: row.displayName,
    handle: row.handle,
    rating: row.rating,
    tier,
    matches: 10,
    rank: row.rank,
    letter: row.letter,
    avatarColor: row.avatarColor,
    avatarUrl: row.avatarUrl ?? null,
    delta: row.delta,
  }
}
