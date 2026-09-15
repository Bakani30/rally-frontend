import { haversineMeters } from '@/lib/run-tracking/gps/gpsDistance'
import type { LongitudeLatitude } from '@/lib/maps/mapTypes'
import type { RouteBounds } from '@/lib/maps/routeCamera'

/**
 * Validation + derived geometry for an official event's planned route
 * (`planned_route_geojson`, GeoJSON `[longitude, latitude]` order). This is
 * the only module that decides whether a planned route is renderable; screens
 * must not re-implement coordinate checks. Never swaps lat/lng to "fix" bad
 * data — invalid points are dropped instead.
 */

export type PlannedRouteGeoJson = {
  type: 'LineString'
  coordinates: [number, number][]
}

export type PlannedRouteGeometry = {
  /** Valid coordinates only, copied — never a reference into the source. */
  coordinates: LongitudeLatitude[]
  bounds: RouteBounds
  start: LongitudeLatitude
  finish: LongitudeLatitude
  /** Start and finish are effectively the same place (combined marker). */
  isLoop: boolean
  /** Total course length summed along the line, in kilometres. */
  distanceKm: number
}

/** Start/finish closer than this reads as a loop course. */
const LOOP_CLOSE_DISTANCE_M = 75

function isValidCoordinate(pair: unknown): pair is [number, number] {
  if (!Array.isArray(pair) || pair.length < 2) return false
  const [lng, lat] = pair
  return (
    typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180
    && typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90
  )
}

/**
 * Extract renderable geometry from a trusted planned-route GeoJSON value.
 * Returns null when the value is not a LineString with at least two valid
 * coordinates — callers must then hide route UI rather than guess.
 */
export function extractPlannedRouteGeometry(geojson: unknown): PlannedRouteGeometry | null {
  if (!geojson || typeof geojson !== 'object') return null
  const candidate = geojson as { type?: unknown; coordinates?: unknown }
  if (candidate.type !== 'LineString' || !Array.isArray(candidate.coordinates)) return null

  const coordinates: LongitudeLatitude[] = []
  for (const pair of candidate.coordinates) {
    if (isValidCoordinate(pair)) coordinates.push([pair[0], pair[1]])
  }
  if (coordinates.length < 2) return null

  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity
  let distanceM = 0
  for (let i = 0; i < coordinates.length; i += 1) {
    const [lng, lat] = coordinates[i]
    if (lng < west) west = lng
    if (lng > east) east = lng
    if (lat < south) south = lat
    if (lat > north) north = lat
    if (i > 0) {
      const [prevLng, prevLat] = coordinates[i - 1]
      distanceM += haversineMeters({ lat: prevLat, lng: prevLng }, { lat, lng })
    }
  }

  const start = coordinates[0]
  const finish = coordinates[coordinates.length - 1]
  const closeDistanceM = haversineMeters(
    { lat: start[1], lng: start[0] },
    { lat: finish[1], lng: finish[0] },
  )

  return {
    coordinates,
    bounds: [west, south, east, north],
    start,
    finish,
    isLoop: closeDistanceM <= LOOP_CLOSE_DISTANCE_M,
    distanceKm: distanceM / 1000,
  }
}

/** Public-safe start point of an event course, or null when not derivable. */
export function plannedRouteStartPoint(
  geojson: unknown,
): { lat: number; lng: number } | null {
  const geometry = extractPlannedRouteGeometry(geojson)
  if (!geometry) return null
  return { lng: geometry.start[0], lat: geometry.start[1] }
}
