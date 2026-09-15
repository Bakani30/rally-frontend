import { describe, expect, it } from 'vitest'
import {
  longestIncreasingSubsequenceLength,
  scoreWaypointOrder,
} from './waypointOrder'

const BASE_LAT = 13.7563
const BASE_LNG = 100.5018

const offsetLat = (m: number) => m / 111_320
const offsetLng = (m: number, lat = BASE_LAT) =>
  m / (111_320 * Math.cos((lat * Math.PI) / 180))

describe('longestIncreasingSubsequenceLength', () => {
  it('returns 0 for empty', () => {
    expect(longestIncreasingSubsequenceLength([])).toBe(0)
  })
  it('returns sequence length when fully increasing', () => {
    expect(longestIncreasingSubsequenceLength([1, 2, 3, 4, 5])).toBe(5)
  })
  it('returns 1 for fully decreasing', () => {
    expect(longestIncreasingSubsequenceLength([5, 4, 3, 2, 1])).toBe(1)
  })
  it('handles classic O(n log n) test case', () => {
    expect(longestIncreasingSubsequenceLength([3, 10, 2, 1, 20])).toBe(3)
    expect(longestIncreasingSubsequenceLength([10, 22, 9, 33, 21, 50, 41, 60, 80])).toBe(6)
  })
})

describe('scoreWaypointOrder', () => {
  // Build a 1km east-bound straight line.
  const route: [number, number][] = [
    [BASE_LNG, BASE_LAT],
    [BASE_LNG + offsetLng(1000), BASE_LAT],
  ]
  const totalLengthMeters = 1000

  it('scores 1.0 when the runner traverses every waypoint in order', () => {
    // 21 actual points, evenly spaced east, increasing timestamps.
    const path = Array.from({ length: 21 }, (_, i) => ({
      lat: BASE_LAT,
      lng: BASE_LNG + offsetLng(i * 50),
      timestamp: i * 1000,
    }))
    const r = scoreWaypointOrder({
      routeCoordinates: route,
      totalLengthMeters,
      actualPath: path,
      toleranceMeters: 25,
    })
    expect(r.score).toBe(1)
    expect(r.matchedCount).toBe(r.waypointCount)
    expect(r.lisLength).toBe(r.waypointCount)
  })

  it('drops the score when the runner traverses backwards', () => {
    const path = Array.from({ length: 21 }, (_, i) => ({
      lat: BASE_LAT,
      lng: BASE_LNG + offsetLng((20 - i) * 50),
      timestamp: i * 1000,
    }))
    const r = scoreWaypointOrder({
      routeCoordinates: route,
      totalLengthMeters,
      actualPath: path,
      toleranceMeters: 25,
    })
    // All waypoints matched, but timestamps are decreasing → LIS = 1.
    expect(r.matchedCount).toBe(r.waypointCount)
    expect(r.lisLength).toBe(1)
    expect(r.score).toBeCloseTo(1 / r.waypointCount, 5)
  })

  it('rejects shuffled-order gaming (waypoints visited out of sequence)', () => {
    // Imagine a runner who teleports between waypoints — visits them in a
    // jumbled order. Score should drop sharply: LIS of a random permutation
    // of N is on average ~2·sqrt(N).
    const indices = [10, 2, 18, 5, 14, 7, 0, 19, 3, 12, 8, 16, 1, 11, 6, 17, 4, 15, 9, 20, 13]
    const path = indices.map((idx, i) => ({
      lat: BASE_LAT,
      lng: BASE_LNG + offsetLng(idx * 50),
      timestamp: i * 1000,
    }))
    const r = scoreWaypointOrder({
      routeCoordinates: route,
      totalLengthMeters,
      actualPath: path,
      toleranceMeters: 25,
    })
    // LIS of this permutation is 6 (one of: 0,2,5,7,12,16,17 etc.).
    // Score ≈ 6 / 21 ≈ 0.29. Definitely below the 0.85 pass threshold.
    expect(r.score).toBeLessThan(0.5)
  })

  it('returns 0 when no waypoint finds a close-enough match', () => {
    // Path runs perpendicular, far from the route.
    const path = Array.from({ length: 21 }, (_, i) => ({
      lat: BASE_LAT + offsetLat(500),
      lng: BASE_LNG + offsetLng(i * 50),
      timestamp: i * 1000,
    }))
    const r = scoreWaypointOrder({
      routeCoordinates: route,
      totalLengthMeters,
      actualPath: path,
      toleranceMeters: 25,
    })
    expect(r.matchedCount).toBe(0)
    expect(r.score).toBe(0)
  })

  it('returns 1 (degenerate) for a route with no length', () => {
    const r = scoreWaypointOrder({
      routeCoordinates: [[BASE_LNG, BASE_LAT]],
      totalLengthMeters: 0,
      actualPath: [],
      toleranceMeters: 25,
    })
    expect(r.score).toBe(1)
    expect(r.waypointCount).toBe(0)
  })

  it('caps waypoint count at 200 for very long routes', () => {
    const r = scoreWaypointOrder({
      routeCoordinates: route,
      totalLengthMeters: 100_000, // 100 km
      actualPath: [{ lat: BASE_LAT, lng: BASE_LNG, timestamp: 0 }],
      toleranceMeters: 25,
    })
    expect(r.waypointCount).toBeLessThanOrEqual(200)
  })

  it('floors waypoint count at 8 for very short routes', () => {
    const r = scoreWaypointOrder({
      routeCoordinates: route,
      totalLengthMeters: 100, // 100m → would be 2 by spacing, floored to 8
      actualPath: [{ lat: BASE_LAT, lng: BASE_LNG, timestamp: 0 }],
      toleranceMeters: 25,
    })
    expect(r.waypointCount).toBe(8)
  })
})
