import { describe, expect, it } from 'vitest'
import { groupByLane } from './questLaneGrouping'
import type { QuestTemplateView } from './questProofTypes'

function view(over: Partial<QuestTemplateView>): QuestTemplateView {
  return {
    templateId: over.templateId ?? 't', slug: over.slug ?? 's',
    activity: over.activity ?? 'basketball', lane: over.lane ?? 'practice',
    verifier: over.verifier ?? 'capture_audit', titleTH: over.titleTH ?? 'ก',
    requirementTH: '', ctaTH: '', evidenceTH: '', targetTH: over.targetTH ?? '',
    rewardPoints: over.rewardPoints ?? 10,
    attemptsPerDay: 1, accentColor: '#000', icon: 'trophy',
    timeLimitSeconds: null, startable: true, needsCapture: false, captureMedia: null,
  }
}

describe('groupByLane', () => {
  it('orders lanes move→explore→practice and drops empty lanes', () => {
    const out = groupByLane([view({ lane: 'practice' }), view({ lane: 'move' })])
    expect(out.map((s) => s.lane)).toEqual(['move', 'practice'])
  })
  it('sorts within a lane by reward desc then title asc', () => {
    const out = groupByLane([
      view({ lane: 'move', rewardPoints: 20, titleTH: 'ข' }),
      view({ lane: 'move', rewardPoints: 50, titleTH: 'ก' }),
      view({ lane: 'move', rewardPoints: 20, titleTH: 'ก' }),
    ])
    expect(out[0].views.map((v) => [v.rewardPoints, v.titleTH])).toEqual([[50, 'ก'], [20, 'ก'], [20, 'ข']])
  })
  it('labels lanes in Thai', () => {
    expect(groupByLane([view({ lane: 'explore' })])[0].labelTH).toBe('สำรวจ')
  })
})
