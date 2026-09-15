import { describe, expect, it } from 'vitest'
import { isMatchLifecycleRealtimePayload } from './matchRealtimeEvents'

const matchId = 'match-1'

function valid(overrides: Record<string, unknown> = {}) {
  return {
    matchId,
    actorUserId: 'user-1',
    kind: 'cancelled',
    sentAt: '2026-06-23T09:00:00.000Z',
    ...overrides,
  }
}

describe('isMatchLifecycleRealtimePayload', () => {
  it('accepts a well-formed cancelled event for this match', () => {
    expect(isMatchLifecycleRealtimePayload(valid(), matchId)).toBe(true)
  })

  it('accepts cancel_requested and cancel_resolved kinds', () => {
    expect(isMatchLifecycleRealtimePayload(valid({ kind: 'cancel_requested' }), matchId)).toBe(true)
    expect(isMatchLifecycleRealtimePayload(valid({ kind: 'cancel_resolved' }), matchId)).toBe(true)
  })

  it('accepts started, settled, disputed, joined and left lifecycle fast-path kinds', () => {
    expect(isMatchLifecycleRealtimePayload(valid({ kind: 'started' }), matchId)).toBe(true)
    expect(isMatchLifecycleRealtimePayload(valid({ kind: 'settled' }), matchId)).toBe(true)
    expect(isMatchLifecycleRealtimePayload(valid({ kind: 'disputed' }), matchId)).toBe(true)
    expect(isMatchLifecycleRealtimePayload(valid({ kind: 'joined' }), matchId)).toBe(true)
    expect(isMatchLifecycleRealtimePayload(valid({ kind: 'left' }), matchId)).toBe(true)
  })

  it('rejects an event addressed to a different match (no cross-room dismiss)', () => {
    expect(isMatchLifecycleRealtimePayload(valid(), 'other-match')).toBe(false)
  })

  it('rejects an unknown kind', () => {
    expect(isMatchLifecycleRealtimePayload(valid({ kind: 'exploded' }), matchId)).toBe(false)
  })

  it('rejects missing actor or timestamp', () => {
    expect(isMatchLifecycleRealtimePayload(valid({ actorUserId: undefined }), matchId)).toBe(false)
    expect(isMatchLifecycleRealtimePayload(valid({ sentAt: undefined }), matchId)).toBe(false)
  })

  it('rejects non-object payloads', () => {
    expect(isMatchLifecycleRealtimePayload(null, matchId)).toBe(false)
    expect(isMatchLifecycleRealtimePayload('cancelled', matchId)).toBe(false)
  })
})
