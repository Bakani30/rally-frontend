import { supabase } from '@/lib/supabase'
import { type Database } from '@rally/db-types'

// A user's preferred position per activity (basketball today). RLS lets any
// authenticated user read and restricts writes to the owner, so the upsert
// derives the user from the session rather than trusting a passed userId.

export type UserSportPositionRow = {
  activity_type: string
  position_key: string
}

export async function listUserSportPositions(
  userId: string,
): Promise<UserSportPositionRow[]> {
  const { data, error } = await supabase
    .from('user_sport_positions')
    .select('activity_type, position_key')
    .eq('user_id', userId)
  if (error) throw error
  return (data ?? []) as UserSportPositionRow[]
}

export type UserSportPositionForUser = { user_id: string; position_key: string }

export async function listSportPositionsForUsers(
  userIds: string[],
  activityType: string,
): Promise<UserSportPositionForUser[]> {
  if (userIds.length === 0) return []
  const { data, error } = await supabase
    .from('user_sport_positions')
    .select('user_id, position_key')
    .in('user_id', userIds)
    .eq('activity_type', activityType as Database['public']['Enums']['activity_type'])
  if (error) throw error
  return (data ?? []) as UserSportPositionForUser[]
}

export async function setUserSportPosition(input: {
  activityType: string
  positionKey: string
}): Promise<void> {
  // Derives the actor from the JWT server-side; the client never sends a
  // user_id (mirrors the change_username RPC pattern).
  const { error } = await supabase.rpc('set_sport_position', {
    p_activity_type: input.activityType as Database['public']['Enums']['activity_type'],
    p_position_key: input.positionKey,
  })
  if (error) throw error
}
