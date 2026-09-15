import { describe, expect, it } from 'vitest'
import {
  createMatchEntry,
  normalizeMatchEntryCode,
  normalizeMatchEntrySource,
  toMatchEntryParams,
} from './matchEntry'

describe('matchEntry', () => {
  it('normalizes join codes from route params', () => {
    expect(normalizeMatchEntryCode(' rly-8k2q3 ')).toBe('RLY8K2Q3')
    expect(normalizeMatchEntryCode(['rly8k2q3'])).toBe('RLY8K2Q3')
  })

  it('normalizes entry sources and aliases', () => {
    expect(normalizeMatchEntrySource('qr')).toBe('qr')
    expect(normalizeMatchEntrySource('deep-link')).toBe('share_link')
    expect(normalizeMatchEntrySource('rally_coin')).toBe('nfc_coin')
    expect(normalizeMatchEntrySource('wear os')).toBe('watch_hint')
  })

  it('uses fallback source for unknown source values', () => {
    expect(normalizeMatchEntrySource('poster', 'share_link')).toBe('share_link')
  })

  it('creates entries only for complete join codes', () => {
    expect(createMatchEntry('RLY8K2Q3', 'qr')).toEqual({ code: 'RLY8K2Q3', source: 'qr' })
    expect(createMatchEntry('RLY8', 'qr')).toBeNull()
  })

  it('returns route params for the home lobby resolver', () => {
    expect(toMatchEntryParams({ code: 'RLY8K2Q3', source: 'nfc_coin' })).toEqual({
      code: 'RLY8K2Q3',
      source: 'nfc_coin',
    })
  })
})
