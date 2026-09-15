import type { GpsPoint } from '../gps/gpsTypes'

export type AppleHealthRouteLocation = {
  altitude: number
  course: number
  date: Date
  horizontalAccuracy: number
  latitude: number
  longitude: number
  speed: number
  verticalAccuracy: number
}

export type HealthConnectRouteLocation = {
  time: string
  latitude: number
  longitude: number
  horizontalAccuracy?: { value: number; unit: 'meters' }
  verticalAccuracy?: { value: number; unit: 'meters' }
  altitude?: { value: number; unit: 'meters' }
}

const DEFAULT_HORIZONTAL_ACCURACY_M = 25
const DEFAULT_VERTICAL_ACCURACY_M = 0

export function mapGpsPathToAppleHealthRoute(
  path: readonly GpsPoint[],
): AppleHealthRouteLocation[] {
  return validRoutePoints(path).map((point) => ({
    altitude: finiteOrDefault(point.altitude, 0),
    course: 0,
    date: new Date(point.timestamp),
    horizontalAccuracy: positiveOrDefault(point.accuracy, DEFAULT_HORIZONTAL_ACCURACY_M),
    latitude: point.lat,
    longitude: point.lng,
    speed: Math.max(0, finiteOrDefault(point.speed, 0)),
    verticalAccuracy: DEFAULT_VERTICAL_ACCURACY_M,
  }))
}

export function mapGpsPathToHealthConnectRoute(
  path: readonly GpsPoint[],
): HealthConnectRouteLocation[] {
  return validRoutePoints(path).map((point) => {
    const location: HealthConnectRouteLocation = {
      time: new Date(point.timestamp).toISOString(),
      latitude: point.lat,
      longitude: point.lng,
      horizontalAccuracy: {
        value: positiveOrDefault(point.accuracy, DEFAULT_HORIZONTAL_ACCURACY_M),
        unit: 'meters',
      },
    }
    const altitude = finiteOrNull(point.altitude)
    if (altitude != null) {
      location.altitude = { value: altitude, unit: 'meters' }
    }
    return location
  })
}

export function validRoutePoints(path: readonly GpsPoint[]): GpsPoint[] {
  return path.filter((point) =>
    !point.isPaused &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lng) <= 180 &&
    Number.isFinite(point.timestamp) &&
    point.timestamp > 0
  )
}

function finiteOrNull(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function finiteOrDefault(value: number | undefined, fallback: number): number {
  return finiteOrNull(value) ?? fallback
}

function positiveOrDefault(value: number | undefined, fallback: number): number {
  const finite = finiteOrNull(value)
  return finite != null && finite > 0 ? finite : fallback
}
