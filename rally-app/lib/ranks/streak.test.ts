import { describe, it, expect } from 'vitest'
import { computeStreak, STREAK_CAP } from './streak'

describe('computeStreak', () => {
  it('returns null for no results', () => {
    expect(computeStreak([])).toBeNull()
  })

  it('returns null when only ties', () => {
    expect(computeStreak(['tie', 'tie'])).toBeNull()
  })

  it('counts a consecutive win run from the most recent', () => {
    expect(computeStreak(['win', 'win', 'win', 'loss'])).toBe('W3')
  })

  it('counts a consecutive loss run', () => {
    expect(computeStreak(['loss', 'loss'])).toBe('L2')
  })

  it('breaks the run at the first opposite decisive result', () => {
    expect(computeStreak(['win', 'loss', 'win'])).toBe('W1')
  })

  it('skips ties without breaking the run', () => {
    expect(computeStreak(['win', 'tie', 'win', 'tie', 'win'])).toBe('W3')
  })

  it('skips a leading tie and takes the first decisive result as the streak kind', () => {
    expect(computeStreak(['tie', 'loss', 'loss'])).toBe('L2')
  })

  it('a tie between opposite results still breaks (opposite is decisive)', () => {
    expect(computeStreak(['win', 'tie', 'loss', 'win'])).toBe('W1')
  })

  it('caps a long win run at the cap with a "+" suffix', () => {
    const results = Array.from({ length: STREAK_CAP + 5 }, () => 'win' as const)
    expect(computeStreak(results)).toBe(`W${STREAK_CAP}+`)
  })

  it('caps a long loss run', () => {
    const results = Array.from({ length: STREAK_CAP }, () => 'loss' as const)
    expect(computeStreak(results)).toBe(`L${STREAK_CAP}+`)
  })

  it('does not add "+" just below the cap', () => {
    const results = Array.from({ length: STREAK_CAP - 1 }, () => 'win' as const)
    expect(computeStreak(results)).toBe(`W${STREAK_CAP - 1}`)
  })
})
