import type { LeaderboardActivity } from '../leaderboard/leaderboardConfig'
import type { Tier } from '../leaderboard/tierRules'

// Mirrors a row of `tier_events` (supabase/migrations/20260705100500_tier_events_and_recompute_v2.sql).
// Table + mark_tier_events_seen RPC are not in generated db-types yet
// (regen deferred to Task 10) — see tierEventRepository.ts `as never` escape hatch.
export type TierEvent = {
  id: string
  userId: string
  activityType: LeaderboardActivity
  fromTier: Tier
  toTier: Tier
  direction: 'promotion' | 'demotion'
  matchId: string | null
  seasonId: string | null
  createdAt: string
}
