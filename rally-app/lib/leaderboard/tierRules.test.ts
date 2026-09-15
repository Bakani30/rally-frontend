import { describe, expect, it } from 'vitest'
import { computeTier, nextTierProgress, TIER_THRESHOLDS } from './tierRules'

const SQL_THRESHOLDS = [
  ['challenger', 1350, 60], ['immortal', 1200, 40], ['diamond', 1050, 40],
  ['platinum', 900, 30], ['gold', 750, 20], ['silver', 600, 10], ['bronze', 0, 0],
] as const

describe('tierRules', () => {
  it('mirrors SQL thresholds exactly (snapshot vs migration 20260705100500)', () => {
    expect(TIER_THRESHOLDS.map((t) => [t.tier, t.minRating, t.minMatches])).toEqual(
      SQL_THRESHOLDS.map((r) => [...r]),
    )
  })

  it('boundary: 1350/60 → challenger, 1350/59 → immortal, 1349/60 → immortal', () => {
    expect(computeTier(1350, 60)).toBe('challenger')
    expect(computeTier(1350, 59)).toBe('immortal')
    expect(computeTier(1349, 60)).toBe('immortal')
  })

  it('computeTier falls back to bronze below every threshold', () => {
    expect(computeTier(0, 0)).toBe('bronze')
  })

  it('nextTierProgress reports challenger has no next tier', () => {
    expect(nextTierProgress(1350, 60)).toEqual({ next: null, ratingNeeded: 0, matchesNeeded: 0 })
  })

  it('nextTierProgress reports immortal→challenger gap', () => {
    expect(nextTierProgress(1200, 40)).toEqual({
      next: 'challenger',
      ratingNeeded: 150,
      matchesNeeded: 20,
    })
  })
})
