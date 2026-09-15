import { describe, expect, it } from 'vitest'

import { remainingDailyMissionKm } from './dailyMissionProgress'

describe('remainingDailyMissionKm', () => {
  it('returns the full 7km when nothing has been walked yet', () => {
    expect(remainingDailyMissionKm(0)).toBe(7)
  })

  it('returns the remaining kilometres while below the goal', () => {
    expect(remainingDailyMissionKm(2800)).toBeCloseTo(4.2, 5)
  })

  it('clamps to 0 once the goal is met or exceeded', () => {
    expect(remainingDailyMissionKm(7000)).toBe(0)
    expect(remainingDailyMissionKm(8200)).toBe(0)
  })
})
