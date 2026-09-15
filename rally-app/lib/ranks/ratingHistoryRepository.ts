import { supabase } from '@/lib/supabase'
import type { LeaderboardActivity } from '../leaderboard/leaderboardConfig'

// Raw row shape of the list_my_recent_rating_history RPC (per-match rating
// deltas for the current user, ALL sports). The RPC + its return columns
// predate the db-types regen, so `as never`/typed cast mirrors the existing
// not-yet-typed-RPC escape hatch (see rankHistoryRepository.ts / cosmetics).
export type RatingHistoryRow = {
  match_id: string
  activity_type: string
  settled_at: string
  rating_before: number
  rating_after: number
  rating_delta: number
  result: 'win' | 'loss' | 'tie'
  mode: string | null
  opponent_label: string | null
}

// Server caps at 50; default 20 matches the founder decision (last N=20).
export const RATING_HISTORY_LIMIT = 20

/**
 * Fetches the current user's recent per-match rating history for one activity
 * via the read-only RPC. The RPC hard-gates on auth.uid(), so no user_id arg
 * is needed. Newest-settled first.
 */
export async function fetchRecentRatingHistory(
  activity: LeaderboardActivity,
  limit: number = RATING_HISTORY_LIMIT,
): Promise<RatingHistoryRow[]> {
  const { data, error } = await supabase.rpc('list_my_recent_rating_history' as never, {
    p_activity: activity,
    p_limit: limit,
  } as never)
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as RatingHistoryRow[]
}
