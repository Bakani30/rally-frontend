import { describe, expect, it } from 'vitest'
import {
  bangkokDate,
  bangkokDateDaysAgo,
  effectiveStreakDays,
  getCheckinStreakProgress,
  isStreakStillActive,
} from './profileStreak'

const NOW = new Date('2026-05-12T10:00:00.000Z')

describe('profile streak display', () => {
  it('keeps a streak active after checking in today', () => {
    expect(effectiveStreakDays(4, '2026-05-12', NOW)).toBe(4)
  })

  it('keeps a streak active during the grace day before the next check-in', () => {
    expect(isStreakStillActive('2026-05-11', NOW)).toBe(true)
    expect(effectiveStreakDays(4, '2026-05-11', NOW)).toBe(4)
  })

  it('resets the displayed fire count once the streak is broken', () => {
    expect(isStreakStillActive('2026-05-10', NOW)).toBe(false)
    expect(effectiveStreakDays(4, '2026-05-10', NOW)).toBe(0)
  })

  it('uses Bangkok dates instead of the device locale day', () => {
    const justAfterBangkokMidnight = new Date('2026-05-11T17:10:00.000Z')
    expect(bangkokDate(justAfterBangkokMidnight)).toBe('2026-05-12')
    expect(bangkokDateDaysAgo(1, justAfterBangkokMidnight)).toBe('2026-05-11')
  })

  it('shows the first streak milestone target for a new check-in stack', () => {
    expect(getCheckinStreakProgress(0)).toMatchObject({
      cycleDay: 0,
      currentLevel: 1,
      levelLabel: 'Warm-up',
      nextMilestone: { cycleDay: 7, rewardPoints: 50 },
      nextMilestoneStreak: 7,
      daysToNextMilestone: 7,
      progressRatio: 0,
    })
  })

  it('marks day 7 and day 15 as visible streak level gates', () => {
    expect(getCheckinStreakProgress(7)).toMatchObject({
      cycleDay: 7,
      currentLevel: 2,
      reachedMilestone: { cycleDay: 7, rewardPoints: 50 },
      nextMilestone: { cycleDay: 15, rewardPoints: 50 },
      nextMilestoneStreak: 15,
      daysToNextMilestone: 8,
    })

    expect(getCheckinStreakProgress(15)).toMatchObject({
      cycleDay: 15,
      currentLevel: 3,
      reachedMilestone: { cycleDay: 15, rewardPoints: 50 },
      nextMilestone: { cycleDay: 30, rewardPoints: 150 },
      nextMilestoneStreak: 30,
      daysToNextMilestone: 15,
    })
  })

  it('treats day 30 as cycle clear and targets day 37 next', () => {
    expect(getCheckinStreakProgress(30)).toMatchObject({
      cycleDay: 30,
      currentLevel: 4,
      levelLabel: 'Cycle clear',
      reachedMilestone: { cycleDay: 30, rewardPoints: 150 },
      nextMilestone: { cycleDay: 7, rewardPoints: 50 },
      nextMilestoneStreak: 37,
      daysToNextMilestone: 7,
      progressRatio: 1,
    })
  })
})
