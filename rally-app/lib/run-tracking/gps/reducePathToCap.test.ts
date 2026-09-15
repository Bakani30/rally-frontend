import { describe, expect, it } from 'vitest'
import { pathDistanceMeters } from './gpsDistance'
import type { GpsPoint } from './gpsTypes'
import { reducePathToCap } from './reducePathToCap'

const METERS_PER_DEG_LAT = 111_320

const point = (
  lat: number,
  lng: number,
  ts: number,
  isPaused = false,
): GpsPoint => ({ lat, lng, accuracy: 5, timestamp: ts, isPaused })

/** Deterministic LCG so the jittered fixture is reproducible across runs. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0
    return state / 0xffffffff
  }
}

/**
 * ~3h loop at 5s cadence: a large circle (≈30 km) sampled at 5s intervals with
 * a few meters of GPS jitter on every fix — the shape of a continuous run that
 * blows past the 1500-point server cap (2160 points here).
 */
function syntheticLongRoute(): GpsPoint[] {
  const rand = seededRandom(42)
  const centerLat = 13.7
  const centerLng = 100.5
  const radiusM = 4_770 // circumference ≈ 30 km
  const count = (3 * 3600) / 5 // 2160 points
  const jitterM = 3
  const metersPerDegLng =
    METERS_PER_DEG_LAT * Math.cos((centerLat * Math.PI) / 180)
  const out: GpsPoint[] = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI
    const dxM = Math.cos(angle) * radiusM + (rand() - 0.5) * 2 * jitterM
    const dyM = Math.sin(angle) * radiusM + (rand() - 0.5) * 2 * jitterM
    out.push(
      point(
        centerLat + dyM / METERS_PER_DEG_LAT,
        centerLng + dxM / metersPerDegLng,
        i * 5_000,
      ),
    )
  }
  return out
}

describe('reducePathToCap', () => {
  it('is a no-op (copy) when the path is already at or under the cap', () => {
    const path = [point(13.7, 100.5, 0), point(13.71, 100.5, 5_000), point(13.72, 100.5, 10_000)]
    const out = reducePathToCap(path, 1500)
    expect(out).toEqual(path)
    expect(out).not.toBe(path) // fresh array, callers can mutate safely
  })

  it('reduces an over-cap path to at most the cap', () => {
    const path = syntheticLongRoute()
    expect(path.length).toBeGreaterThan(1500)
    const out = reducePathToCap(path, 1500)
    expect(out.length).toBeLessThanOrEqual(1500)
  })

  it('keeps the first and last points exactly', () => {
    const path = syntheticLongRoute()
    const out = reducePathToCap(path, 1500)
    expect(out[0]).toEqual(path[0])
    expect(out[out.length - 1]).toEqual(path[path.length - 1])
  })

  it('preserves monotonic timestamp order', () => {
    const path = syntheticLongRoute()
    const out = reducePathToCap(path, 1500)
    for (let i = 1; i < out.length; i++) {
      expect(out[i].timestamp).toBeGreaterThan(out[i - 1].timestamp)
    }
  })

  it('keeps every point where isPaused transitions', () => {
    // Active → paused → active, with dense filler so a small cap forces heavy
    // reduction. The two transition points must survive.
    const path: GpsPoint[] = []
    for (let i = 0; i < 200; i++) {
      path.push(point(13.7 + i * 0.0001, 100.5, i * 5_000, false))
    }
    // Pause transition into a paused dwell.
    for (let i = 0; i < 200; i++) {
      path.push(point(13.72, 100.5 + i * 0.0001, (200 + i) * 5_000, true))
    }
    // Resume transition back to active.
    for (let i = 0; i < 200; i++) {
      path.push(point(13.72 + i * 0.0001, 100.6, (400 + i) * 5_000, false))
    }
    const pauseStartTs = path[200].timestamp
    const resumeTs = path[400].timestamp

    const out = reducePathToCap(path, 50)
    expect(out.length).toBeLessThanOrEqual(50)
    const timestamps = out.map((p) => p.timestamp)
    expect(timestamps).toContain(pauseStartTs)
    expect(timestamps).toContain(resumeTs)
    // The kept transition points carry their original isPaused value.
    expect(out.find((p) => p.timestamp === pauseStartTs)?.isPaused).toBe(true)
    expect(out.find((p) => p.timestamp === resumeTs)?.isPaused).toBe(false)
  })

  it('never leaves a kept active chord the server would gap-exclude (>300s)', () => {
    // A long, dead-straight, low-jitter ACTIVE stretch: exactly the shape where
    // Douglas-Peucker would happily merge >300s of continuous running into one
    // chord. The server (deriveGapExcludedDistance, GAP_MAX_DT_SECONDS=300s)
    // drops any segment whose dt > 300s, so such a fabricated chord vanishes
    // from server-derived distance while the client counts it -> false
    // distance_path_mismatch. After reduction every adjacent kept pair must stay
    // under 300s of sample time, and the reduced path's distance must track the
    // full path so the ±10% claimed-vs-derived check passes.
    const rand = seededRandom(7)
    const path: GpsPoint[] = []
    const count = (3 * 3600) / 5 // 2160 pts @5s -> well over the cap
    const startLat = 13.7
    for (let i = 0; i < count; i++) {
      const jitter = (rand() - 0.5) * 2 * 0.5 // ±0.5 m of lat jitter
      path.push(
        point(
          startLat + i * 0.00009 + jitter / METERS_PER_DEG_LAT,
          100.5,
          i * 5_000,
        ),
      )
    }
    expect(path.length).toBeGreaterThan(1500)

    const out = reducePathToCap(path, 1500)
    expect(out.length).toBeLessThanOrEqual(1500)

    // The server excludes any chord whose dt > 300s; assert none remain.
    for (let i = 1; i < out.length; i++) {
      const dtSeconds = (out[i].timestamp - out[i - 1].timestamp) / 1000
      expect(dtSeconds).toBeLessThan(300)
    }

    // Same haversine the app + server use: distance must survive the reduction.
    const fullDistance = pathDistanceMeters(path)
    const driftRatio =
      Math.abs(pathDistanceMeters(out) - fullDistance) / fullDistance
    expect(driftRatio).toBeLessThan(0.02)
  })

  it('keeps derived distance within 2% of the full path (anti-tamper budget)', () => {
    const path = syntheticLongRoute()
    const fullDistance = pathDistanceMeters(path)
    const reduced = reducePathToCap(path, 1500)
    const reducedDistance = pathDistanceMeters(reduced)
    const driftRatio = Math.abs(reducedDistance - fullDistance) / fullDistance
    expect(driftRatio).toBeLessThan(0.02)
  })

  it('respects the cap and keeps every transition across several pause spans', () => {
    // Realistic long run: several pause spans (dwell at a crossing) interleaved
    // with active stretches. Multi-segment simplification must still land under
    // the cap while preserving all pause boundaries.
    const path: GpsPoint[] = []
    let ts = 0
    let lat = 13.7
    const transitionTimestamps: number[] = []
    let prevPaused = false
    const pushRun = (count: number, paused: boolean) => {
      for (let i = 0; i < count; i++) {
        if (i === 0 && paused !== prevPaused && path.length > 0) {
          transitionTimestamps.push(ts)
        }
        path.push(point(lat, 100.5, ts, paused))
        lat += paused ? 0 : 0.00008
        ts += 5_000
        prevPaused = paused
      }
    }
    for (let span = 0; span < 6; span++) {
      pushRun(360, false) // ~30 min active
      pushRun(30, true) // ~2.5 min dwell
    }
    expect(path.length).toBeGreaterThan(1500)
    expect(transitionTimestamps.length).toBeGreaterThanOrEqual(11)

    const out = reducePathToCap(path, 1500)
    expect(out.length).toBeLessThanOrEqual(1500)
    expect(out[0]).toEqual(path[0])
    expect(out[out.length - 1]).toEqual(path[path.length - 1])
    for (let i = 1; i < out.length; i++) {
      expect(out[i].timestamp).toBeGreaterThan(out[i - 1].timestamp)
    }
    const outTimestamps = new Set(out.map((p) => p.timestamp))
    for (const t of transitionTimestamps) {
      expect(outTimestamps.has(t)).toBe(true)
    }
  })
})
