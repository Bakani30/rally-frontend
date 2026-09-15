import { describe, expect, it } from 'vitest'
import type { GpsPoint } from '../gps/gpsTypes'
import {
  buildRemainingRouteAfterProgress,
  buildRemainingRouteSegments,
  type RouteRevealCoordinate,
} from './routeReveal'

const BASE_LAT = 13.7563
const BASE_LNG = 100.5018
const METERS_PER_DEG_LAT = 111_320

function point(lat: number, lng: number, isPaused = false): GpsPoint {
  return {
    lat,
    lng,
    accuracy: 5,
    timestamp: 0,
    isPaused,
  }
}

function eastRoute(segmentMeters: number, segments: number): RouteRevealCoordinate[] {
  const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos((BASE_LAT * Math.PI) / 180)
  return Array.from({ length: segments + 1 }, (_, index) => [
    BASE_LNG + (segmentMeters * index) / metersPerDegLng,
    BASE_LAT,
  ])
}

describe('buildRemainingRouteSegments', () => {
  it('returns the full route when no actual path exists', () => {
    const route = eastRoute(25, 4)
    expect(buildRemainingRouteSegments({
      routeCoordinates: route,
      actualPath: [],
      toleranceMeters: 10,
    })).toEqual([route])
  })

  it('removes planned route segments touched by the actual path', () => {
    const route = eastRoute(25, 4)
    const actualPath = [
      point(BASE_LAT, route[1][0]),
      point(BASE_LAT, route[2][0]),
    ]

    const remaining = buildRemainingRouteSegments({
      routeCoordinates: route,
      actualPath,
      toleranceMeters: 10,
    })

    expect(remaining).toHaveLength(1)
    expect(remaining[0][0]).toEqual(route[3])
    expect(remaining[0][1]).toEqual(route[4])
  })

  it('ignores paused points so pausing on the line does not erase it', () => {
    const route = eastRoute(25, 2)
    const actualPath = [point(BASE_LAT, route[1][0], true)]

    expect(buildRemainingRouteSegments({
      routeCoordinates: route,
      actualPath,
      toleranceMeters: 10,
    })).toEqual([route])
  })
})

describe('buildRemainingRouteAfterProgress', () => {
  it('cuts the planned route at the furthest reached route progress', () => {
    const route = eastRoute(25, 4)
    const actualPath = [
      point(BASE_LAT, route[1][0]),
      point(BASE_LAT, route[2][0]),
    ]

    const remaining = buildRemainingRouteAfterProgress({
      routeCoordinates: route,
      actualPath,
      toleranceMeters: 10,
    })

    expect(remaining[0][0]).toBeCloseTo(route[2][0], 8)
    expect(remaining[0][1]).toBeCloseTo(route[2][1], 8)
    expect(remaining.at(-1)).toEqual(route.at(-1))
  })

  it('does not erase nearby future segments before progress reaches them', () => {
    const route: RouteRevealCoordinate[] = [
      [BASE_LNG, BASE_LAT],
      [BASE_LNG + 0.001, BASE_LAT],
      [BASE_LNG + 0.001, BASE_LAT + 0.0001],
      [BASE_LNG, BASE_LAT + 0.0001],
    ]
    const actualPath = [point(BASE_LAT, BASE_LNG + 0.0005)]

    const remaining = buildRemainingRouteAfterProgress({
      routeCoordinates: route,
      actualPath,
      toleranceMeters: 20,
    })

    expect(remaining[0][0]).toBeCloseTo(BASE_LNG + 0.0005, 8)
    expect(remaining.some((coord) => coord[0] === route[2][0] && coord[1] === route[2][1])).toBe(true)
  })
})
