import { describe, expect, it } from 'vitest'
import { haversineMeters } from './gpsDistance'
import { Kalman1D, KalmanLatLng } from './kalmanSmoother'

describe('Kalman1D', () => {
  it('returns the first measurement unchanged', () => {
    const k = new Kalman1D()
    expect(k.update(10, 5, 0)).toBe(10)
  })

  it('reduces high-frequency noise around a true value', () => {
    const k = new Kalman1D()
    const truth = 100
    let mse = 0
    let count = 0
    // Inject 50 samples with ±1m gaussian-ish noise (deterministic seed)
    for (let i = 0; i < 50; i++) {
      const noise = ((i * 9301 + 49297) % 2048) / 1024 - 1 // [-1, 1)
      const measured = truth + noise * 1.5
      const filtered = k.update(measured, 1.5, i * 1000)
      if (i > 5) {
        mse += (filtered - truth) ** 2
        count++
      }
    }
    const rmse = Math.sqrt(mse / count)
    // After warmup, smoothed RMSE should be well below the noise sigma (1.5m).
    expect(rmse).toBeLessThan(0.7)
  })

  it('bounds single-sample jumps under realistic stationary GPS noise', () => {
    // Real phone GPS commonly wobbles several meters even at a reported
    // accuracy of ~8m — much noisier than the ±1.5m case above. A wide
    // cold-start velocity prior let this noise pass through almost
    // unfiltered (the live marker visibly "walked in place" while the
    // runner stood still). Regression guard for that bug.
    const k = new Kalman1D()
    const truth = 50
    let maxStepDelta = 0
    let prevFiltered = truth
    for (let i = 0; i < 30; i++) {
      const noise = ((i * 9301 + 49297) % 2048) / 1024 - 1 // [-1, 1)
      const measured = truth + noise * 7 // ~7m 1σ, reported accuracy 8m
      const filtered = k.update(measured, 8, i * 1000)
      if (i > 0) maxStepDelta = Math.max(maxStepDelta, Math.abs(filtered - prevFiltered))
      prevFiltered = filtered
    }
    expect(maxStepDelta).toBeLessThan(6)
  })

  it('reset clears state — next update is again pass-through', () => {
    const k = new Kalman1D()
    k.update(10, 5, 0)
    k.update(20, 5, 1000)
    k.reset()
    expect(k.update(99, 5, 2000)).toBe(99)
  })

  it('tracks a steadily moving target with low lag (constant-velocity model)', () => {
    // A constant-position filter averages past positions, so on a steady ramp
    // its estimate trails the truth by a large, persistent offset — this is the
    // "rubber-band" that drags the live line behind the runner on long trips.
    // A constant-velocity model carries the motion forward and tracks within a
    // couple meters.
    const k = new Kalman1D()
    const speed = 3 // m/s
    let errSum = 0
    let count = 0
    for (let i = 0; i < 50; i++) {
      const truth = speed * i // position (m) at t = i s
      const noise = ((i * 9301 + 49297) % 2048) / 1024 - 1 // [-1, 1)
      const measured = truth + noise * 1.0
      const filtered = k.update(measured, 3, i * 1000)
      if (i >= 35) {
        errSum += Math.abs(filtered - truth)
        count++
      }
    }
    const meanErr = errSum / count
    expect(meanErr).toBeLessThan(2)
  })

  it('recovers from a long gap without rubber-banding the estimate', () => {
    // Steady 3 m/s, then a 10s background gap. The velocity carries the
    // prediction forward, so the first post-gap fix is not a huge surprise and
    // the estimate stays close to truth instead of crawling toward it.
    const k = new Kalman1D()
    const speed = 3
    let t = 0
    for (let i = 0; i < 20; i++) {
      k.update(speed * t, 3, t * 1000)
      t += 1
    }
    const gapTruth = speed * (t + 10)
    t += 10
    const out = k.update(gapTruth, 5, t * 1000)
    expect(Math.abs(out - gapTruth)).toBeLessThan(6)
  })

  it('weights low-accuracy samples less than high-accuracy ones', () => {
    const tight = new Kalman1D()
    const loose = new Kalman1D()
    tight.update(0, 1, 0)
    loose.update(0, 1, 0)
    // Identical noisy measurement, but reported accuracy differs by 100×
    const tightOut = tight.update(10, 1, 1000)
    const looseOut = loose.update(10, 100, 1000)
    // The "tight" filter should move closer to 10; "loose" should barely move.
    expect(tightOut).toBeGreaterThan(looseOut)
  })
})

describe('KalmanLatLng', () => {
  it('returns first measurement coordinates unchanged', () => {
    const k = new KalmanLatLng()
    const out = k.smooth({ lat: 13.7, lng: 100.5, accuracy: 5, timestamp: 0 })
    expect(out.lat).toBe(13.7)
    expect(out.lng).toBe(100.5)
  })

  it('smooths jitter around a stationary point', () => {
    const k = new KalmanLatLng()
    const baseLat = 13.7
    const baseLng = 100.5
    let lastLat = 0
    let lastLng = 0
    for (let i = 0; i < 30; i++) {
      const jitter = ((i * 9301 + 49297) % 2048) / 1024 - 1
      const out = k.smooth({
        lat: baseLat + jitter * 0.00001,
        lng: baseLng + jitter * 0.00001,
        accuracy: 5,
        timestamp: i * 1000,
      })
      lastLat = out.lat
      lastLng = out.lng
    }
    expect(Math.abs(lastLat - baseLat)).toBeLessThan(0.00001)
    expect(Math.abs(lastLng - baseLng)).toBeLessThan(0.00001)
  })

  it('dampens low-confidence jumps using meter-based variance', () => {
    const k = new KalmanLatLng()
    const base = { lat: 13.7, lng: 100.5 }
    k.smooth({ ...base, accuracy: 5, timestamp: 0 })

    const noisy = {
      lat: base.lat + 100 / 111_320,
      lng: base.lng,
      accuracy: 20,
      timestamp: 1000,
    }
    const out = k.smooth(noisy)

    expect(haversineMeters(base, out)).toBeLessThan(15)
  })
})
