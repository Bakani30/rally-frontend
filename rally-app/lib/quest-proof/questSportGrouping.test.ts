import { describe, expect, it } from 'vitest'
import { groupBySport } from './questSportGrouping'
import type { QuestTemplateView } from './questProofTypes'
const v = (o: Partial<QuestTemplateView>): QuestTemplateView => ({
  templateId: o.templateId ?? 't', slug: 's', activity: o.activity ?? 'basketball', lane: 'practice',
  verifier: o.verifier ?? 'capture_audit', titleTH: o.titleTH ?? 'ก', requirementTH: '', ctaTH: '', evidenceTH: '',
  targetTH: o.targetTH ?? '',
  rewardPoints: o.rewardPoints ?? 10, attemptsPerDay: 1, accentColor: '#000', icon: 't',
  timeLimitSeconds: null, startable: true, needsCapture: false, captureMedia: null,
})
describe('groupBySport', () => {
  it('orders running→basketball→badminton, drops empty', () => {
    const out = groupBySport([v({ activity: 'badminton' }), v({ activity: 'running' })])
    expect(out.map((s) => s.activity)).toEqual(['running', 'badminton'])
  })
  it('sorts within sport by reward desc then title asc', () => {
    const out = groupBySport([
      v({ activity: 'running', rewardPoints: 20, titleTH: 'ข' }),
      v({ activity: 'running', rewardPoints: 50, titleTH: 'ก' }),
      v({ activity: 'running', rewardPoints: 20, titleTH: 'ก' }),
    ])
    expect(out[0].views.map((x) => [x.rewardPoints, x.titleTH])).toEqual([[50, 'ก'], [20, 'ก'], [20, 'ข']])
  })
  it('labels sports in Thai', () => {
    expect(groupBySport([v({ activity: 'running' })])[0].labelTH).toBe('วิ่ง')
    expect(groupBySport([v({ activity: 'basketball' })])[0].labelTH).toBe('บาส')
    expect(groupBySport([v({ activity: 'badminton' })])[0].labelTH).toBe('แบด')
  })
})
