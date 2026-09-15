/**
 * Pure geometry helpers for the 3D Run Replay flyover. No React, no native
 * modules — safe to unit-test.
 *
 * The replay camera walks the route by *distance fraction* (0..1), not by
 * per-point timestamps, so the fly-over moves at a steady visual speed even
 * though GPS samples are unevenly spaced. Steps:
 *
 *   preparePath(raw)  -> simplify + smooth a run's GPS path
 *   buildReplayTrack  -> cumulative distances + total, computed once
 *   sampleAtProgress  -> position + heading at fraction t (drives the camera)
 *
 * Distance uses the same Haversine as gpsDistance so the numbers agree with the
 * rest of run-tracking.
 */

import { haversineMeters } from '@/lib/run-tracking/gps/gpsDistance'

export type ReplayLngLat = {
  lat: number
  lng: number
  altitude?: number
  /** Unix ms of the GPS sample; used for the real-time replay HUD. */
  timestamp?: number
}

export type ReplayTrack = {
  points: ReplayLngLat[]
  /** cumulative[i] = meters from start to points[i]; cumulative[0] = 0. */
  cumulative: number[]
  totalMeters: number
}

export type ReplaySample = {
  lng: number
  lat: number
  /** Compass heading of travel at this point, degrees clockwise from north. */
  bearing: number
  /** Meters travelled from start at this progress. */
  distanceMeters: number
  /** Interpolated altitude when the path carries it, else null. */
  altitude: number | null
}

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t)

/** Meters before/after a vertex over which the camera bearing blends smoothly. */
const BEARING_BLEND_METERS = 45

/**
 * Interpolate between two compass bearings the short way around (never more
 * than 180°), so a blend from e.g. 350° to 10° passes through 0° instead of
 * spinning the long way through 180°.
 */
export function lerpBearing(a: number, b: number, t: number): number {
  const d = ((b - a + 540) % 360) - 180
  return (a + d * t + 360) % 360
}

/**
 * Ramer–Douglas–Peucker simplification with a metric tolerance. Keeps the
 * shape while dropping redundant samples so long runs (thousands of points)
 * stay cheap to animate. Perpendicular distance is approximated in a local
 * equirectangular projection — fine at the scale of a single run.
 */
export function simplifyReplayPath(points: ReplayLngLat[], toleranceMeters = 4): ReplayLngLat[] {
  if (points.length <= 2) return points.slice()

  const lat0 = (points[0].lat * Math.PI) / 180
  const mPerDegLat = 111_320
  const mPerDegLng = 111_320 * Math.cos(lat0)
  const x = (p: ReplayLngLat) => p.lng * mPerDegLng
  const y = (p: ReplayLngLat) => p.lat * mPerDegLat

  const keep = new Array<boolean>(points.length).fill(false)
  keep[0] = true
  keep[points.length - 1] = true

  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length > 0) {
    const [start, end] = stack.pop()!
    const ax = x(points[start])
    const ay = y(points[start])
    const bx = x(points[end])
    const by = y(points[end])
    const dx = bx - ax
    const dy = by - ay
    const segLen = Math.hypot(dx, dy) || 1

    let maxDist = -1
    let maxIndex = -1
    for (let i = start + 1; i < end; i++) {
      const px = x(points[i])
      const py = y(points[i])
      // Perpendicular distance from point to segment a-b.
      const dist = Math.abs((py - ay) * dx - (px - ax) * dy) / segLen
      if (dist > maxDist) {
        maxDist = dist
        maxIndex = i
      }
    }

    if (maxDist > toleranceMeters && maxIndex !== -1) {
      keep[maxIndex] = true
      stack.push([start, maxIndex], [maxIndex, end])
    }
  }

  return points.filter((_, i) => keep[i])
}

/**
 * Moving-average smoothing over lat/lng (and altitude when present) to take the
 * jitter out of raw GPS before the camera follows it. `radius` is the number of
 * neighbours on each side.
 */
export function smoothReplayPath(points: ReplayLngLat[], radius = 1): ReplayLngLat[] {
  if (radius < 1 || points.length <= 2) return points.slice()

  return points.map((point, i) => {
    let lat = 0
    let lng = 0
    let alt = 0
    let altCount = 0
    let count = 0
    for (let j = i - radius; j <= i + radius; j++) {
      if (j < 0 || j >= points.length) continue
      lat += points[j].lat
      lng += points[j].lng
      count++
      if (points[j].altitude != null) {
        alt += points[j].altitude as number
        altCount++
      }
    }
    const smoothed: ReplayLngLat = { lat: lat / count, lng: lng / count }
    if (point.altitude != null && altCount > 0) smoothed.altitude = alt / altCount
    // Position smoothing must not change the sample's original clock.
    if (point.timestamp != null) smoothed.timestamp = point.timestamp
    return smoothed
  })
}

/** simplify + smooth in one call, tolerant of tiny/empty inputs. */
export function preparePath(
  raw: ReplayLngLat[],
  options: { toleranceMeters?: number; smoothRadius?: number } = {},
): ReplayLngLat[] {
  if (raw.length <= 2) return raw.slice()
  const simplified = simplifyReplayPath(raw, options.toleranceMeters ?? 4)
  return smoothReplayPath(simplified, options.smoothRadius ?? 1)
}

/** Bearing from a to b, degrees clockwise from north (0..360). */
export function bearingBetween(a: ReplayLngLat, b: ReplayLngLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const dLng = toRad(b.lng - a.lng)
  const yy = Math.sin(dLng) * Math.cos(lat2)
  const xx = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (toDeg(Math.atan2(yy, xx)) + 360) % 360
}

/**
 * Offset a coordinate by `meters` along `bearingDeg` (degrees clockwise from
 * north), using a flat equirectangular approximation — fine at the scale of a
 * single run's lookahead offset.
 */
export function offsetCoordinate(
  lng: number,
  lat: number,
  bearingDeg: number,
  meters: number,
): { lng: number; lat: number } {
  const bearingRad = (bearingDeg * Math.PI) / 180
  const mPerDegLat = 111_320
  const dLat = (meters * Math.cos(bearingRad)) / mPerDegLat
  const dLng = (meters * Math.sin(bearingRad)) / (mPerDegLat * Math.cos((lat * Math.PI) / 180))
  return { lng: lng + dLng, lat: lat + dLat }
}

/** Precompute cumulative distances so sampling is O(log n) per frame. */
export function buildReplayTrack(points: ReplayLngLat[]): ReplayTrack {
  const cumulative = new Array<number>(points.length)
  let total = 0
  for (let i = 0; i < points.length; i++) {
    if (i > 0) total += haversineMeters(points[i - 1], points[i])
    cumulative[i] = total
  }
  return { points, cumulative, totalMeters: total }
}

/** Largest index whose cumulative distance is <= target (binary search). */
function segmentIndexForDistance(cumulative: number[], target: number): number {
  let lo = 0
  let hi = cumulative.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (cumulative[mid] <= target) lo = mid
    else hi = mid - 1
  }
  return lo
}

/**
 * Position + heading at progress fraction t (0 = start, 1 = end). The camera
 * centers here; the revealed route line is everything up to this point.
 */
export function sampleAtProgress(track: ReplayTrack, t: number): ReplaySample {
  const { points, cumulative, totalMeters } = track
  const first = points[0]
  if (!first) {
    return { lng: 0, lat: 0, bearing: 0, distanceMeters: 0, altitude: null }
  }
  if (points.length === 1 || totalMeters === 0) {
    return { lng: first.lng, lat: first.lat, bearing: 0, distanceMeters: 0, altitude: first.altitude ?? null }
  }

  const target = clamp01(t) * totalMeters
  const i = segmentIndexForDistance(cumulative, target)
  const last = points.length - 1
  if (i >= last) {
    const a = points[last - 1]
    const b = points[last]
    return { lng: b.lng, lat: b.lat, bearing: bearingBetween(a, b), distanceMeters: totalMeters, altitude: b.altitude ?? null }
  }

  const a = points[i]
  const b = points[i + 1]
  const segLen = cumulative[i + 1] - cumulative[i]
  const frac = segLen > 0 ? (target - cumulative[i]) / segLen : 0
  const lng = a.lng + (b.lng - a.lng) * frac
  const lat = a.lat + (b.lat - a.lat) * frac
  const altitude =
    a.altitude != null && b.altitude != null ? a.altitude + (b.altitude - a.altitude) * frac : a.altitude ?? b.altitude ?? null

  const bCur = bearingBetween(a, b)
  const distIntoSeg = target - cumulative[i]
  let bearing = bCur
  if (i > 0 && distIntoSeg < BEARING_BLEND_METERS) {
    const bPrev = bearingBetween(points[i - 1], a)
    const t = clamp01(0.5 + 0.5 * (distIntoSeg / BEARING_BLEND_METERS))
    bearing = lerpBearing(bPrev, bCur, t)
  } else if (i < last - 1 && segLen - distIntoSeg < BEARING_BLEND_METERS) {
    const bNext = bearingBetween(b, points[i + 2])
    const t = clamp01(0.5 * (1 - (segLen - distIntoSeg) / BEARING_BLEND_METERS))
    bearing = lerpBearing(bCur, bNext, t)
  }

  return { lng, lat, bearing, distanceMeters: target, altitude }
}

/** Coordinates from start up to progress t, for drawing the revealed line. */
export function revealedCoordinatesAtProgress(track: ReplayTrack, t: number): [number, number][] {
  const { points, cumulative, totalMeters } = track
  if (points.length < 2 || totalMeters === 0) {
    return points.map((p) => [p.lng, p.lat])
  }
  const sample = sampleAtProgress(track, t)
  const target = clamp01(t) * totalMeters
  const i = segmentIndexForDistance(cumulative, target)
  const revealed: [number, number][] = []
  for (let k = 0; k <= i && k < points.length; k++) revealed.push([points[k].lng, points[k].lat])
  revealed.push([sample.lng, sample.lat])
  return revealed
}

/**
 * Return the wall-clock fraction at a distance progress value. This keeps the
 * replay HUD aligned with pauses/slow sections when GPS timestamps are valid,
 * while callers can fall back to distance-linear progress for old routes.
 */
export function elapsedFractionAtProgress(track: ReplayTrack, t: number): number | null {
  const { points, cumulative, totalMeters } = track
  if (points.length < 2 || totalMeters === 0) return null

  const startTs = points[0].timestamp
  const endTs = points[points.length - 1].timestamp
  if (startTs == null || endTs == null || endTs <= startTs) return null

  const target = clamp01(t) * totalMeters
  const i = segmentIndexForDistance(cumulative, target)
  if (i >= points.length - 1) return 1

  const a = points[i]
  const b = points[i + 1]
  if (a.timestamp == null || b.timestamp == null || b.timestamp < a.timestamp) return null

  const segmentMeters = cumulative[i + 1] - cumulative[i]
  const segmentFraction = segmentMeters > 0
    ? (target - cumulative[i]) / segmentMeters
    : 0
  const timestamp = a.timestamp + (b.timestamp - a.timestamp) * segmentFraction
  return clamp01((timestamp - startTs) / (endTs - startTs))
}

export type ElevationProfile = {
  hasAltitude: boolean
  /** distanceMeters + altitude for each point that has altitude. */
  samples: { distanceMeters: number; altitude: number }[]
  minAltitude: number
  maxAltitude: number
}

/**
 * Elevation-vs-distance profile for the bottom chart. Returns hasAltitude=false
 * when the run carries no altitude (Android often reports none) so the caller
 * can hide the chart gracefully.
 */
export function buildElevationProfile(track: ReplayTrack): ElevationProfile {
  const samples: { distanceMeters: number; altitude: number }[] = []
  for (let i = 0; i < track.points.length; i++) {
    const alt = track.points[i].altitude
    if (alt != null && Number.isFinite(alt)) {
      samples.push({ distanceMeters: track.cumulative[i], altitude: alt })
    }
  }
  if (samples.length < 2) {
    return { hasAltitude: false, samples: [], minAltitude: 0, maxAltitude: 0 }
  }
  let min = Infinity
  let max = -Infinity
  for (const s of samples) {
    if (s.altitude < min) min = s.altitude
    if (s.altitude > max) max = s.altitude
  }
  return { hasAltitude: true, samples, minAltitude: min, maxAltitude: max }
}
