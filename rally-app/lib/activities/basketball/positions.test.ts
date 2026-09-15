import { describe, expect, it } from 'vitest'
import { BASKETBALL_POSITIONS, basketballPositionShort } from './positions'

describe('basketballPositionShort', () => {
  it('maps known keys to their abbreviation', () => {
    expect(basketballPositionShort('pg')).toBe('PG')
    expect(basketballPositionShort('sg')).toBe('SG')
    expect(basketballPositionShort('c')).toBe('C')
  })

  it('returns null for unset or unknown keys', () => {
    expect(basketballPositionShort(null)).toBeNull()
    expect(basketballPositionShort(undefined)).toBeNull()
    expect(basketballPositionShort('guard')).toBeNull()
  })

  it('exposes the five standard positions', () => {
    expect(BASKETBALL_POSITIONS.map((p) => p.key)).toEqual(['pg', 'sg', 'sf', 'pf', 'c'])
  })
})
