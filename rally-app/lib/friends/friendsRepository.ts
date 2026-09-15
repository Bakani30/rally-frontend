import { supabase } from '@/lib/supabase'
import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import {
  invokeAuthenticatedFunction,
  requireAuthenticatedAccessToken,
} from '@/lib/supabase/invokeFunction'
import type { AddFriendResult, Friend, FriendRequest } from '@/types/friends'

type AddFriendRow = {
  friend_id: string
  display_name: string | null
  handle: string | null
  status?: 'pending' | 'accepted'
}

type UserWithFrameRow = {
  id: string
  display_name: string | null
  handle: string | null
  avatar_url: string | null
  frame_asset_ref: string | null
}

function wrapError(error: { message?: string; code?: string; details?: string; hint?: string } | null, prefix: string): Error {
  if (!error) return new Error(prefix)
  const parts = [error.message, error.details, error.hint].filter(Boolean)
  const msg = parts.length > 0 ? parts.join(' — ') : prefix
  console.warn(`[friendsRepository] ${prefix}:`, error)
  return new Error(`${prefix}: ${msg}${error.code ? ` (${error.code})` : ''}`)
}

async function fetchUsersWithFrames(ids: string[]): Promise<Map<string, UserWithFrameRow>> {
  if (ids.length === 0) return new Map()
  const { data, error } = await supabase.rpc('get_users_with_frames', { p_ids: ids })
  if (error) throw wrapError(error, 'fetch_users_with_frames')
  return new Map(((data ?? []) as UserWithFrameRow[]).map((user) => [user.id, user]))
}

type FriendRelationRow = {
  owner_id: string
  friend_id: string
  status: 'pending' | 'accepted' | 'declined'
  requested_at?: string
  responded_at?: string | null
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  const userId = data.user?.id
  if (!userId) throw new Error('not_authenticated')
  return userId
}

export async function listFriendsRecord(): Promise<Friend[]> {
  const ownerId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('user_friends')
    .select('friend_id, requested_at, responded_at')
    .eq('owner_id', ownerId)
    .eq('status', 'accepted')
    .order('responded_at', { ascending: false, nullsFirst: false })

  if (error) throw wrapError(error, 'list_friends')

  const rows = (data ?? []) as Pick<FriendRelationRow, 'friend_id' | 'requested_at' | 'responded_at'>[]
  const friendIds = rows.map((row) => row.friend_id)
  if (friendIds.length === 0) return []

  const byId = await fetchUsersWithFrames(friendIds)

  return rows
    .map((row) => {
      const user = byId.get(row.friend_id)
      if (!user) return null
      return {
        friendId: row.friend_id,
        displayName: user.display_name,
        handle: user.handle,
        avatarUrl: user.avatar_url,
        frameAssetRef: user.frame_asset_ref,
        addedAt: row.responded_at ?? row.requested_at ?? new Date().toISOString(),
      }
    })
    .filter((friend): friend is Friend => !!friend)
}

export async function addFriendRecord(input: {
  friendId?: string
  handle?: string
}): Promise<AddFriendResult> {
  await requireAuthenticatedAccessToken()
  const { data, error } = await supabase.rpc('add_friend', {
    p_friend_id: input.friendId ?? undefined,
    p_handle: input.handle ?? undefined,
  })
  if (error) {
    const raw = error.message ?? ''
    const msg = raw.toLowerCase()
    const cooldown = raw.match(/friend_request_cooldown:(\d+)/i)
    if (cooldown) throw new Error(`friend_request_cooldown:${cooldown[1]}`)
    if (msg.includes('user_not_found')) throw new Error('user_not_found')
    if (msg.includes('cannot_add_self')) throw new Error('cannot_add_self')
    if (msg.includes('not_authenticated')) throw new Error('not_authenticated')
    throw new Error(raw || error.details || error.hint || 'add_friend rpc failed')
  }
  const row = (Array.isArray(data) ? data[0] : data) as AddFriendRow | null
  if (!row) throw new Error('add_friend returned no row')
  return {
    friendId: row.friend_id,
    displayName: row.display_name,
    handle: row.handle,
    status: row.status === 'pending' ? 'pending' : 'accepted',
  }
}

export async function listIncomingFriendRequestsRecord(): Promise<FriendRequest[]> {
  const ownerId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('user_friends')
    .select('owner_id, requested_at')
    .eq('friend_id', ownerId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false, nullsFirst: false })
  if (error) throw wrapError(error, 'list_incoming_requests')

  const rows = (data ?? []) as Pick<FriendRelationRow, 'owner_id' | 'requested_at'>[]
  const requesterIds = [...new Set(rows.map((row) => row.owner_id))]
  if (requesterIds.length === 0) return []

  const byId = await fetchUsersWithFrames(requesterIds)

  return rows
    .map((row) => {
      const user = byId.get(row.owner_id)
      if (!user) return null
      return {
        requesterId: user.id,
        displayName: user.display_name,
        handle: user.handle,
        avatarUrl: user.avatar_url,
        frameAssetRef: user.frame_asset_ref,
        requestedAt: row.requested_at ?? new Date().toISOString(),
      }
    })
    .filter((request): request is FriendRequest => !!request)
}

export async function listOutgoingFriendRequestsRecord(): Promise<FriendRequest[]> {
  const ownerId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('user_friends')
    .select('friend_id, requested_at')
    .eq('owner_id', ownerId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false, nullsFirst: false })
  if (error) throw wrapError(error, 'list_outgoing_requests')

  const rows = (data ?? []) as Pick<FriendRelationRow, 'friend_id' | 'requested_at'>[]
  const targetIds = [...new Set(rows.map((row) => row.friend_id))]
  if (targetIds.length === 0) return []

  const byId = await fetchUsersWithFrames(targetIds)

  return rows
    .map((row) => {
      const user = byId.get(row.friend_id)
      if (!user) return null
      return {
        requesterId: user.id,
        displayName: user.display_name,
        handle: user.handle,
        avatarUrl: user.avatar_url,
        frameAssetRef: user.frame_asset_ref,
        requestedAt: row.requested_at ?? new Date().toISOString(),
      }
    })
    .filter((request): request is FriendRequest => !!request)
}

export async function acceptFriendRequestRecord(requesterId: string): Promise<void> {
  const { error } = await invokeAuthenticatedFunction('respond-friend-request', {
    body: { requesterId, action: 'accept' },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to accept friend request')
}

export async function declineFriendRequestRecord(requesterId: string): Promise<void> {
  const { error } = await invokeAuthenticatedFunction('respond-friend-request', {
    body: { requesterId, action: 'decline' },
  })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to decline friend request')
}

export async function removeFriendRecord(friendId: string): Promise<void> {
  const ownerId = await getCurrentUserId()

  const { error: outgoingError } = await supabase
    .from('user_friends')
    .delete()
    .eq('owner_id', ownerId)
    .eq('friend_id', friendId)
  if (outgoingError) throw outgoingError

  const { error: incomingError } = await supabase
    .from('user_friends')
    .delete()
    .eq('owner_id', friendId)
    .eq('friend_id', ownerId)
  if (incomingError) throw incomingError
}
