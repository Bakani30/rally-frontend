import { describe, expect, it } from 'vitest'

import { buildBirthDatePayload, parseBirthDateParts } from './birthDate'

describe('buildBirthDatePayload', () => {
  it('returns null when both empty', () => {
    expect(buildBirthDatePayload('', '')).toBeNull()
  })
  it('builds YYYY-MM-01 with zero-padded month', () => {
    expect(buildBirthDatePayload('1994', '3')).toBe('1994-03-01')
  })
  it('keeps two-digit month', () => {
    expect(buildBirthDatePayload('2000', '12')).toBe('2000-12-01')
  })
  it('returns undefined (omit, leave unchanged) when only year given', () => {
    expect(buildBirthDatePayload('1994', '')).toBeUndefined()
  })
  it('returns undefined (omit, leave unchanged) when only month given', () => {
    expect(buildBirthDatePayload('', '5')).toBeUndefined()
  })
  it('throws on out-of-range month', () => {
    expect(() => buildBirthDatePayload('1994', '13')).toThrow()
  })
  it('throws on out-of-range year', () => {
    expect(() => buildBirthDatePayload('1800', '5')).toThrow()
  })
})

describe('parseBirthDateParts', () => {
  it('parses birthDate into year and month', () => {
    expect(parseBirthDateParts('1994-03-01', 1994)).toEqual({ year: '1994', month: '3' })
  })
  it('falls back to birthYear when no birthDate', () => {
    expect(parseBirthDateParts(null, 1994)).toEqual({ year: '1994', month: '' })
  })
  it('returns empty strings when nothing set', () => {
    expect(parseBirthDateParts(null, null)).toEqual({ year: '', month: '' })
  })
})
