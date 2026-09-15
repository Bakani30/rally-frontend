import { describe, expect, it } from 'vitest'

import { isValidUsername, normalizeUsernameInput } from './usernameInput'

describe('normalizeUsernameInput', () => {
  it('preserves case (does NOT lowercase) — signup must allow uppercase', () => {
    expect(normalizeUsernameInput('CTO_99')).toBe('CTO_99')
    expect(normalizeUsernameInput('RallyKing')).toBe('RallyKing')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeUsernameInput('  Ace_01  ')).toBe('Ace_01')
  })
})

describe('isValidUsername', () => {
  it('accepts uppercase, lowercase, digits and underscore', () => {
    expect(isValidUsername('CTO')).toBe(true)
    expect(isValidUsername('Rally_King_99')).toBe(true)
    expect(isValidUsername('abc')).toBe(true)
  })

  it('validates the trimmed value', () => {
    expect(isValidUsername('  CTO  ')).toBe(true)
  })

  it('rejects too short / too long / illegal characters', () => {
    expect(isValidUsername('ab')).toBe(false)
    expect(isValidUsername('a'.repeat(21))).toBe(false)
    expect(isValidUsername('bad name')).toBe(false)
    expect(isValidUsername('emoji😀')).toBe(false)
  })
})
