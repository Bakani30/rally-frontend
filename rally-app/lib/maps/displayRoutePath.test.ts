import { describe, expect, it } from 'vitest'

import type { GpsPoint } from '../run-tracking/gps/gpsTypes'
import { buildDisplayRoutePath, buildLiveDisplayRoutePath } from './displayRoutePath'

const point = (lat: number, lng: number, timestamp: number): GpsPoint => ({
  lat,
  lng,
  accuracy: 5,
  timestamp,
  isPaused: false,
})

/**
 * Deterministic walking trace (~1.4m steps) with a sharp corner and sub-meter
 * GPS jitter, so simplification actually makes keep/drop decisions. No random
 * source — jitter is a fixed sine so the test is reproducible.
 */
function walkPath(): GpsPoint[] {
  const out: GpsPoint[] = []
  const stepDeg = 0.0000126 // ~1.4m in latitude
  let lat = 13.7
  let lng = 100.5
  // leg 1: walk north ~28m
  for (let i = 0; i < 20; i++) {
    const jitter = Math.sin(i * 1.7) * 0.0000018 // < 0.5m wobble
    out.push(point(lat + jitter, lng + jitter * 0.5, i * 1000))
    lat += stepDeg
  }
  // leg 2: sharp 90° turn, walk east ~28m
  for (let i = 0; i < 20; i++) {
    const jitter = Math.sin(i * 1.3) * 0.0000018
    out.push(point(lat + jitter * 0.5, lng + jitter, (20 + i) * 1000))
    lng += stepDeg
  }
  return out
}

describe('buildDisplayRoutePath', () => {
  it('returns a copy for short paths', () => {
    const path = [point(13.7, 100.5, 0), point(13.7001, 100.5001, 1000)]
    const out = buildDisplayRoutePath(path)

    expect(out).toEqual(path)
    expect(out).not.toBe(path)
  })

  it('removes points that do not change the display shape', () => {
    const path = [
      point(13.7, 100.5, 0),
      point(13.70001, 100.50001, 1000),
      point(13.70002, 100.50002, 2000),
      point(13.701, 100.501, 3000),
    ]

    const out = buildDisplayRoutePath(path, { simplifyToleranceM: 4, smoothingPasses: 0 })

    expect(out).toEqual([path[0], path[3]])
  })

  it('keeps real corners while smoothing the rendered line', () => {
    const path = [
      point(13.7, 100.5, 0),
      point(13.701, 100.5, 1000),
      point(13.701, 100.501, 2000),
    ]

    const out = buildDisplayRoutePath(path, { simplifyToleranceM: 4, smoothingPasses: 1 })

    expect(out[0]).toEqual(path[0])
    expect(out[out.length - 1]).toEqual(path[path.length - 1])
    expect(out.length).toBeGreaterThan(path.length)
    expect(out.some((p) => p.lat > path[0].lat && p.lng === path[0].lng)).toBe(true)
    expect(out.some((p) => p.lat === path[1].lat && p.lng > path[1].lng)).toBe(true)
  })
})

describe('buildLiveDisplayRoutePath', () => {
  it('returns a copy for short paths', () => {
    const path = [point(13.7, 100.5, 0), point(13.7001, 100.5001, 1000)]
    const out = buildLiveDisplayRoutePath(path)

    expect(out).toEqual(path)
    expect(out).not.toBe(path)
  })

  it('keeps every committed vertex fixed as the path grows (no smoothing)', () => {
    const full = walkPath()

    for (let n = 3; n < full.length; n++) {
      const prev = buildLiveDisplayRoutePath(full.slice(0, n), { smoothingPasses: 0 })
      const next = buildLiveDisplayRoutePath(full.slice(0, n + 1), { smoothingPasses: 0 })

      // Only the live tail vertex may move; everything before it must be
      // byte-identical at the same index. This is the property the animated
      // index-tween relies on — its violation is what dragged the tail to the
      // middle of the line.
      const committed = prev.slice(0, prev.length - 1)
      expect(next.slice(0, committed.length)).toEqual(committed)
    }
  })

  it('keeps the far prefix fixed as the path grows (with smoothing)', () => {
    const full = walkPath()
    // 1-pass Chaikin reshapes at most the last segment region (3 vertices).
    const SMOOTHING_TAIL = 3

    for (let n = 3; n < full.length; n++) {
      const prev = buildLiveDisplayRoutePath(full.slice(0, n), { smoothingPasses: 1 })
      const next = buildLiveDisplayRoutePath(full.slice(0, n + 1), { smoothingPasses: 1 })

      const committed = prev.slice(0, Math.max(0, prev.length - SMOOTHING_TAIL))
      expect(next.slice(0, committed.length)).toEqual(committed)
    }
  })

  it('keeps a real corner instead of rounding across it', () => {
    const path = [
      point(13.7, 100.5, 0),
      point(13.701, 100.5, 1000),
      point(13.701, 100.501, 2000),
    ]

    const out = buildLiveDisplayRoutePath(path, { simplifyToleranceM: 4, smoothingPasses: 0 })

    // The turn vertex survives simplification.
    expect(out.some((p) => p.lat === path[1].lat && p.lng === path[1].lng)).toBe(true)
    expect(out[0]).toEqual(path[0])
    expect(out[out.length - 1]).toEqual(path[path.length - 1])
  })

  it('always reaches the latest sampled position', () => {
    const full = walkPath()
    const out = buildLiveDisplayRoutePath(full, { smoothingPasses: 0 })
    const last = full[full.length - 1]

    expect(out[out.length - 1].lat).toBe(last.lat)
    expect(out[out.length - 1].lng).toBe(last.lng)
  })

  it('freezes the trail on paused points instead of scrawling GPS jitter', () => {
    // Reported bug: a runner standing still (auto-paused, isPaused=true) still
    // showed the trailing route line tangling into a chaotic loop, because
    // every jittery paused sample was treated as a real trail vertex at a 4m
    // tolerance smaller than typical GPS noise. Paused points must not extend
    // or bend the visible trail at all.
    const settled = point(13.7, 100.5, 0)
    const jittery: GpsPoint[] = []
    for (let i = 1; i <= 20; i++) {
      const jitter = Math.sin(i * 2.1) * 0.00007 // ~7-8m wobble, all flagged paused
      jittery.push({ ...point(13.7 + jitter, 100.5 + jitter * 0.6, i * 1000), isPaused: true })
    }
    const path = [settled, ...jittery]

    const out = buildLiveDisplayRoutePath(path, { simplifyToleranceM: 4, smoothingPasses: 0 })

    expect(out).toEqual([settled])
  })

  it('resumes the trail from the last settled point once real movement returns', () => {
    const settled = point(13.7, 100.5, 0)
    const paused: GpsPoint = { ...point(13.70001, 100.50001, 1000), isPaused: true }
    const resumed = point(13.701, 100.5005, 2000) // ~110m away — unambiguous real movement

    const out = buildLiveDisplayRoutePath([settled, paused, resumed], {
      simplifyToleranceM: 4,
      smoothingPasses: 0,
    })

    expect(out[0]).toEqual(settled)
    expect(out[out.length - 1]).toEqual(resumed)
    expect(out.some((p) => p.lat === paused.lat && p.lng === paused.lng)).toBe(false)
  })
})
