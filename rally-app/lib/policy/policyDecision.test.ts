import { describe, expect, it } from 'vitest'

import {
  allowPolicy,
  denyPolicy,
  policyFromBoolean,
  requireAllowedPolicy,
} from './policyDecision'

describe('policyDecision', () => {
  it('creates a stable allowed decision for UI gates and buttons', () => {
    expect(allowPolicy({ cta: 'START' })).toEqual({
      allowed: true,
      cta: 'START',
    })
  })

  it('creates a stable denied decision with machine-readable reason and UI hint', () => {
    expect(denyPolicy('waiting_for_opponent_consent', {
      cta: 'Wait for opponent',
      message: 'Opponent must accept before this action unlocks.',
    })).toEqual({
      allowed: false,
      reason: 'waiting_for_opponent_consent',
      cta: 'Wait for opponent',
      message: 'Opponent must accept before this action unlocks.',
    })
  })

  it('maps legacy booleans into the same decision shape', () => {
    expect(policyFromBoolean(true, 'not_ready')).toEqual({ allowed: true })
    expect(policyFromBoolean(false, 'not_ready')).toEqual({
      allowed: false,
      reason: 'not_ready',
    })
  })

  it('narrows allowed decisions for render-prop gate usage', () => {
    const allowed = requireAllowedPolicy(allowPolicy({ cta: 'JOIN' }))
    const denied = requireAllowedPolicy(denyPolicy('already_joined'))

    expect(allowed).toEqual({ allowed: true, cta: 'JOIN' })
    expect(denied).toBeNull()
  })
})
