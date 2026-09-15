import { supabase } from '@/lib/supabase'
import type { HeadToHead } from '@/types/match'

/** Row shape returned by the get_head_to_head RPC (not yet in generated @rally/db-types). */
type HeadToHeadRow = {
  wins: number | null
  losses: number | null
  draws: number | null
  last_played_at: string | null
  last_result: 'win' | 'loss' | 'draw' | null
}

/** Reads the caller↔opponent settled record in one activity via the RPC. */
export async function fetchHeadToHead(
  opponentUserId: string,
  activity: string,
): Promise<HeadToHead> {
  // get_head_to_head lags @rally/db-types (regenerated on the next backend type sync);
  // cast the call so the typed client still compiles. The RPC exists at runtime.
  const { data, error } = await supabase.rpc('get_head_to_head' as never, {
    p_opponent: opponentUserId,
    p_activity: activity,
  } as never)
  if (error) throw error
  const rows = data as HeadToHeadRow[] | HeadToHeadRow | null
  const row = Array.isArray(rows) ? rows[0] : rows
  return {
    wins: row?.wins ?? 0,
    losses: row?.losses ?? 0,
    draws: row?.draws ?? 0,
    lastPlayedAt: row?.last_played_at ?? null,
    // The RPC types last_result as plain text; the DB only ever returns
    // 'win' | 'loss' | 'draw'.
    lastResult: (row?.last_result ?? null) as HeadToHead['lastResult'],
  }
}
