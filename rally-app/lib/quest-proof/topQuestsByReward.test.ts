// TDD: topQuestsByReward — sort views by rewardPoints desc, titleTH tiebreak (th locale), take n.
import { describe, expect, it } from 'vitest'
import { topQuestsByReward } from './topQuestsByReward'
import type { QuestTemplateView } from './questProofTypes'

function makeView(overrides: Partial<QuestTemplateView> & { titleTH: string; rewardPoints: number }): QuestTemplateView {
  return {
    templateId: overrides.titleTH,
    slug: overrides.titleTH,
    activity: 'running',
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

describe('topQuestsByReward', () => {
  it('returns the top n views sorted by rewardPoints descending', () => {
    const views = [
      makeView({ titleTH: 'ก', rewardPoints: 30 }),
      makeView({ titleTH: 'ข', rewardPoints: 100 }),
      makeView({ titleTH: 'ค', rewardPoints: 50 }),
      makeView({ titleTH: 'ง', rewardPoints: 20 }),
    ]
    const result = topQuestsByReward(views, 3)
    expect(result.map((v) => v.rewardPoints)).toEqual([100, 50, 30])
  })

  it('breaks ties by titleTH using th locale (ascending)', () => {
    const views = [
      makeView({ titleTH: 'ค', rewardPoints: 50 }),
      makeView({ titleTH: 'ก', rewardPoints: 50 }),
      makeView({ titleTH: 'ข', rewardPoints: 50 }),
    ]
    const result = topQuestsByReward(views, 3)
    expect(result.map((v) => v.titleTH)).toEqual(['ก', 'ข', 'ค'])
  })

  it('limits results to n', () => {
    const views = [
      makeView({ titleTH: 'ก', rewardPoints: 100 }),
      makeView({ titleTH: 'ข', rewardPoints: 80 }),
      makeView({ titleTH: 'ค', rewardPoints: 60 }),
      makeView({ titleTH: 'ง', rewardPoints: 40 }),
    ]
    expect(topQuestsByReward(views, 2)).toHaveLength(2)
  })

  it('returns fewer than n when input is shorter', () => {
    const views = [makeView({ titleTH: 'ก', rewardPoints: 50 })]
    expect(topQuestsByReward(views, 3)).toHaveLength(1)
  })

  it('returns empty array for empty input', () => {
    expect(topQuestsByReward([], 3)).toEqual([])
  })

  it('does not mutate the original array', () => {
    const views = [
      makeView({ titleTH: 'ข', rewardPoints: 50 }),
      makeView({ titleTH: 'ก', rewardPoints: 100 }),
    ]
    const original = [...views]
    topQuestsByReward(views, 2)
    expect(views[0].titleTH).toBe(original[0].titleTH)
    expect(views[1].titleTH).toBe(original[1].titleTH)
  })
})
