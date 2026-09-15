import { describe, expect, it } from 'vitest'
import type { GpsPoint } from '../gps/gpsTypes'
import { plannedRouteLengthMeters, verifyRouteMatch } from './routeMatcher'
import type { GeoJsonLineString, PlannedRoute } from './routeTypes'

// ---------------------------------------------------------------------------
// Test scaffolding
// ---------------------------------------------------------------------------

const M_PER_DEG_LAT = 111_320

const point = (lat: number, lng: number, ts = 0, isPaused = false): GpsPoint => ({
  lat,
  lng,
  accuracy: 5,
  timestamp: ts,
  isPaused,
})

/**
 * Build a planned LineString that runs due-east along a constant latitude.
 * `lengthMeters` total, `segmentCount` segments of equal length.
 */
function eastwardRoute(
  startLat: number,
  startLng: number,
  lengthMeters: number,
  segmentCount: number,
): GeoJsonLineString {
  const cos = Math.cos((startLat * Math.PI) / 180)
  const totalDegLng = lengthMeters / (M_PER_DEG_LAT * cos)
  const coords: [number, number][] = []
  for (let i = 0; i <= segmentCount; i++) {
    const frac = i / segmentCount
    coords.push([startLng + totalDegLng * frac, startLat])
  }
  return { type: 'LineString', coordinates: coords }
}

function plannedRoute(
  geojson: GeoJsonLineString,
  toleranceMeters: number,
  totalLengthMeters: number,
): PlannedRoute {
  return { geojson, toleranceMeters, totalLengthMeters }
}

/** Scatter N actual points along the same eastward line, exactly on route. */
function onRoutePath(
  startLat: number,
  startLng: number,
  lengthMeters: number,
  pointCount: number,
): GpsPoint[] {
  const cos = Math.cos((startLat * Math.PI) / 180)
  const totalDegLng = lengthMeters / (M_PER_DEG_LAT * cos)
  const out: GpsPoint[] = []
  for (let i = 0; i < pointCount; i++) {
    const frac = i / Math.max(1, pointCount - 1)
    out.push(point(startLat, startLng + totalDegLng * frac, i * 1000))
  }
  return out
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('plannedRouteLengthMeters', () => {
  it('computes the planned route length from GeoJSON coordinates', () => {
    const route = eastwardRoute(13.7, 100.5, 1000, 5)

    expect(plannedRouteLengthMeters(route)).toBeGreaterThan(990)
    expect(plannedRouteLengthMeters(route)).toBeLessThan(1010)
  })
})

describe('verifyRouteMatch — degenerate cases', () => {
  it('returns 0/0/false for empty actual path', () => {
    const route = eastwardRoute(13.7, 100.5, 1000, 5)
    const result = verifyRouteMatch([], plannedRoute(route, 25, 1000))
    expect(result.withinToleranceRatio).toBe(0)
    expect(result.lengthCoverage).toBe(0)
    expect(result.passed).toBe(false)
    expect(result.diagnostics.pointsTotal).toBe(0)
    expect(result.diagnostics.totalSegments).toBe(5)
  })

  it('returns 0/0/false for empty planned route', () => {
    const path = onRoutePath(13.7, 100.5, 1000, 20)
    const empty: GeoJsonLineString = { type: 'LineString', coordinates: [] }
    const result = verifyRouteMatch(path, plannedRoute(empty, 25, 0))
    expect(result.withinToleranceRatio).toBe(0)
    expect(result.lengthCoverage).toBe(0)
    expect(result.diagnostics.totalSegments).toBe(0)
  })

  it('skips paused actual points (excluded from ratio + length)', () => {
    const route = eastwardRoute(13.7, 100.5, 1000, 5)
    const path = onRoutePath(13.7, 100.5, 1000, 20)
    // Mark the first 5 as paused — should not affect ratio (still 100% within).
    for (let i = 0; i < 5; i++) path[i] = { ...path[i], isPaused: true }
    const result = verifyRouteMatch(path, plannedRoute(route, 25, 1000))
    expect(result.diagnostics.pointsTotal).toBe(15)
    expect(result.withinToleranceRatio).toBe(1)
  })
})

describe('verifyRouteMatch — perfect run', () => {
  it('reports 100% within and full coverage when path follows route', () => {
    const route = eastwardRoute(13.7, 100.5, 1000, 10)
    const path = onRoutePath(13.7, 100.5, 1000, 50)
    const result = verifyRouteMatch(path, plannedRoute(route, 25, 1000))
    expect(result.withinToleranceRatio).toBe(1)
    expect(result.lengthCoverage).toBe(1)
    expect(result.matchScore).toBeCloseTo(1.0, 5)
    expect(result.passed).toBe(true)
    expect(result.diagnostics.outOfBoundsExcursionCount).toBe(0)
  })
})

describe('verifyRouteMatch — fully off-route', () => {
  it('reports 0% within when path is far from route', () => {
    const route = eastwardRoute(13.7, 100.5, 1000, 5)
    // Run 1km north of the route — far outside any reasonable tolerance.
    const farLat = 13.7 + 1000 / M_PER_DEG_LAT
    const path = onRoutePath(farLat, 100.5, 1000, 20)
    const result = verifyRouteMatch(path, plannedRoute(route, 25, 1000))
    expect(result.withinToleranceRatio).toBe(0)
    expect(result.lengthCoverage).toBe(0)
    expect(result.passed).toBe(false)
    expect(result.diagnostics.outOfBoundsExcursionCount).toBe(1)
    expect(result.diagnostics.longestExcursionMeters).toBeGreaterThan(900)
  })
})

describe('verifyRouteMatch — partial coverage', () => {
  it('runner covers first half only → ~50% lengthCoverage, 100% within', () => {
    const route = eastwardRoute(13.7, 100.5, 1000, 10)
    // Runner only traverses the first 500m of the route, exactly on it.
    const path = onRoutePath(13.7, 100.5, 500, 25)
    const result = verifyRouteMatch(path, plannedRoute(route, 25, 1000))
    expect(result.withinToleranceRatio).toBe(1)
    expect(result.lengthCoverage).toBeGreaterThan(0.45)
    expect(result.lengthCoverage).toBeLessThan(0.6)
    expect(result.passed).toBe(false) // coverage < 0.96
  })
})

describe('verifyRouteMatch — excursion tracking', () => {
  it('counts a single contiguous off-route detour', () => {
    const route = eastwardRoute(13.7, 100.5, 1000, 10)
    // Build path: 5 on-route, 3 off-route (200m north), 5 on-route.
    const cos = Math.cos((13.7 * Math.PI) / 180)
    const totalDegLng = 1000 / (M_PER_DEG_LAT * cos)
    const onLat = 13.7
    const offLat = 13.7 + 200 / M_PER_DEG_LAT
    const path: GpsPoint[] = []
    let ts = 0
    for (let i = 0; i < 5; i++) {
      path.push(point(onLat, 100.5 + totalDegLng * (i / 19), ts))
      ts += 1000
    }
    for (let i = 5; i < 8; i++) {
      path.push(point(offLat, 100.5 + totalDegLng * (i / 19), ts))
      ts += 1000
    }
    for (let i = 8; i < 20; i++) {
      path.push(point(onLat, 100.5 + totalDegLng * (i / 19), ts))
      ts += 1000
    }
    const result = verifyRouteMatch(path, plannedRoute(route, 25, 1000))
    expect(result.diagnostics.outOfBoundsExcursionCount).toBe(1)
    expect(result.diagnostics.longestExcursionMeters).toBeGreaterThan(0)
    // 17 on-route / 20 total = 0.85 within
    expect(result.withinToleranceRatio).toBeCloseTo(0.85, 2)
    expect(result.passed).toBe(false) // < 0.96 within
  })

  it('counts two separate excursions', () => {
    const route = eastwardRoute(13.7, 100.5, 1000, 10)
    const cos = Math.cos((13.7 * Math.PI) / 180)
    const totalDegLng = 1000 / (M_PER_DEG_LAT * cos)
    const onLat = 13.7
    const offLat = 13.7 + 200 / M_PER_DEG_LAT
    const path: GpsPoint[] = []
    let ts = 0
    // pattern: on, off, on, off, on (excursions at indices 1 and 3)
    const pattern = ['on', 'off', 'on', 'off', 'on'] as const
    for (let i = 0; i < pattern.length; i++) {
      const lat = pattern[i] === 'on' ? onLat : offLat
      path.push(point(lat, 100.5 + totalDegLng * (i / 4), ts))
      ts += 1000
    }
    const result = verifyRouteMatch(path, plannedRoute(route, 25, 1000))
    expect(result.diagnostics.outOfBoundsExcursionCount).toBe(2)
  })
})

describe('verifyRouteMatch — pass criteria thresholds', () => {
  it('barely-failing run (95% within / 100% coverage) returns passed=false', () => {
    const route = eastwardRoute(13.7, 100.5, 1000, 10)
    const cos = Math.cos((13.7 * Math.PI) / 180)
    const totalDegLng = 1000 / (M_PER_DEG_LAT * cos)
    const path: GpsPoint[] = []
    // 100 points: 95 on-route, 5 just outside tolerance (40m north of a 25m tol).
    const offLat = 13.7 + 40 / M_PER_DEG_LAT
    for (let i = 0; i < 100; i++) {
      const lat = i < 95 ? 13.7 : offLat
      path.push(point(lat, 100.5 + totalDegLng * (i / 99), i * 1000))
    }
    const result = verifyRouteMatch(path, plannedRoute(route, 25, 1000))
    expect(result.withinToleranceRatio).toBeCloseTo(0.95, 2)
    expect(result.passed).toBe(false)
  })

  it('passes once within-tolerance and coverage both reach 96%', () => {
    const route = eastwardRoute(13.7, 100.5, 1000, 10)
    const cos = Math.cos((13.7 * Math.PI) / 180)
    const totalDegLng = 1000 / (M_PER_DEG_LAT * cos)
    const path: GpsPoint[] = []
    const offLat = 13.7 + 40 / M_PER_DEG_LAT
    for (let i = 0; i < 100; i++) {
      const lat = i < 96 ? 13.7 : offLat
      path.push(point(lat, 100.5 + totalDegLng * (i / 99), i * 1000))
    }
    const result = verifyRouteMatch(path, plannedRoute(route, 25, 1000))
    expect(result.withinToleranceRatio).toBeCloseTo(0.96, 2)
    expect(result.lengthCoverage).toBe(1)
    expect(result.passed).toBe(true)
  })

  it('match score formula = 0.4·within + 0.4·coverage + 0.2·order', () => {
    const route = eastwardRoute(13.7, 100.5, 1000, 5)
    const path = onRoutePath(13.7, 100.5, 500, 10) // ~50% coverage, ~100% within
    const result = verifyRouteMatch(path, plannedRoute(route, 25, 1000))
    const expected =
      0.4 * result.withinToleranceRatio +
      0.4 * result.lengthCoverage +
      0.2 * result.waypointOrderScore
    expect(result.matchScore).toBeCloseTo(expected, 5)
  })
})

describe('verifyRouteMatch — geometry edge cases', () => {
  it('handles a degenerate route where consecutive coords are identical', () => {
    // First two coords are identical — the matcher should drop the zero-length segment
    // and still produce sensible numbers.
    const coords: [number, number][] = [
      [100.5, 13.7],
      [100.5, 13.7],
      [100.5 + 0.01, 13.7],
    ]
    const route: GeoJsonLineString = { type: 'LineString', coordinates: coords }
    const path = onRoutePath(13.7, 100.5, 1000, 10)
    const result = verifyRouteMatch(path, plannedRoute(route, 50, 1000))
    expect(result.diagnostics.totalSegments).toBe(1) // zero-length seg removed
    expect(result.withinToleranceRatio).toBe(1)
  })

  it('point closer to a non-nearest segment endpoint still uses min distance', () => {
    // Two-segment route forming an "L". Point sits near the corner — closer to
    // the corner endpoint than to either segment's interior.
    const corner: [number, number] = [100.5, 13.7]
    const east: [number, number] = [100.5 + 0.005, 13.7]
    const north: [number, number] = [100.5, 13.7 + 0.005]
    const route: GeoJsonLineString = {
      type: 'LineString',
      coordinates: [east, corner, north],
    }
    // Point 10m north-east of corner.
    const offsetLat = 13.7 + 7 / M_PER_DEG_LAT
    const cos = Math.cos((13.7 * Math.PI) / 180)
    const offsetLng = 100.5 + 7 / (M_PER_DEG_LAT * cos)
    const result = verifyRouteMatch(
      [point(offsetLat, offsetLng, 0)],
      plannedRoute(route, 25, 1000),
    )
    expect(result.withinToleranceRatio).toBe(1)
  })
})
