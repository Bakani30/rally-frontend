// TDD: topQuestPerSport — one quest per sport section, running→basketball→badminton order.
import { describe, expect, it } from 'vitest'
import { topQuestPerSport } from './topQuestPerSport'
import type { QuestTemplateView } from './questProofTypes'

function makeView(
  overrides: Partial<QuestTemplateView> & {
    titleTH: string
    rewardPoints: number
    activity: QuestTemplateView['activity']
  },
): QuestTemplateView {
  return {
    templateId: overrides.titleTH,
    slug: overrides.titleTH,
    lane: 'move',
    verifier: 'sensor_sync',
    requirementTH: '',
    ctaTH: '',
    evidenceTH: '',
    targetTH: '',
    attemptsPerDay: 1,
    accentColor: '#CEF17B',
    icon: 'run',
    timeLimitSeconds: null,
    startable: false,
    needsCapture: false,
    captureMedia: null,
    ...overrides,
  }
}

describe('topQuestPerSport', () => {
  it('returns empty array for empty input', () => {
    expect(topQuestPerSport([])).toEqual([])
  })

  it('returns one quest per sport in running→basketball→badminton order', () => {
    const views = [
      makeView({ titleTH: 'บาส-ต่ำ', rewardPoints: 30, activity: 'basketball' }),
      makeView({ titleTH: 'วิ่ง-สูง', rewardPoints: 50, activity: 'running' }),
      makeView({ titleTH: 'วิ่ง-ต่ำ', rewardPoints: 20, activity: 'running' }),
      makeView({ titleTH: 'แบด-สูง', rewardPoints: 60, activity: 'badminton' }),
      makeView({ titleTH: 'บาส-สูง', rewardPoints: 80, activity: 'basketball' }),
    ]
    const result = topQuestPerSport(views)
    expect(result).toHaveLength(3)
    expect(result[0].activity).toBe('running')
    expect(result[1].activity).toBe('basketball')
    expect(result[2].activity).toBe('badminton')
  })

  it('picks the highest-reward quest for each sport', () => {
    const views = [
      makeView({ titleTH: 'วิ่ง-ต่ำ', rewardPoints: 20, activity: 'running' }),
      makeView({ titleTH: 'วิ่ง-สูง', rewardPoints: 50, activity: 'running' }),
      makeView({ titleTH: 'บาส-ต่ำ', rewardPoints: 30, activity: 'basketball' }),
      makeView({ titleTH: 'บาส-สูง', rewardPoints: 80, activity: 'basketball' }),
    ]
    const result = topQuestPerSport(views)
    expect(result).toHaveLength(2)
    expect(result[0].titleTH).toBe('วิ่ง-สูง')
    expect(result[1].titleTH).toBe('บาส-สูง')
  })

  it('skips sports with no quests (returns only present sports)', () => {
    const views = [
      makeView({ titleTH: 'วิ่ง', rewardPoints: 50, activity: 'running' }),
      makeView({ titleTH: 'แบด', rewardPoints: 40, activity: 'badminton' }),
    ]
    const result = topQuestPerSport(views)
    expect(result).toHaveLength(2)
    expect(result[0].activity).toBe('running')
    expect(result[1].activity).toBe('badminton')
  })

  it('returns running first even when basketball has higher reward', () => {
    const views = [
      makeView({ titleTH: 'บาส', rewardPoints: 100, activity: 'basketball' }),
      makeView({ titleTH: 'วิ่ง', rewardPoints: 10, activity: 'running' }),
      makeView({ titleTH: 'แบด', rewardPoints: 50, activity: 'badminton' }),
    ]
    const result = topQuestPerSport(views)
    expect(result[0].activity).toBe('running')
  })

  it('returns a single card when only one sport is present', () => {
    const views = [
      makeView({ titleTH: 'บาส-ก', rewardPoints: 40, activity: 'basketball' }),
      makeView({ titleTH: 'บาส-ข', rewardPoints: 70, activity: 'basketball' }),
    ]
    const result = topQuestPerSport(views)
    expect(result).toHaveLength(1)
    expect(result[0].activity).toBe('basketball')
    expect(result[0].rewardPoints).toBe(70)
  })

  it('does not mutate the input array', () => {
    const views = [
      makeView({ titleTH: 'บาส', rewardPoints: 100, activity: 'basketball' }),
      makeView({ titleTH: 'วิ่ง', rewardPoints: 10, activity: 'running' }),
    ]
    const origFirst = views[0].titleTH
    const origSecond = views[1].titleTH
    topQuestPerSport(views)
    expect(views[0].titleTH).toBe(origFirst)
    expect(views[1].titleTH).toBe(origSecond)
  })
})
