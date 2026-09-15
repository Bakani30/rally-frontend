import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type { ArenaMapBbox, ArenaMapPinDetail, ArenaMapSummary } from '@/types/arenaMap'

export async function getArenaMapSummary(bbox: ArenaMapBbox): Promise<ArenaMapSummary> {
  const params = new URLSearchParams({ mode: 'summary', activityType: 'basketball', south: String(bbox.south), north: String(bbox.north), west: String(bbox.west), east: String(bbox.east) })
  const { data, error } = await invokeAuthenticatedFunction<ArenaMapSummary>(`arena-map?${params}`, { method: 'GET' })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load Arena Map')
  return data ?? { pins: [], sourceHealth: { venues: 'failed', adHocArenas: 'failed' }, serverTime: new Date(0).toISOString() }
}

export async function getArenaMapDetail(pinId: string): Promise<ArenaMapPinDetail> {
  const { data, error } = await invokeAuthenticatedFunction<ArenaMapPinDetail>(`arena-map?mode=detail&pinId=${encodeURIComponent(pinId)}`, { method: 'GET' })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load Arena detail')
  if (!data) throw new Error('arena-map detail returned no data')
  return data
}

export async function setArenaVenueFavorite(venueId: string, favorite: boolean) {
  const { data, error } = await invokeAuthenticatedFunction<{ venueId: string; favorite: boolean }>('arena-map', { body: { action: 'set_venue_favorite', venueId, favorite } })
  if (error) throw await extractEdgeFunctionError(error, 'Failed to update Venue favorite')
  return data
}
