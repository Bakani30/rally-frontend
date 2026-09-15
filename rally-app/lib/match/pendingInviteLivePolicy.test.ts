import { describe, expect, it } from 'vitest'

import { getPendingInviteFallbackInterval } from './pendingInviteLivePolicy'

describe('getPendingInviteFallbackInterval', () => {
  it('keeps Home invite live mode off interval fallback', () => {
    expect(getPendingInviteFallbackInterval({
      liveFallback: false,
      userId: 'user-1',
    })).toBe(false)
  })

  it('preserves the 15s fallback for full pending invite surfaces', () => {
    expect(getPendingInviteFallbackInterval({
      liveFallback: true,
      userId: 'user-1',
    })).toBe(15_000)
  })

  it('does not poll without a user', () => {
    expect(getPendingInviteFallbackInterval({
      liveFallback: true,
      userId: undefined,
    })).toBe(false)
  })
})
