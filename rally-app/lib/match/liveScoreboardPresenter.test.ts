import { describe, expect, it } from 'vitest'
import { deriveQuarterPills, formatElapsedClock, sideHighlight } from '@/lib/match/liveScoreboardPresenter'

describe('liveScoreboardPresenter', () => {
  it('derives quarter pills: N ended boundaries → Q(N+1) current, capped at Q4', () => {
    expect(deriveQuarterPills([])).toEqual(['current', 'upcoming', 'upcoming', 'upcoming'])
    expect(deriveQuarterPills([{}, {}])).toEqual(['done', 'done', 'current', 'upcoming'])
    expect(deriveQuarterPills([{}, {}, {}, {}])).toEqual(['done', 'done', 'done', 'done'])
    expect(deriveQuarterPills(null)).toBeNull()
    expect(deriveQuarterPills(undefined)).toBeNull()
  })

  it('formats elapsed clock and clamps bad input to 00:00', () => {
    const start = new Date('2026-07-11T10:00:00Z').toISOString()
    expect(formatElapsedClock(start, Date.parse('2026-07-11T10:12:40Z'))).toBe('12:40')
    expect(formatElapsedClock(null, 0)).toBe('00:00')
    expect(formatElapsedClock('not-a-date', 0)).toBe('00:00')
    expect(formatElapsedClock(start, Date.parse('2026-07-11T09:00:00Z'))).toBe('00:00')
  })

  it('flags my side for scoreboard highlight', () => {
    expect(sideHighlight(0)).toEqual({ aIsMine: true, bIsMine: false })
    expect(sideHighlight(1)).toEqual({ aIsMine: false, bIsMine: true })
    expect(sideHighlight(null)).toEqual({ aIsMine: false, bIsMine: false })
  })
})
