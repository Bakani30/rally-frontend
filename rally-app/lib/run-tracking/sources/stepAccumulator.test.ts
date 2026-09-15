import { describe, expect, it } from 'vitest'
import { accumulateWatchSteps, clampStepsForDistance } from './stepAccumulator'

describe('accumulateWatchSteps', () => {
  it('adds the positive delta when the raw reading only grows', () => {
    let state = { total: 0, lastRaw: 0 }
    state = accumulateWatchSteps(state, { raw: 100 })
    expect(state).toEqual({ total: 100, lastRaw: 100 })
    state = accumulateWatchSteps(state, { raw: 250 })
    expect(state).toEqual({ total: 250, lastRaw: 250 })
  })

  it('folds the new raw value into the total when a restart is detected (raw decreases)', () => {
    let state = { total: 500, lastRaw: 300 }
    // Subscription restarted — raw resets low.
    state = accumulateWatchSteps(state, { raw: 20 })
    expect(state).toEqual({ total: 520, lastRaw: 20 })
  })

  it('handles a restart at raw=0', () => {
    let state = { total: 1000, lastRaw: 800 }
    state = accumulateWatchSteps(state, { raw: 0 })
    expect(state).toEqual({ total: 1000, lastRaw: 0 })
  })

  it('is a no-op when raw is unchanged', () => {
    const state = { total: 100, lastRaw: 100 }
    const next = accumulateWatchSteps(state, { raw: 100 })
    expect(next).toEqual({ total: 100, lastRaw: 100 })
  })
})

describe('clampStepsForDistance', () => {
  it('returns steps when within both bounds', () => {
    // 1000m, 600s (10min) -> stride bound 5000 steps, cadence bound 3000 steps
    const result = clampStepsForDistance({ steps: 1200, distanceMeters: 1000, movingTimeSeconds: 600 })
    expect(result).toBe(1200)
  })

  it('keeps steps exactly at the distance*5 boundary', () => {
    const result = clampStepsForDistance({ steps: 500, distanceMeters: 100, movingTimeSeconds: 600 })
    expect(result).toBe(500)
  })

  it('rejects steps just over the distance*5 boundary', () => {
    const result = clampStepsForDistance({ steps: 501, distanceMeters: 100, movingTimeSeconds: 600 })
    expect(result).toBeNull()
  })

  it('keeps steps exactly at the 300 spm boundary', () => {
    // 300 spm * 10 min = 3000 steps
    const result = clampStepsForDistance({ steps: 3000, distanceMeters: 10_000, movingTimeSeconds: 600 })
    expect(result).toBe(3000)
  })

  it('rejects steps just over the 300 spm boundary', () => {
    const result = clampStepsForDistance({ steps: 3001, distanceMeters: 10_000, movingTimeSeconds: 600 })
    expect(result).toBeNull()
  })

  it('returns null when steps is null', () => {
    expect(clampStepsForDistance({ steps: null, distanceMeters: 1000, movingTimeSeconds: 600 })).toBeNull()
  })

  it('returns null when steps is undefined', () => {
    expect(clampStepsForDistance({ steps: undefined, distanceMeters: 1000, movingTimeSeconds: 600 })).toBeNull()
  })

  it('returns null when distanceMeters is absent', () => {
    expect(clampStepsForDistance({ steps: 100, distanceMeters: null, movingTimeSeconds: 600 })).toBeNull()
  })

  it('returns null when movingTimeSeconds is absent', () => {
    expect(clampStepsForDistance({ steps: 100, distanceMeters: 1000, movingTimeSeconds: null })).toBeNull()
  })

  it('returns null for non-finite inputs', () => {
    expect(clampStepsForDistance({ steps: NaN, distanceMeters: 1000, movingTimeSeconds: 600 })).toBeNull()
  })

  it('does not divide by zero when movingTimeSeconds is 0 (skips cadence check)', () => {
    // distanceMeters*5 bound still applies.
    const result = clampStepsForDistance({ steps: 10, distanceMeters: 1000, movingTimeSeconds: 0 })
    expect(result).toBe(10)
  })
})
