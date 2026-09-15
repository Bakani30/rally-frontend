import { describe, expect, it } from 'vitest'
import {
  GAP_MAX_DT_SECONDS,
  gpsLiveGapExcludedDistanceMeters,
  haversineMeters,
  pathDistanceMeters,
  runExistenceDistanceMeters,
} from './gpsDistance'
import type { GpsPoint } from './gpsTypes'

const point = (
  lat: number,
  lng: number,
  ts: number,
  isPaused = false,
): GpsPoint => ({ lat, lng, accuracy: 5, timestamp: ts, isPaused })

describe('haversineMeters', () => {
  it('returns 0 for identical points', () => {
    expect(haversineMeters({ lat: 13.7563, lng: 100.5018 }, { lat: 13.7563, lng: 100.5018 })).toBe(0)
  })

  it('matches a known distance (Bangkok → Chiang Mai ≈ 587 km)', () => {
    const bkk = { lat: 13.7563, lng: 100.5018 }
    const cnx = { lat: 18.7883, lng: 98.9853 }
    const meters = haversineMeters(bkk, cnx)
    expect(meters).toBeGreaterThan(580_000)
    expect(meters).toBeLessThan(595_000)
  })

  it('is symmetric', () => {
    const a = { lat: 13.7, lng: 100.5 }
    const b = { lat: 13.71, lng: 100.51 }
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6)
  })

  it('handles antipodal points without NaN', () => {
    const meters = haversineMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })
    expect(Number.isFinite(meters)).toBe(true)
    expect(meters).toBeGreaterThan(20_000_000) // ~half earth circumference
  })
})

describe('pathDistanceMeters', () => {
  it('returns 0 for empty or single-point paths', () => {
    expect(pathDistanceMeters([])).toBe(0)
    expect(pathDistanceMeters([point(13.7, 100.5, 0)])).toBe(0)
  })

  it('sums consecutive segments', () => {
    const a = point(13.7, 100.5, 0)
    const b = point(13.71, 100.5, 1000)
    const c = point(13.72, 100.5, 2000)
    const total = pathDistanceMeters([a, b, c])
    expect(total).toBeCloseTo(haversineMeters(a, b) + haversineMeters(b, c), 6)
  })

  it('skips paused points for distance accumulation', () => {
    // Three identical-distance segments; middle marked paused.
    const a = point(13.700, 100.5, 0)
    const b = point(13.701, 100.5, 1000)
    const c = point(13.702, 100.5, 2000, true) // paused — segment b→c excluded
    const d = point(13.703, 100.5, 3000)       // segment c→d included
    const total = pathDistanceMeters([a, b, c, d])
    const expected = haversineMeters(a, b) + haversineMeters(c, d)
    expect(total).toBeCloseTo(expected, 6)
  })

  it('counts sparse segments across long time gaps (health-import safe)', () => {
    // pathDistanceMeters must NOT gap-exclude: health-import/summary runs carry
    // legitimate points minutes apart. Only the gps_live anti-tamper distance excludes gaps.
    const gapMs = (GAP_MAX_DT_SECONDS + 1) * 1000
    const a = point(13.700, 100.5, 0)
    const b = point(13.701, 100.5, gapMs) // >5min after a — still counted here
    expect(pathDistanceMeters([a, b])).toBeCloseTo(haversineMeters(a, b), 6)
  })
})

describe('gpsLiveGapExcludedDistanceMeters', () => {
  it('excludes a segment across a gap longer than GAP_MAX_DT_SECONDS (mirrors server)', () => {
    const gapMs = (GAP_MAX_DT_SECONDS + 1) * 1000
    const a = point(13.700, 100.5, 0)
    const b = point(13.701, 100.5, 1000)
    const c = point(13.702, 100.5, 1000 + gapMs) // >5min after b → chord excluded
    const d = point(13.703, 100.5, 2000 + gapMs)
    const total = gpsLiveGapExcludedDistanceMeters([a, b, c, d])
    const expected = haversineMeters(a, b) + haversineMeters(c, d)
    expect(total).toBeCloseTo(expected, 6)
  })

  it('also excludes paused segments, like the reward distance', () => {
    const a = point(13.700, 100.5, 0)
    const b = point(13.701, 100.5, 1000, true) // paused → excluded
    const c = point(13.702, 100.5, 2000)
    expect(gpsLiveGapExcludedDistanceMeters([a, b, c])).toBeCloseTo(haversineMeters(b, c), 6)
  })
})

describe('runExistenceDistanceMeters', () => {
  it('counts paused segments (unlike pathDistanceMeters) so false-pauses cannot starve a run', () => {
    const a = point(13.700, 100.5, 0)
    const b = point(13.701, 100.5, 1000, true) // paused — counted for existence
    const c = point(13.702, 100.5, 2000, true) // paused — counted for existence
    const existence = runExistenceDistanceMeters([a, b, c])
    const reward = pathDistanceMeters([a, b, c])
    expect(existence).toBeCloseTo(haversineMeters(a, b) + haversineMeters(b, c), 6)
    expect(reward).toBe(0) // both segments paused → no reward distance
    expect(existence).toBeGreaterThan(reward)
  })
})
