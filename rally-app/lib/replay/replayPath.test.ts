import { describe, expect, it } from 'vitest'

import {
  bearingBetween,
  buildElevationProfile,
  buildReplayTrack,
  elapsedFractionAtProgress,
  lerpBearing,
  offsetCoordinate,
  preparePath,
  revealedCoordinatesAtProgress,
  sampleAtProgress,
  simplifyReplayPath,
  smoothReplayPath,
  type ReplayLngLat,
} from './replayPath'

// A short east-then-north L-shaped path near the equator so meters↔degrees are
// easy to reason about (~111.32 km per degree lat).
const L_PATH: ReplayLngLat[] = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 0.001 },
  { lat: 0, lng: 0.002 },
  { lat: 0.001, lng: 0.002 },
  { lat: 0.002, lng: 0.002 },
]

describe('simplifyReplayPath', () => {
  it('drops colinear midpoints but keeps corners', () => {
    const simplified = simplifyReplayPath(L_PATH, 4)
    // start, the corner at (0,0.002), and the end must survive.
    expect(simplified[0]).toEqual({ lat: 0, lng: 0 })
    expect(simplified[simplified.length - 1]).toEqual({ lat: 0.002, lng: 0.002 })
    expect(simplified.some((p) => p.lat === 0 && p.lng === 0.002)).toBe(true)
    expect(simplified.length).toBeLessThan(L_PATH.length)
  })

  it('returns input untouched when 2 or fewer points', () => {
    const two = L_PATH.slice(0, 2)
    expect(simplifyReplayPath(two, 4)).toHaveLength(2)
  })
})

describe('smoothReplayPath', () => {
  it('averages neighbours and preserves length', () => {
    const noisy: ReplayLngLat[] = [
      { lat: 0, lng: 0 },
      { lat: 0.001, lng: 0 },
      { lat: 0, lng: 0 },
    ]
    const smoothed = smoothReplayPath(noisy, 1)
    expect(smoothed).toHaveLength(3)
    // Middle point pulled toward the mean of its window.
    expect(smoothed[1].lat).toBeCloseTo((0 + 0.001 + 0) / 3, 9)
  })

  it('carries altitude through when present', () => {
    const withAlt: ReplayLngLat[] = [
      { lat: 0, lng: 0, altitude: 10 },
      { lat: 0.001, lng: 0, altitude: 20 },
      { lat: 0.002, lng: 0, altitude: 30 },
    ]
    const smoothed = smoothReplayPath(withAlt, 1)
    expect(smoothed[1].altitude).toBeCloseTo(20, 6)
  })

  it('preserves each point timestamp while smoothing position', () => {
    const points: ReplayLngLat[] = [
      { lat: 0, lng: 0, timestamp: 1_000 },
      { lat: 0.001, lng: 0, timestamp: 2_000 },
      { lat: 0.002, lng: 0, timestamp: 3_000 },
    ]
    expect(smoothReplayPath(points, 1).map((point) => point.timestamp)).toEqual([1_000, 2_000, 3_000])
  })
})

describe('bearingBetween', () => {
  it('reads ~90° heading due east and ~0° due north', () => {
    expect(bearingBetween({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(90, 1)
    expect(bearingBetween({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(0, 1)
  })
})

describe('lerpBearing', () => {
  it('wraps the short way around the compass', () => {
    expect(lerpBearing(350, 10, 0.5)).toBeCloseTo(0, 6)
  })

  it('returns the start/end bearings at t=0 and t=1', () => {
    expect(lerpBearing(10, 50, 0)).toBeCloseTo(10, 6)
    expect(lerpBearing(10, 50, 1)).toBeCloseTo(50, 6)
  })
})

describe('offsetCoordinate', () => {
  it('moves north (lat increases, lng ~unchanged) for bearing 0', () => {
    const origin = { lng: 100.5, lat: 13.7 }
    const moved = offsetCoordinate(origin.lng, origin.lat, 0, 80)
    expect(moved.lat).toBeGreaterThan(origin.lat)
    expect(moved.lng).toBeCloseTo(origin.lng, 6)
  })

  it('moves east (lng increases, lat ~unchanged) for bearing 90', () => {
    const origin = { lng: 100.5, lat: 13.7 }
    const moved = offsetCoordinate(origin.lng, origin.lat, 90, 80)
    expect(moved.lng).toBeGreaterThan(origin.lng)
    expect(moved.lat).toBeCloseTo(origin.lat, 6)
  })
})

describe('buildReplayTrack + sampleAtProgress', () => {
  it('returns a safe origin sample for an empty track', () => {
    const sample = sampleAtProgress(buildReplayTrack([]), 0.5)

    expect(sample).toEqual({ lng: 0, lat: 0, bearing: 0, distanceMeters: 0, altitude: null })
  })

  const track = buildReplayTrack(L_PATH)

  it('computes a positive total distance', () => {
    expect(track.totalMeters).toBeGreaterThan(0)
    expect(track.cumulative[0]).toBe(0)
    expect(track.cumulative[track.cumulative.length - 1]).toBeCloseTo(track.totalMeters, 6)
  })

  it('returns the start at t=0 and the end at t=1', () => {
    const start = sampleAtProgress(track, 0)
    expect(start.lat).toBeCloseTo(0, 9)
    expect(start.lng).toBeCloseTo(0, 9)

    const end = sampleAtProgress(track, 1)
    expect(end.lat).toBeCloseTo(0.002, 9)
    expect(end.lng).toBeCloseTo(0.002, 9)
    expect(end.distanceMeters).toBeCloseTo(track.totalMeters, 6)
  })

  it('interpolates within a segment at the halfway point', () => {
    const mid = sampleAtProgress(track, 0.5)
    // Half the total distance lands on the east leg (which is half the path).
    expect(mid.distanceMeters).toBeCloseTo(track.totalMeters / 2, 6)
    expect(mid.lat).toBeGreaterThanOrEqual(0)
  })

  it('clamps progress outside [0,1]', () => {
    expect(sampleAtProgress(track, -1).distanceMeters).toBe(0)
    expect(sampleAtProgress(track, 5).distanceMeters).toBeCloseTo(track.totalMeters, 6)
  })

  it('handles a degenerate single-point track', () => {
    const single = buildReplayTrack([{ lat: 13.7, lng: 100.5 }])
    const s = sampleAtProgress(single, 0.5)
    expect(s.lat).toBe(13.7)
    expect(s.lng).toBe(100.5)
    expect(s.bearing).toBe(0)
  })

  it('blends bearing smoothly near a corner instead of snapping', () => {
    // The L_PATH corner sits at (0, 0.002), which is track.cumulative[2]
    // meters from the start — the boundary between the east leg (bearing
    // ~90°) and the north leg (bearing ~0°).
    const cornerDistance = track.cumulative[2]
    const justBefore = sampleAtProgress(track, (cornerDistance - 10) / track.totalMeters)
    const eastBearing = bearingBetween(L_PATH[0], L_PATH[1])
    const northBearing = bearingBetween(L_PATH[2], L_PATH[3])

    // Within the blend zone, the bearing should lie strictly between the two
    // segment bearings rather than snapping straight from one to the other.
    expect(justBefore.bearing).toBeGreaterThan(northBearing)
    expect(justBefore.bearing).toBeLessThan(eastBearing)
  })
})

describe('revealedCoordinatesAtProgress', () => {
  const track = buildReplayTrack(L_PATH)

  it('grows from start to full path', () => {
    const quarter = revealedCoordinatesAtProgress(track, 0.25)
    const full = revealedCoordinatesAtProgress(track, 1)
    expect(quarter[0]).toEqual([0, 0])
    expect(quarter.length).toBeLessThan(full.length + 1)
    expect(full.length).toBeGreaterThanOrEqual(2)
    // Last revealed point sits at the end of the path.
    expect(full[full.length - 1][0]).toBeCloseTo(0.002, 9)
  })
})

describe('elapsedFractionAtProgress', () => {
  const unevenPace: ReplayLngLat[] = [
    { lat: 0, lng: 0, timestamp: 0 },
    { lat: 0, lng: 0.001, timestamp: 10_000 },
    { lat: 0, lng: 0.002, timestamp: 40_000 },
  ]
  const track = buildReplayTrack(unevenPace)

  it('follows GPS pacing instead of distance-linear time', () => {
    expect(elapsedFractionAtProgress(track, 0.5)).toBeCloseTo(0.25, 6)
    expect(elapsedFractionAtProgress(track, 0.75)).toBeCloseTo(0.625, 6)
  })

  it('falls back when timestamps are missing or invalid', () => {
    expect(elapsedFractionAtProgress(buildReplayTrack(L_PATH), 0.5)).toBeNull()
    expect(elapsedFractionAtProgress(buildReplayTrack([
      { lat: 0, lng: 0, timestamp: 5_000 },
      { lat: 0, lng: 0.001, timestamp: 5_000 },
    ]), 0.5)).toBeNull()
  })
})

describe('buildElevationProfile', () => {
  it('reports hasAltitude=false when altitude is absent', () => {
    const track = buildReplayTrack(L_PATH)
    expect(buildElevationProfile(track).hasAltitude).toBe(false)
  })

  it('builds a profile with min/max when altitude is present', () => {
    const withAlt: ReplayLngLat[] = [
      { lat: 0, lng: 0, altitude: 12 },
      { lat: 0, lng: 0.001, altitude: 18 },
      { lat: 0, lng: 0.002, altitude: 9 },
    ]
    const profile = buildElevationProfile(buildReplayTrack(withAlt))
    expect(profile.hasAltitude).toBe(true)
    expect(profile.minAltitude).toBe(9)
    expect(profile.maxAltitude).toBe(18)
    expect(profile.samples).toHaveLength(3)
  })
})

describe('preparePath', () => {
  it('is a no-op for tiny inputs', () => {
    expect(preparePath([{ lat: 0, lng: 0 }])).toHaveLength(1)
  })

  it('reduces a dense noisy path', () => {
    const dense: ReplayLngLat[] = Array.from({ length: 200 }, (_, i) => ({
      lat: i * 0.00001,
      lng: 0 + (i % 2) * 0.0000005, // tiny jitter
    }))
    const prepared = preparePath(dense, { toleranceMeters: 5, smoothRadius: 2 })
    expect(prepared.length).toBeLessThan(dense.length)
    expect(prepared.length).toBeGreaterThanOrEqual(2)
  })
})
