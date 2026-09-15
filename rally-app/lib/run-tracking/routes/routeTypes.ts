/**
 * Route challenge types. A planned route is a GeoJSON LineString. A match
 * result describes how an actual run path scored against that planned route.
 *
 * Phase 3 v1 scoring: point-to-line tolerance + length coverage.
 * Phase 3.5 adds waypoint-order score (directionality).
 *
 * See skills/run-tracking/SKILL.md §Route-following challenge.
 */

export type LatLng = {
  lat: number
  lng: number
}

/** GeoJSON LineString. Coordinate order is [lng, lat] per RFC 7946. */
export type GeoJsonLineString = {
  type: 'LineString'
  coordinates: [number, number][]
}

export type PlannedRoute = {
  geojson: GeoJsonLineString
  toleranceMeters: number
  totalLengthMeters: number
}

export type RouteMatchResult = {
  /** Fraction of actual points within toleranceMeters of any planned segment. */
  withinToleranceRatio: number
  /** Fraction of planned length that has at least one actual point near it. */
  lengthCoverage: number
  /** Phase 3.5 directional score; 1.0 in v1 (not enforced). */
  waypointOrderScore: number
  /** Weighted: 0.4 within + 0.4 length + 0.2 order */
  matchScore: number
  /** matchScore >= 0.85 AND withinTolerance >= 0.96 AND lengthCoverage >= 0.96 */
  passed: boolean
  diagnostics: {
    pointsTotal: number
    pointsWithinTolerance: number
    coveredSegments: number
    totalSegments: number
    /** Number of contiguous segments that left the tolerance corridor. */
    outOfBoundsExcursionCount: number
    longestExcursionMeters: number
    /** Phase 3.5: how many waypoints were sampled along the planned route. */
    waypointCount: number
    /** Phase 3.5: waypoints with an actual GPS point within 3× tolerance. */
    waypointMatched: number
    /** Phase 3.5: longest in-order subsequence length over matched waypoints. */
    waypointLis: number
  }
}
