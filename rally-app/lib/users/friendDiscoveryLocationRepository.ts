import { supabase } from '@/lib/supabase'
import type { FriendDiscoveryCell } from './friendDiscoveryLocation'

export async function getFriendDiscoveryLocationEnabled(): Promise<boolean> {
  const { data, error } = await supabase
    .from('friend_discovery_locations' as never)
    .select('user_id')
    .maybeSingle()

  if (error) throw error
  return data !== null
}

export async function setFriendDiscoveryLocation(
  cell: FriendDiscoveryCell | null,
): Promise<void> {
  const { error } = await supabase.rpc('set_friend_discovery_location_v0' as never, {
    p_cell_lat: cell?.cellLat ?? null,
    p_cell_lng: cell?.cellLng ?? null,
    p_enabled: cell !== null,
  } as never)

  if (error) throw error
}
