import { supabase } from '@/lib/supabase'
import type { LeaderboardActivity } from '../leaderboard/leaderboardConfig'
import type { Tier } from '../leaderboard/tierRules'
import type { TierEvent } from './tierEventTypes'

// `tier_events` + `mark_tier_events_seen` predate the last db-types regen
// (Task 9 note: regen deferred to Task 10) — `as never` matches the existing
// escape hatch for not-yet-typed tables/RPCs (see cosmeticRepository.ts /
// headToHeadRepository.ts).
type TierEventRow = {
  id: string
  user_id: string
  activity_type: string
  from_tier: string
  to_tier: string
  direction: string
  match_id: string | null
  season_id: string | null
  created_at: string
}

function isDirection(value: string): value is TierEvent['direction'] {
  return value === 'promotion' || value === 'demotion'
}

function isActivity(value: string): value is LeaderboardActivity {
  return value === 'running' || value === 'basketball' || value === 'badminton'
}

function rowToTierEvent(row: TierEventRow): TierEvent | null {
  if (!isActivity(row.activity_type) || !isDirection(row.direction)) return null
  return {
    id: row.id,
    userId: row.user_id,
    activityType: row.activity_type,
    fromTier: row.from_tier as Tier,
    toTier: row.to_tier as Tier,
    direction: row.direction,
    matchId: row.match_id,
    seasonId: row.season_id,
    createdAt: row.created_at,
  }
}

/** Fetches the current user's unseen tier_events (RLS scopes to own rows). */
export async function fetchUnseenTierEvents(): Promise<TierEvent[]> {
  const { data, error } = await supabase
    .from('tier_events' as never)
    .select('id, user_id, activity_type, from_tier, to_tier, direction, match_id, season_id, created_at')
    .is('seen_at', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as TierEventRow[]
  return rows.map(rowToTierEvent).filter((e): e is TierEvent => e !== null)
}

/** Marks the given tier_events as seen via the RPC (own rows only, per RLS). */
export async function markTierEventsSeen(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return
  const { error } = await supabase.rpc('mark_tier_events_seen' as never, {
    p_event_ids: eventIds,
  } as never)
  if (error) throw new Error(error.message)
}
