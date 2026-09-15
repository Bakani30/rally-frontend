// Pure presentation logic for the per-sport "My Rank" page.
//
// Placement lock + next-tier progress are derived here (no React, no I/O) so
// the screen/components stay declarative and this file is unit-testable.
//
// `matches` here means DECISIVE matches (wins + losses) to match the server
// gate (`activity_ratings.decisive_matches`) and tierRules — see tierRules.ts.
// Callers pass wins+losses, not `matches_in_activity`, or progress/lock read
// optimistically.

import {
  TIER_THRESHOLDS,
  computeTier,
  nextTierProgress,
  type Tier,
} from '@/lib/leaderboard/tierRules'

// A sport is "locked" (no rank identity yet) until the player finishes
// placement. Placement floor = Silver's decisive-match minimum, the first
// gate above Bronze. Mirrors the mock's "เล่นอีก N นัดเพื่อปลดล็อคแรงค์".
export const PLACEMENT_MATCH_FLOOR: number =
  TIER_THRESHOLDS.find((t) => t.tier === 'silver')?.minMatches ?? 10

export type PlacementLock = {
  locked: boolean
  /** Decisive matches played so far, clamped to [0, floor]. */
  played: number
  /** Placement floor (e.g. 10). */
  floor: number
  /** Matches still required to unlock; 0 once unlocked. */
  remaining: number
}

/** Placement-lock state for one sport from its decisive-match count. */
export function placementLock(decisiveMatches: number): PlacementLock {
  const played = Math.max(0, Math.min(decisiveMatches, PLACEMENT_MATCH_FLOOR))
  const locked = decisiveMatches < PLACEMENT_MATCH_FLOOR
  return {
    locked,
    played,
    floor: PLACEMENT_MATCH_FLOOR,
    remaining: locked ? PLACEMENT_MATCH_FLOOR - decisiveMatches : 0,
  }
}

export type NextTierView = {
  /** Next tier up, or null when already at the top (challenger). */
  nextTier: Tier | null
  /** Current rating. */
  rpCur: number
  /** Rating threshold for the next tier. */
  rpGoal: number
  /** RP still needed to reach the next tier (0 when rating gate already met). */
  rpLeft: number
  /** Rating progress toward the next tier, 0..1. */
  pct: number
  /** Decisive matches played (clamped display value). */
  matchesHave: number
  /** Decisive-match minimum required for the next tier. */
  matchesGoal: number
  /** Matches still required for the next tier (0 when volume gate already met). */
  matchesNeed: number
}

// Progress from the current rating/matches toward the next tier. Both gates
// (rating and decisive-match volume) are surfaced so the card can show
// "อีก X RP" alongside "ต้องแข่งอีก N นัด" like the mock.
export function nextTierView(rating: number, decisiveMatches: number): NextTierView {
  const { next, ratingNeeded, matchesNeeded } = nextTierProgress(rating, decisiveMatches)
  const current = computeTier(rating, decisiveMatches)

  if (!next) {
    return {
      nextTier: null,
      rpCur: rating,
      rpGoal: rating,
      rpLeft: 0,
      pct: 1,
      matchesHave: decisiveMatches,
      matchesGoal: decisiveMatches,
      matchesNeed: 0,
    }
  }

  const currentThreshold = TIER_THRESHOLDS.find((t) => t.tier === current)
  const nextThreshold = TIER_THRESHOLDS.find((t) => t.tier === next)
  const rpFloor = currentThreshold?.minRating ?? 0
  const rpGoal = nextThreshold?.minRating ?? rating
  const matchesGoal = nextThreshold?.minMatches ?? decisiveMatches

  const span = Math.max(1, rpGoal - rpFloor)
  const pct = Math.max(0, Math.min(1, (rating - rpFloor) / span))

  return {
    nextTier: next,
    rpCur: rating,
    rpGoal,
    rpLeft: ratingNeeded,
    pct,
    matchesHave: decisiveMatches,
    matchesGoal,
    matchesNeed: matchesNeeded,
  }
}
