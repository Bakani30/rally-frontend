import { describe, expect, it } from 'vitest'
import { EdgeFunctionError } from '@/lib/supabase/edgeError'
import { getPartyErrorCode, getPartyErrorMessage } from './partyError'

describe('partyError', () => {
  it('preserves stable conflict codes from the Party API', () => {
    const error = new EdgeFunctionError('server text', { code: 'party_active_conflict', status: 409 })

    expect(getPartyErrorCode(error)).toBe('party_active_conflict')
    expect(getPartyErrorMessage(error, 'create', 'en')).toBe('You are already in another Party.')
  })

  it('maps active Arena Session blockers for leave and dissolve', () => {
    const error = new EdgeFunctionError('server text', { code: 'party_arena_session_active', status: 409 })

    expect(getPartyErrorMessage(error, 'leave', 'th')).toBe('ปาร์ตี้นี้อยู่ใน Arena Session ที่กำลังเล่นอยู่')
    expect(getPartyErrorMessage(error, 'dissolve', 'en')).toBe('This Party is already in an active Arena Session.')
  })

  it('keeps unknown errors safe and action-specific', () => {
    expect(getPartyErrorMessage(new Error('network down'), 'join', 'en')).toBe('Could not join this Party. Try again.')
  })

  it.each([
    ['create', 'Could not create this Party. Try again.'],
    ['join', 'Could not join this Party. Try again.'],
    ['leave', 'Could not leave this Party. Try again.'],
    ['dissolve', 'Could not dissolve this Party. Try again.'],
  ] as const)('maps safe fallback copy for %s', (action, expected) => {
    expect(getPartyErrorMessage(new Error('network down'), action, 'en')).toBe(expected)
  })
})
