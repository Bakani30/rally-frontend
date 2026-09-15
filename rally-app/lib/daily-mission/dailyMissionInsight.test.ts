import { describe, expect, it } from 'vitest'
import { analyzeDailyMissionHealth } from './dailyMissionInsight'

describe('analyzeDailyMissionHealth', () => {
  it('marks 7km as goal met', () => {
    expect(analyzeDailyMissionHealth(7000, 9000).status).toBe('goal_met')
  })

  it('surfaces near goal before 7km', () => {
    expect(analyzeDailyMissionHealth(5000, 5000).status).toBe('near_goal')
  })

  it('flags high load well past the mission target', () => {
    expect(analyzeDailyMissionHealth(13000, 17000).status).toBe('high_load')
  })
})
