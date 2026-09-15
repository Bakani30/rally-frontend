import { describe, expect, it } from 'vitest'
import { isQuestDone, countDone } from './questDoneState'
import type { QuestTemplateView } from './questProofTypes'
const v = (o: Partial<QuestTemplateView>): QuestTemplateView => ({
  templateId: o.templateId ?? 't', slug: 's', activity: o.activity ?? 'running', lane: 'move',
  verifier: o.verifier ?? 'sensor_sync', titleTH: '', requirementTH: '', ctaTH: '', evidenceTH: '',
  targetTH: o.targetTH ?? '',
  rewardPoints: 10, attemptsPerDay: 1, accentColor: '#000', icon: 't', timeLimitSeconds: null,
  startable: o.startable ?? false, needsCapture: false, captureMedia: null,
})
const base = { sessionStatusByTemplate: {}, healthGoalMet: false, checkedInActivities: new Set<string>() }
describe('isQuestDone', () => {
  it('capture/timed done from session status', () => {
    expect(isQuestDone(v({ templateId: 'a', verifier: 'capture_audit', startable: true }),
      { ...base, sessionStatusByTemplate: { a: 'claimed' } })).toBe(true)
    expect(isQuestDone(v({ templateId: 'a', verifier: 'capture_audit', startable: true }),
      { ...base, sessionStatusByTemplate: { a: 'failed' } })).toBe(false)
  })
  it('sensor_sync done when health goal met', () => {
    expect(isQuestDone(v({ verifier: 'sensor_sync' }), { ...base, healthGoalMet: true })).toBe(true)
    expect(isQuestDone(v({ verifier: 'sensor_sync' }), base)).toBe(false)
  })
  it('geofence done when checked in for that activity', () => {
    expect(isQuestDone(v({ verifier: 'geofence', activity: 'basketball' }),
      { ...base, checkedInActivities: new Set(['basketball']) })).toBe(true)
  })
})
describe('countDone', () => {
  it('counts across types', () => {
    const views = [v({ templateId: 'a', verifier: 'capture_audit', startable: true }), v({ verifier: 'sensor_sync' })]
    expect(countDone(views, { ...base, sessionStatusByTemplate: { a: 'passed' }, healthGoalMet: true })).toBe(2)
  })
})
