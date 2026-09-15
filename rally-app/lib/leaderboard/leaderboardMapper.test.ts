import { describe, expect, it } from 'vitest'
import { coerceTier } from './leaderboardMapper'
import { computeTier } from './tierRules'

describe('coerceTier', () => {
  it('returns the raw tier when it is a valid Tier', () => {
    expect(coerceTier('gold', 800, 25)).toBe('gold')
  })

  it('falls back to the computed tier when raw is a stale/unknown value', () => {
    // 'master' is not a Rally Tier — a stale/unknown server value must not
    // pass through, or the profile row can diverge from the (validated)
    // leaderboard row for the same rating/matches. See leaderboardService's
    // coerceTier, which now reuses this same validated path.
    expect(coerceTier('master', 800, 25)).toBe(computeTier(800, 25))
  })

  it('falls back to the computed tier when raw is empty', () => {
    expect(coerceTier('', 800, 25)).toBe(computeTier(800, 25))
  })
})
