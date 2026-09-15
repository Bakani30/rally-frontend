import { describe, expect, it } from 'vitest'
import {
  createPartyCreateAttempt,
  isPartyNameValid,
  normalizePartyName,
} from './partyRules'

describe('partyRules', () => {
  it('accepts normalized Party names from 2 through 40 characters only', () => {
    expect(isPartyNameValid(' AB ')).toBe(true)
    expect(isPartyNameValid('A')).toBe(false)
    expect(isPartyNameValid('a'.repeat(40))).toBe(true)
    expect(isPartyNameValid('a'.repeat(41))).toBe(false)
  })

  it('normalizes Party names before sending them to the API', () => {
    expect(normalizePartyName('  Saturday   Crew  ')).toBe('Saturday Crew')
  })

  it('keeps one idempotency key across retries and rotates after completion', () => {
    const keys = ['party-attempt-1', 'party-attempt-2']
    const attempt = createPartyCreateAttempt(() => keys.shift() ?? 'fallback')

    expect(attempt.key()).toBe('party-attempt-1')
    expect(attempt.key()).toBe('party-attempt-1')
    attempt.complete()
    expect(attempt.key()).toBe('party-attempt-2')
  })
})
