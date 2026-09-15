/**
 * Phase 3.5 waypoint-order scoring.
 *
 * Phase 3 v1 hardcoded waypointOrderScore = 1.0 — that catches "did the
 * runner cover the route?" but not "did they cover it IN ORDER?". A
 * closed-loop or out-and-back gamer can still pass v1 by jogging the
 * route in any sequence (or even backward).
 *
 * v3.5 fixes this by sampling N waypoints along the planned LineString
 * and, for each waypoint, finding the timestamp at which the runner
 * came closest. The waypoint-by-waypoint sequence of those timestamps
 * is then run through the longest-increasing-subsequence (LIS)
 * algorithm. The score is LIS_length / waypointCount.
 *
 * Why LIS?
 * - 1.0 only when the runner hit every waypoint in order (perfect).
 * - Drops by ≈1/N for each waypoint visited out of order.
 * - Tolerates skipped waypoints (the LIS just shortens), which is
 *   important: a runner who shortcuts one segment but otherwise stays
 *   on course shouldn't be punished disproportionately by length
 *   coverage AND order.
 *
 * Algorithm:
 *   1. Sample W waypoints uniformly along the route, every ~50m, capped
 *      between 8 and 200. (Routes shorter than 400m get the floor;
 *      anything past 10km gets the ceiling.)
 *   2. For each waypoint, find the actual GPS timestamp whose distance
 *      to that waypoint is minimal. Skip waypoints with no close
 *      enough match (> 3 × tolerance) — they're clearly missed.
 *   3. Build a sequence of timestamps in waypoint order and compute
 *      LIS in O(W log W).
 *   4. Score = lis / W. Empty waypoint list returns 1.0 (degenerate
 *      route — the v1 lengthCoverage already returned 0).
 *
 * The function is pure (no I/O, no time, no mocks). Same module is
 * imported by the Deno verify-route-match service AND mobile preview.
 */

export type Waypoint = { lat: number; lng: number }

export type WaypointOrderInput = {
  /** Planned route as [lng, lat] tuples (GeoJSON convention). */
  routeCoordinates: readonly [number, number][]
  /** Total planned length in meters — used to size the waypoint count. */
  totalLengthMeters: number
  /** Active GPS path (post-pause filter) in chronological order. */
  actualPath: readonly { lat: number; lng: number; timestamp: number }[]
  /** Match-tolerance in meters. */
  toleranceMeters: number
}

export type WaypointOrderResult = {
  /** Score in [0, 1] — 1.0 means waypoints visited in perfect order. */
  score: number
  /** How many waypoints were sampled. */
  waypointCount: number
  /** How many waypoints found a close-enough actual point. */
  matchedCount: number
  /** LIS length over the matched timestamps. */
  lisLength: number
}

const WAYPOINT_SPACING_M = 50
const WAYPOINT_MIN = 8
const WAYPOINT_MAX = 200
/** Per skill: a waypoint with no actual point within 3× tolerance is "missed". */
const MATCH_LIMIT_MULT = 3

const EARTH_RADIUS_M = 6_371_000

export function scoreWaypointOrder(input: WaypointOrderInput): WaypointOrderResult {
  const waypoints = sampleWaypoints(input.routeCoordinates, input.totalLengthMeters)
  if (waypoints.length === 0) {
    return { score: 1, waypointCount: 0, matchedCount: 0, lisLength: 0 }
  }

  const limit = input.toleranceMeters * MATCH_LIMIT_MULT
  const limitSq = limit * limit
  // Equirectangular for distance comparisons — same family as routeMatcher.
  // Speed matters because this loop is W × P (≤ 200 × 1500 = 300k).
  const matchedTimestamps: number[] = []
  for (const wp of waypoints) {
    const cosLat = Math.cos((wp.lat * Math.PI) / 180)
    let bestSq = Infinity
    let bestTs = -1
    for (const p of input.actualPath) {
      const dx = (p.lng - wp.lng) * 111_320 * cosLat
      const dy = (p.lat - wp.lat) * 111_320
      const dSq = dx * dx + dy * dy
      if (dSq < bestSq) {
        bestSq = dSq
        bestTs = p.timestamp
      }
    }
    if (bestSq <= limitSq && bestTs !== -1) {
      matchedTimestamps.push(bestTs)
    }
  }

  if (matchedTimestamps.length === 0) {
    return { score: 0, waypointCount: waypoints.length, matchedCount: 0, lisLength: 0 }
  }

  const lis = longestIncreasingSubsequenceLength(matchedTimestamps)
  // Penalise both order errors AND missed waypoints in one number: divide
  // by the total waypoint count (not just matched). A run that hits 5/8
  // waypoints in perfect order scores 5/8 = 0.625.
  return {
    score: lis / waypoints.length,
    waypointCount: waypoints.length,
    matchedCount: matchedTimestamps.length,
    lisLength: lis,
  }
}

// ---------------------------------------------------------------------------
// Waypoint sampling along the LineString.
// ---------------------------------------------------------------------------

function sampleWaypoints(
  routeCoordinates: readonly [number, number][],
  totalLengthMeters: number,
): Waypoint[] {
  if (routeCoordinates.length < 2 || totalLengthMeters <= 0) return []

  const targetCount = clamp(
    Math.round(totalLengthMeters / WAYPOINT_SPACING_M),
    WAYPOINT_MIN,
    WAYPOINT_MAX,
  )
  // Distance step between waypoints. We sample at i/N, ..., (N-1)/N along
  // the line — first point, then evenly spaced — and append the very last
  // coordinate so the final segment is always represented.
  const step = totalLengthMeters / targetCount
  const out: Waypoint[] = []

  let segIdx = 0
  let segStartCum = 0
  let segLen = haversineMeters(
    coordToLatLng(routeCoordinates[0]),
    coordToLatLng(routeCoordinates[1]),
  )

  for (let i = 0; i < targetCount; i++) {
    const targetCum = i * step
    while (
      segIdx < routeCoordinates.length - 2 &&
      targetCum > segStartCum + segLen
    ) {
      segStartCum += segLen
      segIdx += 1
      segLen = haversineMeters(
        coordToLatLng(routeCoordinates[segIdx]),
        coordToLatLng(routeCoordinates[segIdx + 1]),
      )
    }
    const t = segLen <= 0 ? 0 : (targetCum - segStartCum) / segLen
    const a = coordToLatLng(routeCoordinates[segIdx])
    const b = coordToLatLng(routeCoordinates[segIdx + 1])
    out.push({
      lat: a.lat + (b.lat - a.lat) * t,
      lng: a.lng + (b.lng - a.lng) * t,
    })
  }
  return out
}

function coordToLatLng(coord: readonly [number, number]): Waypoint {
  return { lat: coord[1], lng: coord[0] }
}

function haversineMeters(a: Waypoint, b: Waypoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

// ---------------------------------------------------------------------------
// Longest Increasing Subsequence — O(n log n) patience sorting.
// ---------------------------------------------------------------------------

/**
 * Returns the length of the longest strictly-increasing subsequence of
 * `arr`. Uses patience sorting with binary search — O(n log n). Pure.
 */
export function longestIncreasingSubsequenceLength(arr: readonly number[]): number {
  if (arr.length === 0) return 0
  // tails[i] = smallest tail value of any increasing subseq of length i+1.
  const tails: number[] = []
  for (const x of arr) {
    let lo = 0
    let hi = tails.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (tails[mid] < x) lo = mid + 1
      else hi = mid
    }
    tails[lo] = x
  }
  return tails.length
}
