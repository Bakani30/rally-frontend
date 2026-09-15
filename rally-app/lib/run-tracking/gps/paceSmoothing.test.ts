import { describe, expect, it } from 'vitest'
import { PaceSmoother, ROLLING_WINDOW_MS, formatPace } from './paceSmoothing'
import type { GpsPoint } from './gpsTypes'

const point = (lat: number, ts: number, isPaused = false): GpsPoint => ({
  lat,
  lng: 100.5,
  accuracy: 5,
  timestamp: ts,
  isPaused,
})

describe('PaceSmoother', () => {
  it('returns null while buffer is too sparse', () => {
    const s = new PaceSmoother()
    expect(s.currentPaceSecPerKm(0)).toBeNull()
    s.push(point(13.7, 0))
    expect(s.currentPaceSecPerKm(0)).toBeNull()
  })

  it('returns null when distance accumulated is below threshold', () => {
    const s = new PaceSmoother()
    s.push(point(13.7, 0))
    s.push(point(13.700001, 10_000)) // ~0.1m in 10s
    expect(s.currentPaceSecPerKm(10_000)).toBeNull()
  })

  it('computes pace at 6:00/km for a steady 10 km/h run', () => {
    const s = new PaceSmoother()
    // 10 km/h = 0.0001 deg lat per second (~11m/s ≈ slightly off; recompute)
    // Use direct distance: 1° lat ≈ 111_320m; want ~2.78 m/s.
    const metersPerStep = 2.78
    const degPerStep = metersPerStep / 111_320
    for (let i = 0; i < 15; i++) {
      s.push(point(13.7 + i * degPerStep, i * 1000))
    }
    const pace = s.currentPaceSecPerKm(14_000)!
    // 2.78 m/s → 360 s/km exactly
    expect(pace).toBeGreaterThan(345)
    expect(pace).toBeLessThan(375)
  })

  it('drops paused points from the buffer', () => {
    const s = new PaceSmoother()
    s.push(point(13.7, 0))
    s.push(point(13.701, 1000, true)) // paused — ignored
    // Buffer still effectively has 1 point → null
    expect(s.currentPaceSecPerKm(1000)).toBeNull()
  })

  it('trims points outside the 30s window', () => {
    const s = new PaceSmoother()
    s.push(point(13.7, 0))
    // After 60s, the original point should be aged out.
    s.push(point(13.701, ROLLING_WINDOW_MS * 2))
    expect(s.currentPaceSecPerKm(ROLLING_WINDOW_MS * 2)).toBeNull()
  })

  it('reset clears the buffer', () => {
    const s = new PaceSmoother()
    s.push(point(13.700, 0))
    s.push(point(13.710, 10_000))
    s.reset()
    expect(s.currentPaceSecPerKm(10_000)).toBeNull()
  })
})

describe('formatPace', () => {
  it('formats whole minutes', () => {
    expect(formatPace(360)).toBe('6:00/km')
  })

  it('zero-pads seconds', () => {
    expect(formatPace(305)).toBe('5:05/km')
  })

  it('handles null and infinity', () => {
    expect(formatPace(null)).toBe('--:--/km')
    expect(formatPace(Infinity)).toBe('--:--/km')
  })
})
