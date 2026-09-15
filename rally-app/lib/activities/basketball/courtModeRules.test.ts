import { describe, expect, it } from 'vitest'

import { evaluateBasketballCourtMode } from './courtModeRules'
import type { BasketballCourtModeMetrics } from './courtModeTypes'

const baseMetrics: BasketballCourtModeMetrics = {
  startedAt: '2026-05-18T10:00:00.000Z',
  endedAt: '2026-05-18T10:15:00.000Z',
  source: 'healthkit',
  basketballWorkoutSeconds: 0,
  steps: 0,
  distanceMeters: 0,
  activeCalories: null,
  avgHeartRate: null,
  maxHeartRate: null,
  restingHeartRate: null,
  heartRateCoverageSeconds: 0,
  cadenceHighSeconds: null,
  cadenceMax: null,
}

function metrics(overrides: Partial<BasketballCourtModeMetrics>): BasketballCourtModeMetrics {
  return { ...baseMetrics, ...overrides }
}

describe('evaluateBasketballCourtMode', () => {
  it('passes from a basketball workout that overlaps at least 12 minutes', () => {
    const result = evaluateBasketballCourtMode(metrics({ basketballWorkoutSeconds: 720 }))

    expect(result.passed).toBe(true)
    expect(result.passedBy).toBe('workout')
    expect(result.verificationBadge).toBe('Watch Verified')
  })

  it('passes from heart-rate effort when movement is also present', () => {
    const result = evaluateBasketballCourtMode(metrics({
      heartRateCoverageSeconds: 360,
      maxHeartRate: 126,
      steps: 150,
    }))

    expect(result.passed).toBe(true)
    expect(result.passedBy).toBe('effort')
  })

  it('passes effort from resting heart-rate lift', () => {
    const result = evaluateBasketballCourtMode(metrics({
      heartRateCoverageSeconds: 420,
      avgHeartRate: 104,
      restingHeartRate: 68,
      steps: 180,
    }))

    expect(result.passed).toBe(true)
    expect(result.passedBy).toBe('effort')
  })

  it('does not pass effort from heart-rate without movement', () => {
    const result = evaluateBasketballCourtMode(metrics({
      heartRateCoverageSeconds: 500,
      maxHeartRate: 150,
      steps: 20,
    }))

    expect(result.passed).toBe(false)
    expect(result.signals.find((signal) => signal.key === 'effort')?.passed).toBe(false)
  })

  it('passes from footwork volume', () => {
    const result = evaluateBasketballCourtMode(metrics({ steps: 700 }))

    expect(result.passed).toBe(true)
    expect(result.passedBy).toBe('footwork')
  })

  it('passes from indoor movement distance only with enough steps', () => {
    const result = evaluateBasketballCourtMode(metrics({
      distanceMeters: 350,
      steps: 500,
    }))

    expect(result.passed).toBe(true)
    expect(result.passedBy).toBe('movement')
  })

  it('passes effort from active calories only when supported by steps or heart rate', () => {
    const result = evaluateBasketballCourtMode(metrics({
      activeCalories: 45,
      steps: 160,
    }))

    expect(result.passed).toBe(true)
    expect(result.passedBy).toBe('effort')
  })

  it('does not pass from calories alone', () => {
    const result = evaluateBasketballCourtMode(metrics({ activeCalories: 70 }))

    expect(result.passed).toBe(false)
  })

  it('labels phone-only metrics as Phone Motion', () => {
    const result = evaluateBasketballCourtMode(metrics({
      source: 'phone_motion',
      steps: 710,
    }))

    expect(result.passed).toBe(true)
    expect(result.verificationBadge).toBe('Phone Motion')
  })
})
