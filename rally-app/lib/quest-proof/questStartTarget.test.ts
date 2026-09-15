// rally-app/lib/quest-proof/questStartTarget.test.ts
import { describe, expect, it } from 'vitest'
import { resolveStartTarget } from './questStartTarget'
import type { QuestTemplateView } from './questProofTypes'
const v = (verifier: QuestTemplateView['verifier'], needsCapture = false): QuestTemplateView =>
  ({ templateId: 't', slug: 's', activity: 'basketball', lane: 'practice', verifier,
     titleTH: '', requirementTH: '', ctaTH: '', evidenceTH: '', targetTH: '', rewardPoints: 0, attemptsPerDay: 1,
     accentColor: '#000', icon: 't', timeLimitSeconds: null, startable: verifier !== 'sensor_sync' && verifier !== 'geofence',
     needsCapture, captureMedia: null })
describe('resolveStartTarget', () => {
  it('capture_audit → start_session needsCapture', () => {
    expect(resolveStartTarget(v('capture_audit', true))).toEqual({ kind: 'start_session', needsCapture: true })
  })
  it('timed_sensor → start_session no capture', () => {
    expect(resolveStartTarget(v('timed_sensor'))).toEqual({ kind: 'start_session', needsCapture: false })
  })
  it('sensor_sync → inline daily-mission', () => {
    expect(resolveStartTarget(v('sensor_sync'))).toEqual({ kind: 'inline_daily_mission' })
  })
  it('geofence → external map-quest', () => {
    expect(resolveStartTarget(v('geofence'))).toEqual({ kind: 'external', route: '/map-quest' })
  })
  it('unknown verifier → inline daily-mission (default)', () => {
    expect(resolveStartTarget(v('unknown_future_type' as never))).toEqual({ kind: 'inline_daily_mission' })
  })
})
