import { describe, expect, it } from 'vitest'
import { proofStatusPill, resultBeatTone } from './questProofStatusPill'
import type { QuestProofSession } from './questProofTypes'
const base: QuestProofSession = { id: 's', user_id: 'u', template_id: 't', earn_period: '2026-06-30',
  status: 'passed', audit_status: null, trust_decision: null, points_granted: 30, nonce: null, challenge: null,
  sensor_summary: null, media_path: null, started_at: null, completed_at: null }
describe('proofStatusPill', () => {
  it('claimed → pass tone', () => { expect(proofStatusPill('claimed').toneKey).toBe('pass') })
  it('live_session → live tone, pulsing', () => {
    expect(proofStatusPill('live_session')).toMatchObject({ toneKey: 'live', pulse: true })
  })
  it('none → neutral', () => { expect(proofStatusPill('none').toneKey).toBe('neutral') })
})
describe('resultBeatTone', () => {
  it('passed + points → success', () => { expect(resultBeatTone(base)).toBe('success') })
  it('passed + 0 points → capped', () => { expect(resultBeatTone({ ...base, points_granted: 0 })).toBe('capped') })
  it('reward_pending → pending', () => { expect(resultBeatTone({ ...base, status: 'reward_pending' })).toBe('pending') })
  it('failed → fail', () => { expect(resultBeatTone({ ...base, status: 'failed' })).toBe('fail') })
})
