import { describe, expect, it } from 'vitest'
import { mapDailyState } from './questDailyState'
import type { QuestProofSession } from './questProofTypes'

function sess(over: Partial<QuestProofSession>): QuestProofSession {
  return {
    id: over.id ?? 's', user_id: 'u', template_id: over.template_id ?? 't',
    earn_period: '2026-06-30', status: over.status ?? 'live_session',
    audit_status: null, trust_decision: null, points_granted: null, nonce: null,
    challenge: null, sensor_summary: null, media_path: null,
    started_at: over.started_at ?? '2026-06-30T01:00:00Z', completed_at: null,
  }
}

describe('mapDailyState', () => {
  it('marks passed/reward_pending/claimed as doneToday', () => {
    const m = mapDailyState([sess({ template_id: 'a', status: 'claimed' }), sess({ template_id: 'b', status: 'failed' })])
    expect(m.a.doneToday).toBe(true)
    expect(m.b.doneToday).toBe(false)
  })
  it('keeps the latest session status per template and counts attempts', () => {
    const m = mapDailyState([
      sess({ template_id: 'a', status: 'failed', started_at: '2026-06-30T01:00:00Z' }),
      sess({ template_id: 'a', status: 'passed', started_at: '2026-06-30T02:00:00Z' }),
    ])
    expect(m.a.status).toBe('passed')
    expect(m.a.attemptsUsed).toBe(2)
    expect(m.a.grantedToday).toBe(1)
  })
  it('counts only granted sessions toward grantedToday — free retries do not count', () => {
    const m = mapDailyState([
      sess({ template_id: 'a', status: 'live_session' }),
      sess({ template_id: 'a', status: 'voided', started_at: '2026-06-30T02:00:00Z' }),
    ])
    expect(m.a.grantedToday).toBe(0)
    expect(m.a.doneToday).toBe(false)
  })
  it('stays doneToday after a later free session when points were already granted', () => {
    const m = mapDailyState([
      sess({ template_id: 'a', status: 'claimed', started_at: '2026-06-30T01:00:00Z' }),
      sess({ template_id: 'a', status: 'live_session', started_at: '2026-06-30T02:00:00Z' }),
    ])
    expect(m.a.doneToday).toBe(true)
    expect(m.a.grantedToday).toBe(1)
  })
})
