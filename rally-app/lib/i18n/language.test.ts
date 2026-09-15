import { describe, expect, it } from 'vitest'
import { normalizeAppLanguage } from './language'

describe('normalizeAppLanguage', () => {
  it('accepts only supported app languages', () => {
    expect(normalizeAppLanguage('th')).toBe('th')
    expect(normalizeAppLanguage('en')).toBe('en')
  })

  it('falls back to Thai for unknown or missing values', () => {
    expect(normalizeAppLanguage(null)).toBe('th')
    expect(normalizeAppLanguage(undefined)).toBe('th')
    expect(normalizeAppLanguage('fr')).toBe('th')
  })
})
