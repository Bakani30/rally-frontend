import { describe, expect, it } from 'vitest'

import { computeStepsPercentOfDay } from './useRunDayContext'

describe('computeStepsPercentOfDay', () => {
  it('computes a rounded percent', () => {
    expect(computeStepsPercentOfDay(1234, 10000)).toBe(12)
  })

  it('clamps to 100 when run steps exceed the day total', () => {
    expect(computeStepsPercentOfDay(12000, 10000)).toBe(100)
  })

  it('is null when run steps are missing', () => {
    expect(computeStepsPercentOfDay(null, 10000)).toBeNull()
  })

  it('is null when the day total is missing', () => {
    expect(computeStepsPercentOfDay(500, null)).toBeNull()
  })

  it('is null (not 0%) when the day total is zero', () => {
    expect(computeStepsPercentOfDay(500, 0)).toBeNull()
  })

  it('is 0 when the run contributed no steps', () => {
    expect(computeStepsPercentOfDay(0, 10000)).toBe(0)
  })
})
