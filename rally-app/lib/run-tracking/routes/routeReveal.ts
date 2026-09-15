import type { GpsPoint } from '../gps/gpsTypes'

export type RouteRevealCoordinate = [lng: number, lat: number]

export type RouteRevealInput = {
  routeCoordinates: readonly RouteRevealCoordinate[]
  actualPath: readonly GpsPoint[]
  toleranceMeters: number
}

const METERS_PER_DEG_LAT = 111_320

/**
 * Returns only the planned-route segments that have not been touched by the
 * actual path yet. Display-only helper for route-following previews.
 */
export function buildRemainingRouteSegments(input: RouteRevealInput): RouteRevealCoordinate[][] {
  const route = input.routeCoordinates
  if (route.length < 2) return []

  const activePath = input.actualPath.filter((point) => !point.isPaused)
  if (activePath.length === 0) return [route.map(cloneCoord)]

  const toleranceMeters = Math.max(0, input.toleranceMeters)
  const covered = new Array(route.length - 1).fill(false)

  for (let i = 0; i < route.length - 1; i++) {
    const start = coordToLatLng(route[i])
    const end = coordToLatLng(route[i + 1])
    covered[i] = activePath.some((point) =>
      pointToSegmentDistanceMeters(point, start, end) <= toleranceMeters
    )
  }

  const remaining: RouteRevealCoordinate[][] = []
  let current: RouteRevealCoordinate[] | null = null

  for (let i = 0; i < covered.length; i++) {
    if (covered[i]) {
      if (current && current.length >= 2) remaining.push(current)
      current = null
      continue
    }

    if (!current) current = [cloneCoord(route[i])]
    current.push(cloneCoord(route[i + 1]))
  }

  if (current && current.length >= 2) remaining.push(current)
  return remaining
}

/**
 * Cuts the route at the furthest in-order progress reached by the actual path.
 * This is better for "draw over the line to erase it" UI because nearby
 * parallel heart-route segments do not disappear before the runner reaches
 * them.
 */
export function buildRemainingRouteAfterProgress(input: RouteRevealInput): RouteRevealCoordinate[] {
  const route = input.routeCoordinates
  if (route.length < 2) return []

  const activePath = input.actualPath.filter((point) => !point.isPaused)
  if (activePath.length === 0) return route.map(cloneCoord)

  const segments = buildRouteSegments(route)
  const totalLength = segments[segments.length - 1]?.endDistanceM ?? 0
  if (totalLength <= 0) return route.map(cloneCoord)

  const toleranceMeters = Math.max(0, input.toleranceMeters)
  let furthestProgressM = 0

  for (const point of activePath) {
    const nearest = findNearestRouteProgress(point, segments)
    if (!nearest || nearest.distanceM > toleranceMeters) continue
    furthestProgressM = Math.max(furthestProgressM, nearest.progressM)
  }

  if (furthestProgressM <= 0) return route.map(cloneCoord)
  if (furthestProgressM >= totalLength) return []

  const cut = coordinateAtDistance(segments, furthestProgressM)
  if (!cut) return route.map(cloneCoord)

  const remaining: RouteRevealCoordinate[] = [cut.coordinate]
  for (let i = cut.nextRouteIndex; i < route.length; i++) {
    remaining.push(cloneCoord(route[i]))
  }
  return remaining.length >= 2 ? remaining : []
}

function cloneCoord(coord: RouteRevealCoordinate): RouteRevealCoordinate {
  return [coord[0], coord[1]]
}

function coordToLatLng(coord: RouteRevealCoordinate): { lat: number; lng: number } {
  return { lng: coord[0], lat: coord[1] }
}

type RouteSegment = {
  index: number
  start: { lat: number; lng: number }
  end: { lat: number; lng: number }
  lengthM: number
  startDistanceM: number
  endDistanceM: number
}

function buildRouteSegments(route: readonly RouteRevealCoordinate[]): RouteSegment[] {
  const segments: RouteSegment[] = []
  let cursor = 0
  for (let i = 0; i < route.length - 1; i++) {
    const start = coordToLatLng(route[i])
    const end = coordToLatLng(route[i + 1])
    const lengthM = haversineMeters(start, end)
    if (lengthM <= 0) continue
    segments.push({
      index: i,
      start,
      end,
      lengthM,
      startDistanceM: cursor,
      endDistanceM: cursor + lengthM,
    })
    cursor += lengthM
  }
  return segments
}

function findNearestRouteProgress(
  point: { lat: number; lng: number },
  segments: readonly RouteSegment[],
): { distanceM: number; progressM: number } | null {
  let best: { distanceM: number; progressM: number } | null = null
  for (const segment of segments) {
    const projected = projectToSegmentWithT(point, segment.start, segment.end)
    const distanceM = haversineMeters(point, projected)
    if (best && distanceM >= best.distanceM) continue
    best = {
      distanceM,
      progressM: segment.startDistanceM + segment.lengthM * projected.t,
    }
  }
  return best
}

function coordinateAtDistance(
  segments: readonly RouteSegment[],
  distanceM: number,
): { coordinate: RouteRevealCoordinate; nextRouteIndex: number } | null {
  const segment = segments.find((item) =>
    distanceM >= item.startDistanceM && distanceM <= item.endDistanceM
  )
  if (!segment) return null
  const t = Math.max(0, Math.min(1, (distanceM - segment.startDistanceM) / segment.lengthM))
  return {
    coordinate: [
      segment.start.lng + (segment.end.lng - segment.start.lng) * t,
      segment.start.lat + (segment.end.lat - segment.start.lat) * t,
    ],
    nextRouteIndex: segment.index + 1,
  }
}

function pointToSegmentDistanceMeters(
  point: { lat: number; lng: number },
  segmentStart: { lat: number; lng: number },
  segmentEnd: { lat: number; lng: number },
): number {
  const projection = projectToSegment(point, segmentStart, segmentEnd)
  return haversineMeters(point, projection)
}

function projectToSegment(
  point: { lat: number; lng: number },
  segmentStart: { lat: number; lng: number },
  segmentEnd: { lat: number; lng: number },
): { lat: number; lng: number } {
  const projected = projectToSegmentWithT(point, segmentStart, segmentEnd)
  return { lat: projected.lat, lng: projected.lng }
}

function projectToSegmentWithT(
  point: { lat: number; lng: number },
  segmentStart: { lat: number; lng: number },
  segmentEnd: { lat: number; lng: number },
): { lat: number; lng: number; t: number } {
  const metersPerDegLng = Math.max(
    1,
    METERS_PER_DEG_LAT * Math.cos((segmentStart.lat * Math.PI) / 180),
  )
  const px = (point.lng - segmentStart.lng) * metersPerDegLng
  const py = (point.lat - segmentStart.lat) * METERS_PER_DEG_LAT
  const bx = (segmentEnd.lng - segmentStart.lng) * metersPerDegLng
  const by = (segmentEnd.lat - segmentStart.lat) * METERS_PER_DEG_LAT
  const segmentLenSq = bx * bx + by * by
  const t = segmentLenSq === 0
    ? 0
    : Math.max(0, Math.min(1, (px * bx + py * by) / segmentLenSq))

  return {
    lat: segmentStart.lat + (by * t) / METERS_PER_DEG_LAT,
    lng: segmentStart.lng + (bx * t) / metersPerDegLng,
    t,
  }
}

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const r = 6_371_000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return 2 * r * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}
