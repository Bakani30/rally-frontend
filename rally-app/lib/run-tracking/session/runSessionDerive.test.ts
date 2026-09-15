import { describe, expect, it } from 'vitest'
import type { GpsPoint } from '../gps/gpsTypes'
import {
  deriveActiveDurationSeconds,
  deriveDistanceMeters,
  deriveDurationSeconds,
  derivePaceSecondsPerKm,
  deriveRunSessionTotals,
  deriveSplits,
  deriveSubmittedDistanceMeters,
} from './runSessionDerive'

const point = (lat: number, ts: number, isPaused = false): GpsPoint => ({
  lat,
  lng: 100.5,
  accuracy: 5,
  timestamp: ts,
  isPaused,
})

describe('duration derivers', () => {
  it('deriveDurationSeconds is end - start', () => {
    expect(
      deriveDurationSeconds(new Date('2026-01-01T00:00:00Z'), new Date('2026-01-01T00:30:15Z')),
    ).toBe(1815)
  })

  it('clamps negative durations to 0', () => {
    expect(
      deriveDurationSeconds(new Date(2_000_000), new Date(1_000_000)),
    ).toBe(0)
  })

  it('deriveActiveDurationSeconds subtracts paused', () => {
    expect(deriveActiveDurationSeconds(1800, 120)).toBe(1680)
    expect(deriveActiveDurationSeconds(100, 200)).toBe(0)
  })
})

describe('derivePaceSecondsPerKm', () => {
  it('returns 0 for sub-meter distances', () => {
    expect(derivePaceSecondsPerKm(0, 100)).toBe(0)
    expect(derivePaceSecondsPerKm(0.5, 100)).toBe(0)
  })

  it('5km in 30 min = 360 s/km (6:00/km)', () => {
    expect(derivePaceSecondsPerKm(5000, 1800)).toBe(360)
  })

  it('1km in 4:00 = 240 s/km', () => {
    expect(derivePaceSecondsPerKm(1000, 240)).toBe(240)
  })
})

describe('deriveDistanceMeters', () => {
  it('returns 0 for empty path', () => {
    expect(deriveDistanceMeters([])).toBe(0)
  })

  it('matches pathDistanceMeters for a normal path', () => {
    // Two points ~1.11km apart along longitude
    const p = [point(13.7, 0), point(13.71, 1000)]
    expect(deriveDistanceMeters(p)).toBeGreaterThan(1100)
    expect(deriveDistanceMeters(p)).toBeLessThan(1115)
  })
})

describe('deriveSubmittedDistanceMeters', () => {
  it('matches the 5s upload path instead of the full-rate live path', () => {
    const path = [
      point(13.7, 0),
      point(13.7 + 5_000 / 111_320, 1_000),
      point(13.7 + 10_000 / 111_320, 4_000),
      point(13.7, 5_000),
    ]

    expect(Math.round(deriveDistanceMeters(path))).toBeGreaterThan(19_000)
    expect(deriveSubmittedDistanceMeters(path)).toBe(0)
  })
})

describe('deriveSplits', () => {
  // Build a path of N evenly-spaced points along latitude such that the
  // total spans `totalMeters` over `totalMs` evenly. 1° lat ≈ 111_320m.
  function buildEvenPath(totalMeters: number, totalMs: number, points = 20): GpsPoint[] {
    const degSpan = totalMeters / 111_320
    const out: GpsPoint[] = []
    for (let i = 0; i < points; i++) {
      const frac = i / (points - 1)
      out.push(point(13.7 + degSpan * frac, Math.round(totalMs * frac)))
    }
    return out
  }

  it('returns [] for paths shorter than 1km', () => {
    const p = buildEvenPath(500, 300_000)
    expect(deriveSplits(p)).toEqual([])
  })

  it('returns [] for empty / single-point paths', () => {
    expect(deriveSplits([])).toEqual([])
    expect(deriveSplits([point(13.7, 0)])).toEqual([])
  })

  it('emits one split per whole km, last partial km dropped', () => {
    // 3.4 km in 30 min = 1800s. Pace 1800/3.4 = ~529 s/km.
    const p = buildEvenPath(3400, 1_800_000, 50)
    const splits = deriveSplits(p)
    expect(splits.map((s) => s.km)).toEqual([1, 2, 3])
    // Each split should be ~529 s
    for (const s of splits) {
      expect(s.paceSecondsPerKm).toBeGreaterThan(515)
      expect(s.paceSecondsPerKm).toBeLessThan(545)
    }
    // Cumulative timeSeconds increases monotonically
    expect(splits[0].timeSeconds).toBeLessThan(splits[1].timeSeconds)
    expect(splits[1].timeSeconds).toBeLessThan(splits[2].timeSeconds)
  })

  it('handles a sparse segment that crosses multiple km boundaries', () => {
    // 2 points: start, then 2.5km away 15 min later. Should emit km1 and km2.
    const p = [point(13.7, 0), point(13.7 + 2500 / 111_320, 900_000)]
    const splits = deriveSplits(p)
    expect(splits.map((s) => s.km)).toEqual([1, 2])
    // Pace roughly 360 s/km (15min / 2.5km = 360s)
    for (const s of splits) {
      expect(s.paceSecondsPerKm).toBeGreaterThan(340)
      expect(s.paceSecondsPerKm).toBeLessThan(380)
    }
  })

  it('paused points contribute neither distance nor time to splits', () => {
    // 1.1km in 6 min (active) with 5 min paused dwell.
    // Pace should reflect ~327 s/km, NOT raw end-start time.
    const path: GpsPoint[] = [
      point(13.7, 0),
      point(13.7 + 500 / 111_320, 180_000),     // first 500m, 3 min active
      point(13.7 + 500 / 111_320, 480_000, true), // paused 5 min, no movement
      point(13.7 + 1100 / 111_320, 660_000),    // last 600m, 3 more min active
    ]
    const splits = deriveSplits(path)
    expect(splits).toHaveLength(1)
    expect(splits[0].km).toBe(1)
    // 1km of active running done within 360s of active time → ~327 s/km
    expect(splits[0].paceSecondsPerKm).toBeGreaterThan(310)
    expect(splits[0].paceSecondsPerKm).toBeLessThan(345)
  })
})

describe('deriveRunSessionTotals — bundle', () => {
  it('computes all numbers for a clean 1.1km run', () => {
    const path = [
      { lat: 13.7, lng: 100.5, accuracy: 5, timestamp: 0, isPaused: false },
      { lat: 13.7 + 1100 / 111_320, lng: 100.5, accuracy: 5, timestamp: 396_000, isPaused: false },
    ]
    const totals = deriveRunSessionTotals({
      path,
      startedAt: new Date(0),
      endedAt: new Date(396_000),
      pausedDurationSeconds: 0,
    })
    expect(totals.distanceMeters).toBeGreaterThan(1095)
    expect(totals.distanceMeters).toBeLessThan(1105)
    expect(Number.isInteger(totals.distanceMeters)).toBe(true)
    expect(totals.durationSeconds).toBe(396)
    expect(totals.activeDurationSeconds).toBe(396)
    // 396s / 1.1km = 360 s/km
    expect(totals.paceSecondsPerKm).toBeGreaterThan(355)
    expect(totals.paceSecondsPerKm).toBeLessThan(365)
    expect(totals.splits).toHaveLength(1)
  })

  it('subtracts paused duration from active duration', () => {
    const totals = deriveRunSessionTotals({
      path: [
        { lat: 13.7, lng: 100.5, accuracy: 5, timestamp: 0, isPaused: false },
        { lat: 13.7 + 1100 / 111_320, lng: 100.5, accuracy: 5, timestamp: 636_000, isPaused: false },
      ],
      startedAt: new Date(0),
      endedAt: new Date(636_000),
      pausedDurationSeconds: 240,
    })
    expect(totals.durationSeconds).toBe(636)
    expect(totals.activeDurationSeconds).toBe(396)
    // 1.1km / 396s active = 360 s/km
    expect(totals.paceSecondsPerKm).toBeGreaterThan(355)
    expect(totals.paceSecondsPerKm).toBeLessThan(365)
  })
})
