import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'

export type UserSearchResult = {
  id: string
  display_name: string
  handle: string | null
  frame_asset_ref: string | null
}

type SearchUsersResponse = {
  users: Array<{
    id: string
    handle: string | null
    displayName: string | null
    frameAssetRef: string | null
  }>
}

export type FriendCandidateRecord = {
  id: string
  displayName: string
  handle: string | null
  avatarUrl: string | null
  frameAssetRef: string | null
}

type CandidateRailResponse = {
  candidates: FriendCandidateRecord[]
  nextCursor: string | null
}

export async function searchUsersByQuery(
  query: string,
  limit = 20,
): Promise<UserSearchResult[]> {
  const cappedLimit = Math.min(Math.max(1, limit), 20)
  const { data, error } = await invokeAuthenticatedFunction<SearchUsersResponse>(
    'search-users',
    { body: { query, limit: cappedLimit } },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to search users')
  const users = data?.users ?? []
  return users.map((u) => ({
    id: u.id,
    display_name: u.displayName ?? '',
    handle: u.handle,
    frame_asset_ref: u.frameAssetRef,
  }))
}

export async function fetchFriendCandidateRecords(): Promise<FriendCandidateRecord[]> {
  const { data, error } = await invokeAuthenticatedFunction<CandidateRailResponse>(
    'search-users',
    { body: { mode: 'candidate_rail', limit: 8 } },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load friend candidates')
  if (!data || !Array.isArray(data.candidates)) {
    throw new Error('Invalid friend candidate response')
  }
  return data.candidates
}
