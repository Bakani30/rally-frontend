import { describe, expect, it } from 'vitest'
import {
  buildQuarterLines,
  buildScoreLogFromQuarters,
  formatQuarterDuration,
  normalizeQuarterBoundaries,
  quarterBoundaryFromScores,
} from './basketballQuarters'

describe('basketballQuarters', () => {
  it('reports a single in-progress quarter when no boundaries marked', () => {
    const lines = buildQuarterLines([], { 0: 12, 1: 8 }, 90_000)
    expect(lines).toEqual([
      { period: 1, label: 'Q1', side0: 12, side1: 8, durationMs: 90_000, isCurrent: true },
    ])
  })

  it('derives per-quarter point and duration deltas from cumulative boundaries', () => {
    const boundaries = [
      { side0: 12, side1: 8, elapsedMs: 600_000 }, // end of Q1 at 10:00
      { side0: 27, side1: 22, elapsedMs: 1_200_000 }, // end of Q2 at 20:00
    ]
    const lines = buildQuarterLines(boundaries, { 0: 42, 1: 38 }, 1_500_000)
    expect(lines).toEqual([
      { period: 1, label: 'Q1', side0: 12, side1: 8, durationMs: 600_000, isCurrent: false },
      { period: 2, label: 'Q2', side0: 15, side1: 14, durationMs: 600_000, isCurrent: false },
      { period: 3, label: 'Q3', side0: 15, side1: 16, durationMs: 300_000, isCurrent: true },
    ])
  })

  it('never produces negative quarter points or duration', () => {
    const lines = buildQuarterLines([{ side0: 10, side1: 5, elapsedMs: 5_000 }], { 0: 8, 1: 5 }, 4_000)
    expect(lines[1]).toMatchObject({ period: 2, side0: 0, side1: 0, durationMs: 0, isCurrent: true })
  })

  it('builds a points-only score_log that closes the current quarter', () => {
    const log = buildScoreLogFromQuarters(
      [{ side0: 12, side1: 8, elapsedMs: 600_000 }],
      { 0: 27, 1: 22 },
    )
    expect(log).toEqual([
      { period: 1, side_0: 12, side_1: 8, label: 'Q1' },
      { period: 2, side_0: 15, side_1: 14, label: 'Q2' },
    ])
  })

  it('snapshots scores + elapsed time into a boundary', () => {
    expect(quarterBoundaryFromScores({ 0: 21, 1: 19 }, 480_000)).toEqual({
      side0: 21,
      side1: 19,
      elapsedMs: 480_000,
    })
  })

  it('formats quarter duration as mm:ss', () => {
    expect(formatQuarterDuration(0)).toBe('00:00')
    expect(formatQuarterDuration(65_000)).toBe('01:05')
    expect(formatQuarterDuration(600_000)).toBe('10:00')
  })

  it('normalizes server jsonb boundaries and drops malformed entries', () => {
    expect(normalizeQuarterBoundaries(null)).toEqual([])
    expect(normalizeQuarterBoundaries('nope')).toEqual([])
    expect(normalizeQuarterBoundaries([
      { side0: 12, side1: 8, elapsedMs: 600_000 },
      { side0: '7', side1: -3, elapsedMs: 1_200_000.9 },
      'garbage',
      null,
    ])).toEqual([
      { side0: 12, side1: 8, elapsedMs: 600_000 },
      { side0: 7, side1: 0, elapsedMs: 1_200_000 },
    ])
  })

  it('caps normalized boundaries at 19 entries', () => {
    const input = Array.from({ length: 25 }, (_, index) => ({ side0: index, side1: 0, elapsedMs: index }))
    expect(normalizeQuarterBoundaries(input)).toHaveLength(19)
  })
})
