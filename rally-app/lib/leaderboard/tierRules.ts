// Mirror of SQL function `recompute_tier` (latest:
// supabase/migrations/20260705100500_tier_events_and_recompute_v2.sql).
// SQL is source of truth for persisted tier; this mirror is for
// presentation only (next-tier progress on profile/leaderboard).
// MUST be kept in sync if SQL thresholds change.
//
// NOTE: `matches` / `minMatches` here mean DECISIVE matches (wins + losses,
// ties excluded), matching the server gate (`activity_ratings.decisive_matches`).
// Callers must pass wins+losses, not total matches, or progress will be optimistic.

export type Tier =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'immortal'
  | 'challenger'

type TierThreshold = {
  tier: Tier
  minRating: number
  minMatches: number
}

export const TIER_THRESHOLDS: readonly TierThreshold[] = [
  { tier: 'challenger', minRating: 1350, minMatches: 60 },
  { tier: 'immortal', minRating: 1200, minMatches: 40 },
  { tier: 'diamond', minRating: 1050, minMatches: 40 },
  { tier: 'platinum', minRating: 900, minMatches: 30 },
  { tier: 'gold', minRating: 750, minMatches: 20 },
  { tier: 'silver', minRating: 600, minMatches: 10 },
  { tier: 'bronze', minRating: 0, minMatches: 0 },
] as const

export function computeTier(rating: number, matches: number): Tier {
  for (const t of TIER_THRESHOLDS) {
    if (rating >= t.minRating && matches >= t.minMatches) return t.tier
  }
  return 'bronze'
}

export type NextTierProgress = {
  next: Tier | null
  ratingNeeded: number
  matchesNeeded: number
}

export function nextTierProgress(rating: number, matches: number): NextTierProgress {
  const current = computeTier(rating, matches)
  const currentIdx = TIER_THRESHOLDS.findIndex((t) => t.tier === current)
  if (currentIdx <= 0) return { next: null, ratingNeeded: 0, matchesNeeded: 0 }

  const next = TIER_THRESHOLDS[currentIdx - 1]
  return {
    next: next.tier,
    ratingNeeded: Math.max(0, next.minRating - rating),
    matchesNeeded: Math.max(0, next.minMatches - matches),
  }
}
