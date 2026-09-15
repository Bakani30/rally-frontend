import type { ActivityHistoryItem } from '@/lib/activities/history/activityHistoryTypes'
import type { GpsPoint } from '../gps/gpsTypes'
import type { SaveRunToHealthInput } from './healthWriteBackTypes'
import { validRoutePoints } from './healthWriteBackRoute'

export function buildSaveRunToHealthInputFromActivity(
  activity: ActivityHistoryItem | null | undefined,
): SaveRunToHealthInput | null {
  if (!activity) return null
  if (activity.activity_type !== 'running') return null
  if (activity.source !== 'gps_live') return null
  if (!activity.running_activity_details) return null
  if (!activity.ended_at) return null

  const startedAt = new Date(activity.started_at)
  const endedAt = new Date(activity.ended_at)
  if (!isValidDate(startedAt) || !isValidDate(endedAt)) return null
  if (endedAt <= startedAt) return null

  const details = activity.running_activity_details
  const distanceMeters = details.distance_meters
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return null
  }

  const durationSeconds = activity.duration_seconds ?? details.moving_time_seconds
  if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return null
  }

  const path = readGpsPath(details.route_summary)
  if (validRoutePoints(path).length < 2) return null

  return {
    activitySessionId: activity.id,
    source: 'gps_live',
    activityType: 'running',
    startedAt,
    endedAt,
    durationSeconds,
    distanceMeters,
    path,
    title: activity.title,
    serverConfirmed: true,
  }
}

function readGpsPath(routeSummary: Record<string, unknown> | null | undefined): GpsPoint[] {
  const path = routeSummary?.path
  if (!Array.isArray(path)) return []
  return path.filter(isGpsPoint)
}

function isGpsPoint(value: unknown): value is GpsPoint {
  if (!value || typeof value !== 'object') return false
  const point = value as Partial<GpsPoint>
  return (
    typeof point.lat === 'number' &&
    typeof point.lng === 'number' &&
    typeof point.accuracy === 'number' &&
    typeof point.timestamp === 'number' &&
    typeof point.isPaused === 'boolean'
  )
}

function isValidDate(value: Date): boolean {
  return Number.isFinite(value.getTime())
}
