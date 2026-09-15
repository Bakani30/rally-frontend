import { haversineMeters } from '../gps/gpsDistance'
import type { GpsPoint } from '../gps/gpsTypes'
import type { GeoJsonLineString, PlannedRoute, RouteMatchResult } from './routeTypes'
import { scoreWaypointOrder } from './waypointOrder'

/**
 * Phase 3 v1 route matcher: point-to-line tolerance + length coverage.
 *
 * Algorithm (from skills/run-tracking/SKILL.md §Verification Phase 3 v1):
 *   1. Convert GeoJSON LineString to segments [(A, B), ...].
 *   2. For each actual GPS point, find min distance to ANY segment.
 *   3. Mark within-tolerance points and mark touched segments as covered.
 *   4. withinToleranceRatio = points_within / points_total
 *      lengthCoverage     = covered_segment_length / total_planned_length
 *      waypointOrderScore = 1.0 (v1; Phase 3.5 enables LIS check)
 *      matchScore         = 0.4·within + 0.4·coverage + 0.2·order
 *      passed             = score ≥ 0.85 AND within ≥ 0.96 AND coverage ≥ 0.96
 *
 * This module runs both client-side (live overlay) and server-side
 * (Edge Function `verify-route-match` — Phase 3). It MUST stay pure: no
 * React, expo-*, supabase, or fetch. Imports gpsDistance for haversine
 * (already pure).
 *
 * Numerical method: point-to-segment distance uses a local equirectangular
 * projection centred at the segment start. Error is < 0.1% for segments
 * shorter than ~5km, which covers all realistic running routes.
 *
 * Complexity: O(P · S) where P = actual points (≤1500), S = planned
 * segments (typically 50–500). At worst ~750k operations — well within
 * Edge Function budget (~50ms).
 */

const EARTH_M_PER_DEG_LAT = 111_320
const ROUTE_MATCH_PASS_MIN_SCORE = 0.85
const ROUTE_MATCH_PASS_MIN_RATIO = 0.96

/** Cap below which a "segment" is treated as a degenerate point. */
const DEGENERATE_SEG_M = 0.01

export function verifyRouteMatch(
  actualPath: readonly GpsPoint[],
  planned: PlannedRoute,
): RouteMatchResult {
  const segments = buildSegments(planned)
  const totalSegments = segments.length
  const totalPlannedLength = segments.reduce((acc, s) => acc + s.lengthMeters, 0)

  // Treat paused points like absent points: keep them out of the ratio.
  const activePoints = actualPath.filter((p) => !p.isPaused)
  const pointsTotal = activePoints.length

  // Degenerate guard: empty path or empty/length-zero route → 0 across the board.
  if (pointsTotal === 0 || totalSegments === 0 || totalPlannedLength <= 0) {
    return zeroResult(pointsTotal, totalSegments)
  }

  const segmentCovered = new Array<boolean>(totalSegments).fill(false)
  let pointsWithinTolerance = 0
  let outOfBoundsExcursionCount = 0
  let longestExcursionMeters = 0

  // Excursion tracking — a contiguous run of off-tolerance points.
  let inExcursion = false
  let currentExcursionMeters = 0
  let prevActive: GpsPoint | null = null

  for (const point of activePoints) {
    let bestDistance = Infinity
    let bestSegmentIdx = -1
    for (let i = 0; i < segments.length; i++) {
      const d = pointToSegmentMeters(point, segments[i])
      if (d < bestDistance) {
        bestDistance = d
        bestSegmentIdx = i
      }
    }

    const within = bestDistance <= planned.toleranceMeters
    if (within) {
      pointsWithinTolerance += 1
      if (bestSegmentIdx >= 0) segmentCovered[bestSegmentIdx] = true

      if (inExcursion) {
        // Close out the excursion.
        if (currentExcursionMeters > longestExcursionMeters) {
          longestExcursionMeters = currentExcursionMeters
        }
        outOfBoundsExcursionCount += 1
        inExcursion = false
        currentExcursionMeters = 0
      }
    } else {
      if (!inExcursion) {
        inExcursion = true
        currentExcursionMeters = 0
      } else if (prevActive) {
        currentExcursionMeters += haversineMeters(prevActive, point)
      }
    }
    prevActive = point
  }

  // Close out a trailing excursion.
  if (inExcursion) {
    if (currentExcursionMeters > longestExcursionMeters) {
      longestExcursionMeters = currentExcursionMeters
    }
    outOfBoundsExcursionCount += 1
  }

  const coveredLength = segments.reduce(
    (acc, s, i) => (segmentCovered[i] ? acc + s.lengthMeters : acc),
    0,
  )
  const coveredSegments = segmentCovered.filter(Boolean).length

  const withinToleranceRatio = pointsWithinTolerance / pointsTotal
  const lengthCoverage = coveredLength / totalPlannedLength
  // Phase 3.5: LIS over waypoint timestamps. See waypointOrder.ts.
  const orderResult = scoreWaypointOrder({
    routeCoordinates: planned.geojson.coordinates,
    totalLengthMeters: totalPlannedLength,
    actualPath: activePoints,
    toleranceMeters: planned.toleranceMeters,
  })
  const waypointOrderScore = orderResult.score
  const matchScore =
    0.4 * withinToleranceRatio + 0.4 * lengthCoverage + 0.2 * waypointOrderScore

  const passed =
    matchScore >= ROUTE_MATCH_PASS_MIN_SCORE &&
    withinToleranceRatio >= ROUTE_MATCH_PASS_MIN_RATIO &&
    lengthCoverage >= ROUTE_MATCH_PASS_MIN_RATIO

  return {
    withinToleranceRatio,
    lengthCoverage,
    waypointOrderScore,
    matchScore,
    passed,
    diagnostics: {
      pointsTotal,
      pointsWithinTolerance,
      coveredSegments,
      totalSegments,
      outOfBoundsExcursionCount,
      longestExcursionMeters: Math.round(longestExcursionMeters),
      waypointCount: orderResult.waypointCount,
      waypointMatched: orderResult.matchedCount,
      waypointLis: orderResult.lisLength,
    },
  }
}

/**
 * Compute total Haversine length of a planned LineString. Keep this in sync
 * with the Edge Function matcher; active route events use it for live reward
 * progress while the server remains source of truth after submit.
 */
export function plannedRouteLengthMeters(geojson: GeoJsonLineString): number {
  const coords = geojson.coordinates
  let meters = 0
  for (let i = 1; i < coords.length; i++) {
    const [aLng, aLat] = coords[i - 1]
    const [bLng, bLat] = coords[i]
    meters += haversineMeters({ lat: aLat, lng: aLng }, { lat: bLat, lng: bLng })
  }
  return meters
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

type Segment = {
  /** Anchor point used as projection origin. */
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  lengthMeters: number
  /** Cached cos(originLat) for projection — saves Math.cos in the hot loop. */
  cosOriginLat: number
}

function buildSegments(planned: PlannedRoute): Segment[] {
  const coords = planned.geojson.coordinates
  const out: Segment[] = []
  for (let i = 1; i < coords.length; i++) {
    const [aLng, aLat] = coords[i - 1]
    const [bLng, bLat] = coords[i]
    const lengthMeters = haversineMeters(
      { lat: aLat, lng: aLng },
      { lat: bLat, lng: bLng },
    )
    if (lengthMeters < DEGENERATE_SEG_M) continue
    out.push({
      startLat: aLat,
      startLng: aLng,
      endLat: bLat,
      endLng: bLng,
      lengthMeters,
      cosOriginLat: Math.cos((aLat * Math.PI) / 180),
    })
  }
  return out
}

/**
 * Point-to-segment distance in meters. Uses an equirectangular projection
 * with origin at the segment's start — sub-0.1% error for segments under ~5km.
 */
function pointToSegmentMeters(p: { lat: number; lng: number }, s: Segment): number {
  // Project all three points to local meters relative to (s.startLat, s.startLng).
  const mPerDegLng = EARTH_M_PER_DEG_LAT * s.cosOriginLat
  const ax = 0
  const ay = 0
  const bx = (s.endLng - s.startLng) * mPerDegLng
  const by = (s.endLat - s.startLat) * EARTH_M_PER_DEG_LAT
  const px = (p.lng - s.startLng) * mPerDegLng
  const py = (p.lat - s.startLat) * EARTH_M_PER_DEG_LAT

  const segDx = bx - ax
  const segDy = by - ay
  const segLenSq = segDx * segDx + segDy * segDy
  if (segLenSq === 0) {
    // Degenerate: segment collapsed to a point.
    return Math.hypot(px, py)
  }
  // t = where the projection falls along the segment, clamped to [0, 1].
  let t = ((px - ax) * segDx + (py - ay) * segDy) / segLenSq
  if (t < 0) t = 0
  else if (t > 1) t = 1
  const projX = ax + t * segDx
  const projY = ay + t * segDy
  return Math.hypot(px - projX, py - projY)
}

function zeroResult(pointsTotal: number, totalSegments: number): RouteMatchResult {
  return {
    withinToleranceRatio: 0,
    lengthCoverage: 0,
    waypointOrderScore: 1.0,
    matchScore: 0.2, // 0.2 contributed by waypointOrderScore=1.0
    passed: false,
    diagnostics: {
      pointsTotal,
      pointsWithinTolerance: 0,
      coveredSegments: 0,
      totalSegments,
      outOfBoundsExcursionCount: 0,
      longestExcursionMeters: 0,
      waypointCount: 0,
      waypointMatched: 0,
      waypointLis: 0,
    },
  }
}
