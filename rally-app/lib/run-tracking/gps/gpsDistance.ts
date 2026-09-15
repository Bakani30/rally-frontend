import type { GpsPoint } from './gpsTypes'

/**
 * Pure GPS distance utilities. No side effects; safe to unit-test.
 *
 * IMPORTANT: server-side `derivePathDistance` in
 * supabase/functions/submit-run-session/service.ts must mirror this logic.
 * Anti-tamper check compares the two — divergence creates false positives.
 */

const EARTH_RADIUS_M = 6_371_008.8

/**
 * Max time gap (seconds) between two consecutive points that still counts as
 * continuous motion for the gps_live anti-tamper distance. A longer gap
 * (tunnel, backgrounded, GPS lost) is a teleport chord. MUST equal the
 * server's `GAP_MAX_DT_SECONDS` in supabase/functions/_shared/pathIntegrity.ts.
 *
 * NOTE: this is applied ONLY to the gps_live submitted distance
 * ({@link gpsLiveGapExcludedDistanceMeters}), never to {@link pathDistanceMeters}
 * — health-import / summary runs legitimately carry sparse points minutes apart
 * and must keep counting them.
 */
export const GAP_MAX_DT_SECONDS = 5 * 60

function segmentDtSeconds(prev: { timestamp: number }, point: { timestamp: number }): number {
  return (point.timestamp - prev.timestamp) / 1000
}

/** Great-circle distance between two points in meters. */
export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinHalfLat = Math.sin(dLat / 2)
  const sinHalfLng = Math.sin(dLng / 2)
  const h =
    sinHalfLat * sinHalfLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinHalfLng * sinHalfLng
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(Math.min(1, h)))
}

/**
 * Sum Haversine distance over a path, skipping segments where the *to*
 * point is paused (auto-pause speed gate). The paused point still becomes
 * the next anchor so distance resumes from the filtered dwell location.
 *
 * Mirrors server logic. Do not change one side without the other.
 */
export function pathDistanceMeters(path: readonly GpsPoint[]): number {
  let meters = 0
  let prev: GpsPoint | null = null
  for (const point of path) {
    if (prev && !point.isPaused) {
      meters += haversineMeters(prev, point)
    }
    prev = point
  }
  return meters
}

/**
 * gps_live submitted distance — pause-excluded AND >{@link GAP_MAX_DT_SECONDS}
 * teleport-chord excluded, mirroring the server's per-segment anti-tamper
 * ({@link https} _shared/pathIntegrity.ts `deriveGapExcludedDistance`). Use this
 * ONLY for the gps_live upload/reported distance so client and server agree —
 * a mismatch trips `distance_path_mismatch` and dead-letters as `max_retries`.
 * Never use it for health-import/summary runs (their sparse points are real).
 */
export function gpsLiveGapExcludedDistanceMeters(path: readonly GpsPoint[]): number {
  let meters = 0
  let prev: GpsPoint | null = null
  for (const point of path) {
    if (prev && !point.isPaused && segmentDtSeconds(prev, point) <= GAP_MAX_DT_SECONDS) {
      meters += haversineMeters(prev, point)
    }
    prev = point
  }
  return meters
}

/**
 * Distance used ONLY to answer "did a real ≥100m run happen" for the
 * minimum-distance submit gate. Unlike {@link pathDistanceMeters} it COUNTS
 * pause-flagged segments, because the auto-pause heuristic can mislabel a slow
 * walk as paused and must not be able to starve a genuine run below the floor.
 * NOT for reward, pace, or anti-tamper.
 */
export function runExistenceDistanceMeters(path: readonly GpsPoint[]): number {
  let meters = 0
  let prev: GpsPoint | null = null
  for (const point of path) {
    if (prev) {
      meters += haversineMeters(prev, point)
    }
    prev = point
  }
  return meters
}
