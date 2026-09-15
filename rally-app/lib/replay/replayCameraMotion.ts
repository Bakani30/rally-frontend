import { haversineMeters } from '@/lib/run-tracking/gps/gpsDistance'
import { bearingBetween, type ReplayTrack } from './replayPath'

export type ReplayLocalMotion = {
  /** Mean position of the GPS points inside the window around `t`. */
  centroid: { lat: number; lng: number }
  /** Bounds of the window points as [west, south, east, north]. */
  bounds: [number, number, number, number]
  /** Radius (m) of the furthest window point from the centroid. */
  spreadMeters: number
  /** netDisplacement / pathLength over the window (0 = looping, 1 = straight). */
  straightness: number
  /** Compass bearing of the window's net displacement (deg, 0..360). */
  netBearing: number
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Smallest index whose cumulative distance is >= target. */
function lowerBound(cumulative: number[], target: number): number {
  let lo = 0
  let hi = cumulative.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (cumulative[mid] < target) lo = mid + 1
    else hi = mid
  }
  return lo
}

/**
 * Describe how the runner is moving in a window of `windowMeters` on either
 * side of the current replay distance. The replay camera uses this to decide
 * between chasing a moving runner and locking to an overhead framing when the
 * runner is churning in place (tight loops, warm-up circles, GPS jitter).
 */
export function localMotionAtProgress(
  track: ReplayTrack,
  t: number,
  windowMeters = 150,
): ReplayLocalMotion | null {
  const { points, cumulative, totalMeters } = track
  if (points.length < 2 || totalMeters === 0) return null

  const center = clamp01(t) * totalMeters
  const startDist = Math.max(0, center - windowMeters)
  const endDist = Math.min(totalMeters, center + windowMeters)

  let startIndex = lowerBound(cumulative, startDist)
  let endIndex = lowerBound(cumulative, endDist)
  if (startIndex > 0) startIndex -= 1
  if (endIndex < points.length - 1) endIndex += 1
  if (endIndex <= startIndex) {
    endIndex = Math.min(points.length - 1, startIndex + 1)
  }

  const first = points[startIndex]
  const last = points[endIndex]

  let sumLat = 0
  let sumLng = 0
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity
  for (let i = startIndex; i <= endIndex; i++) {
    const p = points[i]
    sumLat += p.lat
    sumLng += p.lng
    if (p.lng < west) west = p.lng
    if (p.lng > east) east = p.lng
    if (p.lat < south) south = p.lat
    if (p.lat > north) north = p.lat
  }
  const count = endIndex - startIndex + 1
  const centroid = { lat: sumLat / count, lng: sumLng / count }

  let spreadMeters = 0
  for (let i = startIndex; i <= endIndex; i++) {
    const d = haversineMeters(centroid, points[i])
    if (d > spreadMeters) spreadMeters = d
  }

  const pathLength = cumulative[endIndex] - cumulative[startIndex]
  const netDisplacement = haversineMeters(first, last)
  const straightness = pathLength > 0 ? clamp01(netDisplacement / pathLength) : 0
  const netBearing = netDisplacement > 0 ? bearingBetween(first, last) : 0

  return { centroid, bounds: [west, south, east, north], spreadMeters, straightness, netBearing }
}

export type ReplayCameraMode = 'chase' | 'orbit'

/**
 * Pick the camera mode with hysteresis so the framing does not flip on every
 * frame near the threshold. Once locked to `orbit` (runner circling in place),
 * stay there until the runner has clearly broken out of the cluster.
 */
export function nextReplayCameraMode(
  current: ReplayCameraMode,
  motion: ReplayLocalMotion,
  options: {
    enterSpreadMeters?: number
    enterStraightness?: number
    exitSpreadMeters?: number
    exitStraightness?: number
  } = {},
): ReplayCameraMode {
  const enterSpread = options.enterSpreadMeters ?? 70
  const enterStraightness = options.enterStraightness ?? 0.35
  const exitSpread = options.exitSpreadMeters ?? 110
  const exitStraightness = options.exitStraightness ?? 0.5

  if (current === 'orbit') {
    // Hold the overhead lock until the runner is both spread out AND moving in
    // a consistent direction — i.e. genuinely out of the looping cluster.
    const brokeOut = motion.spreadMeters > exitSpread && motion.straightness > exitStraightness
    return brokeOut ? 'chase' : 'orbit'
  }

  const isCircling = motion.spreadMeters < enterSpread || motion.straightness < enterStraightness
  return isCircling ? 'orbit' : 'chase'
}

/**
 * MapLibre zoom for the overhead orbit lock so the whole looping cluster is
 * framed with margin. Calibrated against the street-level chase zoom (17.4 ≈ a
 * ~60 m visible radius): a tight loop stays close, a wide one pulls back.
 */
export function orbitZoomForSpread(
  spreadMeters: number,
  options: { refZoom?: number; refRadiusMeters?: number; padding?: number; minZoom?: number; maxZoom?: number } = {},
): number {
  const refZoom = options.refZoom ?? 17.4
  const refRadiusMeters = options.refRadiusMeters ?? 60
  const padding = options.padding ?? 1.6
  const minZoom = options.minZoom ?? 15
  const maxZoom = options.maxZoom ?? 17.2

  const radius = Math.max(spreadMeters, 12)
  const zoom = refZoom - Math.log2((radius * padding) / refRadiusMeters)
  return Math.min(maxZoom, Math.max(minZoom, Math.round(zoom * 100) / 100))
}
