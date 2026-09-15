import { describe, expect, it } from 'vitest'
import {
  createRallyCoinEntry,
  normalizeRallyCoinEntrySource,
  normalizeRallyCoinPublicCode,
  toRallyCoinEntryRoute,
} from './rallyCoinEntry'

describe('rallyCoinEntry', () => {
  it('normalizes public codes from route params', () => {
    expect(normalizeRallyCoinPublicCode(' rally-01 ')).toBe('RALLY-01')
    expect(normalizeRallyCoinPublicCode(['coin_abc123'])).toBe('COIN_ABC123')
  })

  it('normalizes NFC and QR source aliases', () => {
    expect(normalizeRallyCoinEntrySource('nfc_coin')).toBe('nfc')
    expect(normalizeRallyCoinEntrySource('qr-code')).toBe('qr')
    expect(normalizeRallyCoinEntrySource('manual')).toBe('manual')
  })

  it('creates entries only for valid public codes', () => {
    expect(createRallyCoinEntry('RALLY01', 'qr')).toEqual({ publicCode: 'RALLY01', source: 'qr' })
    expect(createRallyCoinEntry('RLY', 'qr')).toBeNull()
  })

  it('returns route params for the pending login flow', () => {
    expect(toRallyCoinEntryRoute({ publicCode: 'RALLY01', source: 'nfc' })).toEqual({
      pathname: '/coin/[publicCode]',
      params: { publicCode: 'RALLY01', source: 'nfc' },
    })
  })
})
