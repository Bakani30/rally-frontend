import { avatarColorFor, avatarLetterFor } from './avatarColor'
import type {
  LeaderboardApiEntry,
  LeaderboardEntry,
  LeaderboardEntryRow,
  RankedLeaderboardEntryRow,
} from './leaderboardTypes'
import { computeTier, type Tier } from './tierRules'

const VALID_TIERS: ReadonlySet<Tier> = new Set([
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'immortal',
  'challenger',
])

export function coerceTier(raw: string, rating: number, matches: number): Tier {
  return VALID_TIERS.has(raw as Tier) ? (raw as Tier) : computeTier(rating, matches)
}

export function toLeaderboardEntry(row: LeaderboardEntryRow, rank: number): LeaderboardEntry {
  const displayName = row.users?.display_name ?? 'Unknown'
  return {
    userId: row.user_id,
    displayName,
    handle: row.users?.handle ?? null,
    rating: row.rating,
    tier: coerceTier(row.tier, row.rating, row.matches_in_activity),
    matches: row.matches_in_activity,
    rank,
    letter: avatarLetterFor(displayName),
    avatarColor: avatarColorFor(row.user_id),
    avatarUrl: row.users?.avatar_url ?? null,
  }
}

export function toLeaderboardEntries(rows: LeaderboardEntryRow[]): LeaderboardEntry[] {
  let previousRating: number | null = null
  let previousRank = 0

  return rows.map((row, index) => {
    const rank = row.rating === previousRating ? previousRank : index + 1
    previousRating = row.rating
    previousRank = rank
    return toLeaderboardEntry(row, rank)
  })
}

export function toRankedLeaderboardEntry(row: RankedLeaderboardEntryRow): LeaderboardEntry {
  return toLeaderboardEntry(row, row.rank)
}

export function toLeaderboardEntryFromApi(row: LeaderboardApiEntry): LeaderboardEntry {
  return {
    userId: row.userId,
    displayName: row.displayName,
    handle: row.handle,
    rating: row.rating,
    tier: coerceTier(row.tier, row.rating, row.matches),
    matches: row.matches,
    rank: row.rank,
    letter: avatarLetterFor(row.displayName),
    avatarColor: avatarColorFor(row.userId),
    avatarUrl: row.avatarUrl,
  }
}
