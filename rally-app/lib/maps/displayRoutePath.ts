import { haversineMeters } from '../run-tracking/gps/gpsDistance'
import type { GpsPoint } from '../run-tracking/gps/gpsTypes'

/**
 * Douglas-Peucker epsilon (meters) for the DISPLAY polyline. 8m is the
 * industry sweet spot (turf/simplify-js, Strava-class trackers): it drops
 * ~60-80% of GPS-jitter vertices with no visible change to real route shape,
 * whereas the previous 4m — smaller than typical foot-GPS noise (~5-8m) — kept
 * the jitter and drew a wavy, wandering line while walking. Display-only: the
 * raw path still feeds distance/pace/verification untouched.
 */
const DEFAULT_SIMPLIFY_TOLERANCE_M = 8
/**
 * Chaikin corner-smoothing passes. 0 = draw a straight polyline between the
 * simplified vertices, matching how mainstream running apps render a route.
 * The old 1-pass corner-cut rounded every vertex into a curve, which — on top
 * of the noise the 4m epsilon let through — read as "too curvy / not straight"
 * on real walks. Callers that want a smoothed line still pass `smoothingPasses`.
 */
const DEFAULT_SMOOTHING_PASSES = 0

type DisplayRoutePathOptions = {
  simplifyToleranceM?: number
  smoothingPasses?: number
}

/**
 * Build a display-only route path. This intentionally does not feed distance,
 * pace, verification, or persisted session data.
 */
export function buildDisplayRoutePath(
  path: readonly GpsPoint[],
  options: DisplayRoutePathOptions = {},
): GpsPoint[] {
  if (path.length < 3) return [...path]

  const simplifyToleranceM = options.simplifyToleranceM ?? DEFAULT_SIMPLIFY_TOLERANCE_M
  const smoothingPasses = options.smoothingPasses ?? DEFAULT_SMOOTHING_PASSES
  const simplified = simplifyDouglasPeucker(path, simplifyToleranceM)
  return smoothPath(simplified, smoothingPasses)
}

/**
 * Build a display path for a *growing live* route. Unlike
 * {@link buildDisplayRoutePath}, the output is prefix-stable: once a vertex is
 * emitted it never moves as later points arrive — only the live tail vertex
 * changes. The animated map line tweens vertices by index, so a non-stable
 * transform (Douglas-Peucker re-simplifies the whole path each tick) made the
 * old tail vertex animate toward an interior index, dragging the line's end
 * back into its middle. The streaming simplifier below decides each vertex from
 * a bounded look-ahead of one point, so recomputing on a longer path yields the
 * identical committed prefix.
 *
 * Use this for the live run route; keep {@link buildDisplayRoutePath} for
 * finished/static routes where global simplification quality matters more.
 */
export function buildLiveDisplayRoutePath(
  path: readonly GpsPoint[],
  options: DisplayRoutePathOptions = {},
): GpsPoint[] {
  // Paused points (auto-pause, manual pause/resume boundary) are kept in
  // `path` for server/distance parity but are pure GPS jitter with no real
  // motion behind them — feeding them here baked every noisy sample into a
  // permanent trail vertex (display tolerance < a paused dwell's jitter), scrawling the
  // live line into a tangle while the runner stood still. The trail freezes
  // at the last real position instead and resumes once movement returns.
  const moving = path.filter((point) => !point.isPaused)
  if (moving.length < 3) return [...moving]

  const simplifyToleranceM = options.simplifyToleranceM ?? DEFAULT_SIMPLIFY_TOLERANCE_M
  const smoothingPasses = options.smoothingPasses ?? DEFAULT_SMOOTHING_PASSES
  const simplified = simplifyStreaming(moving, simplifyToleranceM)
  return smoothPath(simplified, smoothingPasses)
}

/**
 * Prefix-stable streaming simplification. Keeps the candidate point when
 * dropping it would either bend the line past tolerance (corner) or leave the
 * anchor too far behind (distance). The latest sample is always emitted so the
 * line reaches the runner's current position.
 */
function simplifyStreaming(path: readonly GpsPoint[], toleranceM: number): GpsPoint[] {
  if (path.length < 3 || toleranceM <= 0) return [...path]

  const kept: GpsPoint[] = [path[0]]
  let anchor = path[0]
  let candidate = path[1]

  for (let i = 2; i < path.length; i++) {
    const next = path[i]
    const bendsTooFar = pointToSegmentDistanceMeters(candidate, anchor, next) > toleranceM
    const farFromAnchor = haversineMeters(anchor, candidate) >= toleranceM
    if (bendsTooFar || farFromAnchor) {
      kept.push(candidate)
      anchor = candidate
    }
    candidate = next
  }

  kept.push(candidate)
  return kept
}

/**
 * Global Douglas-Peucker simplification: keep only the vertices whose
 * perpendicular deviation from the retained polyline exceeds `toleranceM`.
 * Always keeps the first and last points and preserves input order (it filters
 * a subset). Exported so the submit-time path-cap reducer
 * ({@link reducePathToCap}) can reuse this single DP implementation instead of
 * carrying a second copy.
 */
export function simplifyDouglasPeucker(path: readonly GpsPoint[], toleranceM: number): GpsPoint[] {
  if (path.length < 3 || toleranceM <= 0) return [...path]

  const keep = new Array<boolean>(path.length).fill(false)
  keep[0] = true
  keep[path.length - 1] = true

  const stack: Array<[number, number]> = [[0, path.length - 1]]
  while (stack.length > 0) {
    const [start, end] = stack.pop()!
    let maxDistance = 0
    let maxIndex = start

    for (let i = start + 1; i < end; i++) {
      const distance = pointToSegmentDistanceMeters(path[i], path[start], path[end])
      if (distance > maxDistance) {
        maxDistance = distance
        maxIndex = i
      }
    }

    if (maxDistance > toleranceM) {
      keep[maxIndex] = true
      stack.push([start, maxIndex], [maxIndex, end])
    }
  }

  return path.filter((_, index) => keep[index])
}

export function smoothPath(path: readonly GpsPoint[], passes: number): GpsPoint[] {
  if (path.length < 3 || passes <= 0) return [...path]

  let current = [...path]
  for (let pass = 0; pass < passes; pass++) {
    const next: GpsPoint[] = [current[0]]
    for (let i = 0; i < current.length - 1; i++) {
      const a = current[i]
      const b = current[i + 1]
      next.push(interpolatePoint(a, b, 0.25), interpolatePoint(a, b, 0.75))
    }
    next.push(current[current.length - 1])
    current = next
  }

  return current
}

function interpolatePoint(a: GpsPoint, b: GpsPoint, t: number): GpsPoint {
  return {
    ...a,
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
    accuracy: a.accuracy + (b.accuracy - a.accuracy) * t,
    altitude:
      a.altitude == null || b.altitude == null
        ? a.altitude
        : a.altitude + (b.altitude - a.altitude) * t,
    speed:
      a.speed == null || b.speed == null
        ? a.speed
        : a.speed + (b.speed - a.speed) * t,
    timestamp: Math.round(a.timestamp + (b.timestamp - a.timestamp) * t),
    isPaused: a.isPaused && b.isPaused,
  }
}

export function pointToSegmentDistanceMeters(
  point: GpsPoint,
  segmentStart: GpsPoint,
  segmentEnd: GpsPoint,
): number {
  const segmentLength = haversineMeters(segmentStart, segmentEnd)
  if (segmentLength === 0) return haversineMeters(point, segmentStart)

  const projection = projectToSegment(point, segmentStart, segmentEnd)
  return haversineMeters(point, projection)
}

function projectToSegment(
  point: GpsPoint,
  segmentStart: GpsPoint,
  segmentEnd: GpsPoint,
): { lat: number; lng: number } {
  const metersPerDegLat = 111_320
  const metersPerDegLng = Math.max(
    1,
    metersPerDegLat * Math.cos((segmentStart.lat * Math.PI) / 180),
  )
  const px = (point.lng - segmentStart.lng) * metersPerDegLng
  const py = (point.lat - segmentStart.lat) * metersPerDegLat
  const bx = (segmentEnd.lng - segmentStart.lng) * metersPerDegLng
  const by = (segmentEnd.lat - segmentStart.lat) * metersPerDegLat
  const segmentLenSq = bx * bx + by * by
  const t = segmentLenSq === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / segmentLenSq))

  return {
    lat: segmentStart.lat + (by * t) / metersPerDegLat,
    lng: segmentStart.lng + (bx * t) / metersPerDegLng,
  }
}
