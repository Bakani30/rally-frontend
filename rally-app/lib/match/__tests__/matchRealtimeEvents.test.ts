import { describe, expect, it } from 'vitest'
import { isMatchLifecycleRealtimePayload } from '../matchRealtimeEvents'

const base = { matchId: 'm1', actorUserId: 'u1', sentAt: '2026-07-10T00:00:00Z' }

describe('isMatchLifecycleRealtimePayload', () => {
  it.each(['invited', 'invite_declined', 'position_changed', 'submitted'])(
    'accepts new kind %s',
    (kind) => {
      expect(isMatchLifecycleRealtimePayload({ ...base, kind }, 'm1')).toBe(true)
    },
  )

  it.each(['cancelled', 'started', 'settled', 'joined'])(
    'still accepts existing kind %s',
    (kind) => {
      expect(isMatchLifecycleRealtimePayload({ ...base, kind }, 'm1')).toBe(true)
    },
  )

  it('rejects unknown kind', () => {
    expect(isMatchLifecycleRealtimePayload({ ...base, kind: 'bogus' }, 'm1')).toBe(false)
  })

  it('rejects mismatched matchId', () => {
    expect(isMatchLifecycleRealtimePayload({ ...base, kind: 'invited' }, 'other')).toBe(false)
  })
})
