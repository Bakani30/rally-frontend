import { describe, expect, it } from 'vitest'

import { extractPlannedRouteGeometry, plannedRouteStartPoint } from './plannedRouteGeometry'

const POINT_TO_POINT: [number, number][] = [
  [100.5412, 13.7300],
  [100.5450, 13.7325],
  [100.5480, 13.7360],
]

const LOOP: [number, number][] = [
  [100.5412, 13.7300],
  [100.5450, 13.7325],
  [100.5480, 13.7300],
  [100.5413, 13.7301],
]

describe('extractPlannedRouteGeometry', () => {
  it('produces renderable geometry for a valid point-to-point route', () => {
    const geometry = extractPlannedRouteGeometry({ type: 'LineString', coordinates: POINT_TO_POINT })
    expect(geometry).not.toBeNull()
    expect(geometry!.coordinates).toHaveLength(3)
    expect(geometry!.start).toEqual([100.5412, 13.7300])
    expect(geometry!.finish).toEqual([100.5480, 13.7360])
    expect(geometry!.isLoop).toBe(false)
  })

  it('marks a near-closed loop for a combined start/finish marker', () => {
    const geometry = extractPlannedRouteGeometry({ type: 'LineString', coordinates: LOOP })
    expect(geometry).not.toBeNull()
    expect(geometry!.isLoop).toBe(true)
  })

  it('bounds include every route point', () => {
    const geometry = extractPlannedRouteGeometry({ type: 'LineString', coordinates: POINT_TO_POINT })!
    const [west, south, east, north] = geometry.bounds
    for (const [lng, lat] of POINT_TO_POINT) {
      expect(lng).toBeGreaterThanOrEqual(west)
      expect(lng).toBeLessThanOrEqual(east)
      expect(lat).toBeGreaterThanOrEqual(south)
      expect(lat).toBeLessThanOrEqual(north)
    }
  })

  it('filters invalid coordinates without swapping lat/lng', () => {
    const geometry = extractPlannedRouteGeometry({
      type: 'LineString',
      coordinates: [
        [100.5412, 13.7300],
        [13.73, 100.54 + 100],  // lat out of range → dropped, not swapped
        [NaN, 13.73],
        [100.5450, 13.7325],
      ],
    })
    expect(geometry).not.toBeNull()
    expect(geometry!.coordinates).toEqual([[100.5412, 13.7300], [100.5450, 13.7325]])
  })

  it('returns null for fewer than two valid points', () => {
    expect(extractPlannedRouteGeometry({ type: 'LineString', coordinates: [[100.54, 13.73]] })).toBeNull()
    expect(extractPlannedRouteGeometry({ type: 'LineString', coordinates: [[999, 999], [NaN, 1]] })).toBeNull()
  })

  it('returns null for non-LineString or malformed input', () => {
    expect(extractPlannedRouteGeometry(null)).toBeNull()
    expect(extractPlannedRouteGeometry(undefined)).toBeNull()
    expect(extractPlannedRouteGeometry('route')).toBeNull()
    expect(extractPlannedRouteGeometry({ type: 'Point', coordinates: [100.54, 13.73] })).toBeNull()
    expect(extractPlannedRouteGeometry({ type: 'LineString', coordinates: 'nope' })).toBeNull()
  })

  it('sums course distance along the line in kilometres', () => {
    const geometry = extractPlannedRouteGeometry({ type: 'LineString', coordinates: POINT_TO_POINT })!
    // ~0.5 km + ~0.5 km of city blocks — assert a sane band, not an exact float.
    expect(geometry.distanceKm).toBeGreaterThan(0.5)
    expect(geometry.distanceKm).toBeLessThan(2)
  })

  it('does not mutate the source coordinates', () => {
    const source = { type: 'LineString' as const, coordinates: POINT_TO_POINT.map((c) => [...c] as [number, number]) }
    const snapshot = source.coordinates.map((c) => [...c])
    const geometry = extractPlannedRouteGeometry(source)!
    geometry.coordinates[0][0] = 0
    expect(source.coordinates).toEqual(snapshot)
  })
})

describe('plannedRouteStartPoint', () => {
  it('returns the first valid coordinate as lat/lng', () => {
    expect(plannedRouteStartPoint({ type: 'LineString', coordinates: POINT_TO_POINT }))
      .toEqual({ lng: 100.5412, lat: 13.7300 })
  })

  it('returns null when the route is not renderable', () => {
    expect(plannedRouteStartPoint(null)).toBeNull()
    expect(plannedRouteStartPoint({ type: 'LineString', coordinates: [[999, 999]] })).toBeNull()
  })
})
