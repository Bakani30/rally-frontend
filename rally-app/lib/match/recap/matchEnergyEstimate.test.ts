import { describe, expect, it } from 'vitest'

import { earliestResultSubmissionAt, estimateMatchCalories } from './matchEnergyEstimate'

const START = '2026-07-11T10:00:00.000Z'
const END_1H = '2026-07-11T11:00:00.000Z'

describe('estimateMatchCalories', () => {
  it('computes basketball game calories (MET 8.0)', () => {
    // 8.0 × 70 kg × 1 h = 560 kcal
    expect(
      estimateMatchCalories({
        activityType: 'basketball',
        startedAt: START,
        endedAt: END_1H,
        weightKg: 70,
      }),
    ).toBe(560)
  })

  it('computes badminton calories (MET 7.0)', () => {
    // 7.0 × 60 kg × 0.5 h = 210 kcal
    expect(
      estimateMatchCalories({
        activityType: 'badminton',
        startedAt: START,
        endedAt: '2026-07-11T10:30:00.000Z',
        weightKg: 60,
      }),
    ).toBe(210)
  })

  it('returns null for unsupported activities', () => {
    expect(
      estimateMatchCalories({
        activityType: 'running',
        startedAt: START,
        endedAt: END_1H,
        weightKg: 70,
      }),
    ).toBeNull()
  })

  it('returns null when weight is missing or out of range', () => {
    const base = { activityType: 'basketball', startedAt: START, endedAt: END_1H }
    expect(estimateMatchCalories({ ...base, weightKg: null })).toBeNull()
    expect(estimateMatchCalories({ ...base, weightKg: 10 })).toBeNull()
    expect(estimateMatchCalories({ ...base, weightKg: 400 })).toBeNull()
  })

  it('returns null when timestamps are missing or unparseable', () => {
    const base = { activityType: 'basketball', weightKg: 70 }
    expect(estimateMatchCalories({ ...base, startedAt: null, endedAt: END_1H })).toBeNull()
    expect(estimateMatchCalories({ ...base, startedAt: START, endedAt: null })).toBeNull()
    expect(estimateMatchCalories({ ...base, startedAt: 'not-a-date', endedAt: END_1H })).toBeNull()
  })

  it('returns null outside the honest duration window (10 min – 4 h)', () => {
    const base = { activityType: 'basketball', weightKg: 70, startedAt: START }
    expect(
      estimateMatchCalories({ ...base, endedAt: '2026-07-11T10:05:00.000Z' }),
    ).toBeNull()
    expect(
      estimateMatchCalories({ ...base, endedAt: '2026-07-11T16:00:00.000Z' }),
    ).toBeNull()
    expect(
      estimateMatchCalories({ ...base, endedAt: '2026-07-11T09:00:00.000Z' }),
    ).toBeNull() // negative duration
  })
})

describe('earliestResultSubmissionAt', () => {
  it('picks the earliest submission timestamp', () => {
    expect(
      earliestResultSubmissionAt([
        { created_at: '2026-07-11T11:05:00.000Z' },
        { created_at: '2026-07-11T11:02:00.000Z' },
        { created_at: '2026-07-11T11:08:00.000Z' },
      ]),
    ).toBe('2026-07-11T11:02:00.000Z')
  })

  it('returns null for empty or missing lists', () => {
    expect(earliestResultSubmissionAt([])).toBeNull()
    expect(earliestResultSubmissionAt(null)).toBeNull()
    expect(earliestResultSubmissionAt(undefined)).toBeNull()
  })
})
