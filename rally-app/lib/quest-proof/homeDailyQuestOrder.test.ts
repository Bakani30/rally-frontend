// TDD: homeDailyQuestOrder — running quests first, then rewardPoints desc, titleTH tiebreak (th locale), take n.
import { describe, expect, it } from 'vitest'
import { homeDailyQuestOrder } from './homeDailyQuestOrder'
import type { QuestTemplateView } from './questProofTypes'

function makeView(
  overrides: Partial<QuestTemplateView> & { titleTH: string; rewardPoints: number },
): QuestTemplateView {
  return {
    templateId: overrides.titleTH,
    slug: overrides.titleTH,
    activity: 'basketball',
    lane: 'move',
    verifier: 'sensor_sync',
    requirementTH: '',
    ctaTH: '',
    evidenceTH: '',
    targetTH: '',
    attemptsPerDay: 1,
    accentColor: '#CEF17B',
    icon: 'basketball',
    timeLimitSeconds: null,
    startable: false,
    needsCapture: false,
    captureMedia: null,
    ...overrides,
  }
}

describe('homeDailyQuestOrder', () => {
  it('returns empty array for empty input', () => {
    expect(homeDailyQuestOrder([], 3)).toEqual([])
  })

  it('puts running quests before non-running regardless of rewardPoints', () => {
    const views = [
      makeView({ titleTH: 'บาส', rewardPoints: 100, activity: 'basketball' }),
      makeView({ titleTH: 'วิ่ง', rewardPoints: 30, activity: 'running' }),
      makeView({ titleTH: 'แบด', rewardPoints: 80, activity: 'badminton' }),
    ]
    const result = homeDailyQuestOrder(views, 3)
    expect(result[0].activity).toBe('running')
    expect(result[0].titleTH).toBe('วิ่ง')
  })

  it('sorts running quests by rewardPoints desc within the running group', () => {
    const views = [
      makeView({ titleTH: 'วิ่งก', rewardPoints: 30, activity: 'running' }),
      makeView({ titleTH: 'วิ่งข', rewardPoints: 100, activity: 'running' }),
      makeView({ titleTH: 'วิ่งค', rewardPoints: 60, activity: 'running' }),
    ]
    const result = homeDailyQuestOrder(views, 3)
    expect(result.map((v) => v.rewardPoints)).toEqual([100, 60, 30])
    expect(result.every((v) => v.activity === 'running')).toBe(true)
  })

  it('sorts non-running quests by rewardPoints desc within the non-running group', () => {
    const views = [
      makeView({ titleTH: 'บาสก', rewardPoints: 20, activity: 'basketball' }),
      makeView({ titleTH: 'แบดข', rewardPoints: 90, activity: 'badminton' }),
      makeView({ titleTH: 'บาสค', rewardPoints: 50, activity: 'basketball' }),
    ]
    const result = homeDailyQuestOrder(views, 3)
    expect(result.map((v) => v.rewardPoints)).toEqual([90, 50, 20])
  })

  it('applies titleTH th-locale tiebreak when rewardPoints are equal (non-running)', () => {
    const views = [
      makeView({ titleTH: 'ค', rewardPoints: 50 }),
      makeView({ titleTH: 'ก', rewardPoints: 50 }),
      makeView({ titleTH: 'ข', rewardPoints: 50 }),
    ]
    const result = homeDailyQuestOrder(views, 3)
    expect(result.map((v) => v.titleTH)).toEqual(['ก', 'ข', 'ค'])
  })

  it('applies titleTH th-locale tiebreak within the running group', () => {
    const views = [
      makeView({ titleTH: 'วิ่งค', rewardPoints: 50, activity: 'running' }),
      makeView({ titleTH: 'วิ่งก', rewardPoints: 50, activity: 'running' }),
      makeView({ titleTH: 'วิ่งข', rewardPoints: 50, activity: 'running' }),
    ]
    const result = homeDailyQuestOrder(views, 3)
    expect(result.map((v) => v.titleTH)).toEqual(['วิ่งก', 'วิ่งข', 'วิ่งค'])
  })

  it('limits results to n', () => {
    const views = [
      makeView({ titleTH: 'ก', rewardPoints: 100, activity: 'running' }),
      makeView({ titleTH: 'ข', rewardPoints: 80, activity: 'basketball' }),
      makeView({ titleTH: 'ค', rewardPoints: 60, activity: 'basketball' }),
      makeView({ titleTH: 'ง', rewardPoints: 40, activity: 'badminton' }),
    ]
    expect(homeDailyQuestOrder(views, 2)).toHaveLength(2)
  })

  it('returns fewer than n when input is shorter', () => {
    const views = [makeView({ titleTH: 'ก', rewardPoints: 50, activity: 'running' })]
    expect(homeDailyQuestOrder(views, 3)).toHaveLength(1)
  })

  it('does not mutate the original array', () => {
    const views = [
      makeView({ titleTH: 'ข', rewardPoints: 50, activity: 'basketball' }),
      makeView({ titleTH: 'ก', rewardPoints: 100, activity: 'running' }),
    ]
    const firstTitle = views[0].titleTH
    const secondTitle = views[1].titleTH
    homeDailyQuestOrder(views, 2)
    expect(views[0].titleTH).toBe(firstTitle)
    expect(views[1].titleTH).toBe(secondTitle)
  })
})
