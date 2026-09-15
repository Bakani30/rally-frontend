import { supabase } from '@/lib/supabase'
import { requireAuthenticatedAccessToken } from '@/lib/supabase/invokeFunction'

// Read another user's featured match summary (public-safe RPC). Returns the
// raw jsonb payload (or null) — the service validates/normalizes its shape.
export async function fetchFeaturedMatch(userId: string): Promise<unknown> {
  const { data, error } = await supabase.rpc('get_profile_featured_match', { p_user_id: userId })
  if (error) throw error
  return data
}

// Owner sets (matchId) or clears (null) their featured match.
export async function writeFeaturedMatch(matchId: string | null): Promise<string | null> {
  await requireAuthenticatedAccessToken()
  // The RPC accepts NULL to clear the featured match, but generated types mark
  // the uuid arg non-nullable; cast keeps the clear-path while staying typed.
  const { data, error } = await supabase.rpc('set_featured_match', {
    p_match_id: matchId as string,
  })
  if (error) throw error
  return (data as string | null) ?? null
}

// Read another user's ordered pinned-matches summary (public-safe RPC).
// Returns the raw jsonb payload — the service validates/normalizes its shape.
export async function fetchPinnedMatches(userId: string): Promise<unknown> {
  // get_profile_pinned_matches lags @rally/db-types (regenerated on the next
  // backend type sync); cast the call so the typed client still compiles.
  // The RPC exists at runtime (Task 2.1).
  const { data, error } = await supabase.rpc('get_profile_pinned_matches' as never, {
    p_user_id: userId,
  } as never)
  if (error) throw error
  return data
}

// Owner pins a match (capped at 3 server-side; throws pinned_match_limit).
export async function addPinnedMatch(matchId: string): Promise<void> {
  await requireAuthenticatedAccessToken()
  // add_pinned_match lags @rally/db-types; same cast precedent as above.
  const { error } = await supabase.rpc('add_pinned_match' as never, {
    p_match_id: matchId,
  } as never)
  if (error) throw error
}

// Owner unpins a match.
export async function removePinnedMatch(
  matchId: string,
  expectedStoragePath: string | null,
): Promise<void> {
  await requireAuthenticatedAccessToken()
  // remove_pinned_match_with_highlight lags @rally/db-types; same cast
  // precedent as above. The expected path closes the cleanup/unpin race.
  const { error } = await supabase.rpc('remove_pinned_match_with_highlight' as never, {
    p_match_id: matchId,
    p_expected_storage_path: expectedStoragePath,
  } as never)
  if (error) throw error
}
