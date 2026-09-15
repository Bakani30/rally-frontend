import { describe, expect, it } from 'vitest'

import { deriveBasketballArchetype, resolveArchetype } from './basketballArchetype'

describe('deriveBasketballArchetype', () => {
  it('reads a dominant scorer from points relative to reference', () => {
    expect(deriveBasketballArchetype({ points: 20, rebounds: 5, assists: 3 }, null)).toBe('shooter')
  })

  it('reads a dominant playmaker from assists relative to reference', () => {
    expect(deriveBasketballArchetype({ points: 10, assists: 9, rebounds: 5 }, null)).toBe('handler')
  })

  it('reads a dominant defender from combined steals+blocks', () => {
    expect(deriveBasketballArchetype({ points: 10, rebounds: 5, steals: 6, blocks: 4 }, null)).toBe('defender')
  })

  it('reads a dominant rebounder from rebounds relative to reference', () => {
    expect(deriveBasketballArchetype({ points: 10, assists: 3, rebounds: 15 }, null)).toBe('big')
  })

  it('reads a balanced line as all_around when no lane dominates', () => {
    expect(deriveBasketballArchetype({ points: 10, rebounds: 5, assists: 3 }, null)).toBe('all_around')
  })

  it('returns null when no numeric stats are logged at all', () => {
    expect(deriveBasketballArchetype({}, null)).toBeNull()
  })

  it('reads a points-only line as the scoring role, not diluted by assumed zeroes', () => {
    expect(deriveBasketballArchetype({ points: 4 }, null)).toBe('shooter')
  })

  it('normalizes against baseline averages when available', () => {
    // Points are below the fallback reference but far above this player's own baseline.
    expect(
      deriveBasketballArchetype(
        { points: 6, rebounds: 5, assists: 3 },
        { points: 2, rebounds: 5, assists: 3 },
      ),
    ).toBe('shooter')
  })
})

describe('resolveArchetype', () => {
  it('prefers an explicitly picked role over the derived archetype', () => {
    expect(resolveArchetype({ points: 20 }, null, 'big')).toBe('big')
  })

  it('falls back to the derived archetype when no role was picked', () => {
    expect(resolveArchetype({ points: 20 }, null, null)).toBe('shooter')
    expect(resolveArchetype({ points: 20 }, null, undefined)).toBe('shooter')
  })

  it('falls back to all_around when there is nothing to derive from and no picked role', () => {
    expect(resolveArchetype({}, null, null)).toBe('all_around')
  })
})
