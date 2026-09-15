import { describe, expect, it } from 'vitest'
import { winRatePercent } from './leaderboardStats'

describe('winRatePercent', () => {
  it('returns null with no decisive matches', () => {
    expect(winRatePercent(0, 0)).toBeNull()
  })

  it('ignores ties (only wins + losses count as decisive)', () => {
    // 3 wins, 1 loss -> 75%, regardless of how many ties happened.
    expect(winRatePercent(3, 1)).toBe(75)
  })

  it('rounds to a whole percentage', () => {
    expect(winRatePercent(1, 2)).toBe(33)
    expect(winRatePercent(2, 1)).toBe(67)
  })

  it('handles 100% and 0%', () => {
    expect(winRatePercent(5, 0)).toBe(100)
    expect(winRatePercent(0, 4)).toBe(0)
  })
})
