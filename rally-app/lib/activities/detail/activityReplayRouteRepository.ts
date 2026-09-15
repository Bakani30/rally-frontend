import { supabase } from '@/lib/supabase'
import type { ReplayLngLat } from '@/lib/replay/replayPath'
import type {
  ActivityReplayRouteData,
  ActivityReplayRouteSource,
} from './activityReplayRouteTypes'

const REPLAY_ROUTE_SESSION_SELECT = `
  id,
  user_id,
  started_at,
  ended_at,
  running_activity_details ( route_summary ),
  users ( id, display_name, handle, avatar_url )
`

type RouteSummary = {
  path?: unknown
}

type RouteSessionRow = {
  id: string
  user_id: string
  started_at: string | null
  ended_at: string | null
  running_activity_details: { route_summary: RouteSummary | null } | null
  users: {
    id: string
    display_name: string | null
    handle: string | null
    avatar_url: string | null
  } | null
}

type ActivityLinkRow = { activity_session_id: string }

function isReplayPoint(value: unknown): value is ReplayLngLat {
  if (!value || typeof value !== 'object') return false
  const point = value as { lat?: unknown; lng?: unknown; altitude?: unknown }
  return (
    typeof point.lat === 'number' && Number.isFinite(point.lat) && point.lat >= -90 && point.lat <= 90
    && typeof point.lng === 'number' && Number.isFinite(point.lng) && point.lng >= -180 && point.lng <= 180
  )
}

function readRoutePoints(routeSummary: RouteSummary | null): ReplayLngLat[] {
  if (!routeSummary || !Array.isArray(routeSummary.path)) return []
  return routeSummary.path.flatMap((value) => {
    if (!isReplayPoint(value)) return []
    const point = value as ReplayLngLat
    return [{
      lat: point.lat,
      lng: point.lng,
      ...(typeof point.altitude === 'number' && Number.isFinite(point.altitude)
        ? { altitude: point.altitude }
        : {}),
    }]
  })
}

function mapRouteSession(row: RouteSessionRow): ActivityReplayRouteSource {
  return {
    activitySessionId: row.id,
    userId: row.user_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    points: readRoutePoints(row.running_activity_details?.route_summary ?? null),
    displayName: row.users?.display_name ?? null,
    handle: row.users?.handle ?? null,
    avatarUrl: row.users?.avatar_url ?? null,
  }
}

/**
 * Reads all GPS-backed sessions submitted to the same match as the replay.
 * RLS remains the authority: linked match participants can read participant
 * sessions, while unrelated/private sessions are filtered by Supabase.
 */
export async function getActivityReplayRouteData(
  activitySessionId: string,
): Promise<ActivityReplayRouteData> {
  const { data: currentLink, error: currentLinkError } = await supabase
    .from('activity_session_links')
    .select('match_id')
    .eq('activity_session_id', activitySessionId)
    .eq('link_type', 'match')
    .not('match_id', 'is', null)
    .limit(1)
    .maybeSingle()

  if (currentLinkError) throw currentLinkError
  const matchId = (currentLink as { match_id: string | null } | null)?.match_id ?? null
  if (!matchId) return { matchId: null, routes: [] }

  const { data: links, error: linksError } = await supabase
    .from('activity_session_links')
    .select('activity_session_id')
    .eq('match_id', matchId)
    .eq('link_type', 'match')

  if (linksError) throw linksError
  const sessionIds = Array.from(new Set(
    ((links ?? []) as ActivityLinkRow[])
      .map((link) => link.activity_session_id)
      .filter(Boolean),
  ))
  if (sessionIds.length === 0) return { matchId, routes: [] }

  const { data: sessions, error: sessionsError } = await supabase
    .from('activity_sessions')
    .select(REPLAY_ROUTE_SESSION_SELECT)
    .in('id', sessionIds)
    .eq('activity_type', 'running')

  if (sessionsError) throw sessionsError
  const routes = ((sessions ?? []) as unknown as RouteSessionRow[]).map(mapRouteSession)
  return { matchId, routes }
}
