import { supabase } from '@/lib/supabase'
import type { EligibleReferee, InvitableFriend } from '@/types/invite'

// Row shapes are untyped because list_invitable_friends and search_eligible_referees
// are not yet in @rally/db-types (RPCs need to be deployed then `npm run gen:types` re-run).
// The pure mapper functions are fully typed and unit-tested.

export function mapInvitableFriendRow(row: Record<string, unknown>): InvitableFriend {
  return {
    friendId: row.friend_id as string,
    displayName: (row.display_name as string | null) ?? null,
    handle: (row.handle as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    frameAssetRef: (row.frame_asset_ref as string | null) ?? null,
    rating: Number(row.rating ?? 500),
    recentlyPlayed: !!row.recently_played,
    suggested: !!row.suggested,
    inviteStatus: row.invite_status === 'pending' ? 'pending' : 'none',
    lastInvitedAt: (row.last_invited_at as string | null) ?? null,
  }
}

export async function listInvitableFriendsRecord(matchId: string): Promise<InvitableFriend[]> {
  // cast as any: RPC not yet in generated db-types (deploy RPCs then re-run gen:types)
  const { data, error } = await (supabase.rpc as any)('list_invitable_friends', {
    p_match_id: matchId,
  })
  if (error) throw new Error((error as { message?: string }).message || 'list_invitable_friends failed')
  return ((data ?? []) as Record<string, unknown>[]).map(mapInvitableFriendRow)
}

export function mapEligibleRefereeRow(row: Record<string, unknown>): EligibleReferee {
  return {
    userId: row.user_id as string,
    displayName: (row.display_name as string | null) ?? null,
    handle: (row.handle as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    frameAssetRef: (row.frame_asset_ref as string | null) ?? null,
    trustTier: (row.trust_tier as string | null) ?? 'candidate',
    completedMatches: Number(row.completed_matches ?? 0),
    cleanMatches: Number(row.clean_matches ?? 0),
    disputedMatches: Number(row.disputed_matches ?? 0),
    eligible: !!row.eligible,
    assigned: !!row.assigned,
  }
}

export async function searchEligibleRefereesRecord(
  matchId: string,
  activityType: string,
  query: string,
): Promise<EligibleReferee[]> {
  // cast as any: RPC not yet in generated db-types (deploy RPCs then re-run gen:types)
  const { data, error } = await (supabase.rpc as any)('search_eligible_referees', {
    p_match_id: matchId,
    p_activity_type: activityType,
    p_query: query,
  })
  if (error) throw new Error((error as { message?: string }).message || 'search_eligible_referees failed')
  return ((data ?? []) as Record<string, unknown>[]).map(mapEligibleRefereeRow)
}
