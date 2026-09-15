import { describe, it, expect } from 'vitest'
import { computeInviteCooldown, INVITE_COOLDOWN_SECONDS } from '../useInviteCooldown'

describe('computeInviteCooldown', () => {
  const now = new Date('2026-06-29T00:00:15Z').getTime()

  it('returns full remaining right after invite', () => {
    expect(computeInviteCooldown('2026-06-29T00:00:14Z', now)).toEqual({
      remaining: 14,
      canInvite: false,
    })
  })

  it('canInvite once 15s elapsed', () => {
    expect(computeInviteCooldown('2026-06-29T00:00:00Z', now)).toEqual({
      remaining: 0,
      canInvite: true,
    })
  })

  it('clamps remaining at 0 when cooldown long passed', () => {
    expect(computeInviteCooldown('2026-06-28T00:00:00Z', now)).toEqual({
      remaining: 0,
      canInvite: true,
    })
  })

  it('null lastInvitedAt = can invite', () => {
    expect(computeInviteCooldown(null, now)).toEqual({ remaining: 0, canInvite: true })
  })

  it('exports the 15s constant', () => {
    expect(INVITE_COOLDOWN_SECONDS).toBe(15)
  })
})
