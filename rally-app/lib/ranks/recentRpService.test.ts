import { describe, it, expect } from 'vitest'
import {
  mapRecentRpRows,
  mapStreakResults,
  streakLabelForActivity,
  RECENT_RP_LIMIT,
} from './recentRpService'
import type { RatingHistoryRow } from './ratingHistoryRepository'

function row(partial: Partial<RatingHistoryRow> & Pick<RatingHistoryRow, 'match_id'>): RatingHistoryRow {
  return {
    activity_type: 'basketball',
    settled_at: '2026-07-01T00:00:00Z',
    rating_before: 500,
    rating_after: 524,
    rating_delta: 24,
    result: 'win',
    mode: null,
    opponent_label: null,
    ...partial,
  }
}

describe('mapRecentRpRows', () => {
  it('maps a 1v1 win with opponent title + mode subtitle', () => {
    const rows = mapRecentRpRows(
      [row({ match_id: 'm1', activity_type: 'running', mode: 'race', opponent_label: 'alice' })],
      'running',
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: 'm1',
      rpDelta: 24,
      result: 'win',
      title: 'vs alice',
      subtitle: '1v1',
    })
  })

  it('uses the mode label as title when there is no opponent (FFA)', () => {
    const rows = mapRecentRpRows(
      [row({ match_id: 'm2', activity_type: 'running', mode: 'ffa', result: 'loss', rating_delta: -11 })],
      'running',
    )
    expect(rows[0]).toMatchObject({ title: 'FFA', subtitle: null, result: 'loss', rpDelta: -11 })
  })

  it('falls back to "แมตช์" for team sports (mode null, no opponent)', () => {
    const rows = mapRecentRpRows([row({ match_id: 'm3', activity_type: 'basketball' })], 'basketball')
    expect(rows[0].title).toBe('แมตช์')
  })

  it('omits tie rows from the RP list', () => {
    const rows = mapRecentRpRows(
      [row({ match_id: 't1', result: 'tie', rating_delta: 0 })],
      'basketball',
    )
    expect(rows).toEqual([])
  })

  it('filters by activity', () => {
    const rows = mapRecentRpRows([row({ match_id: 'm4', activity_type: 'running' })], 'basketball')
    expect(rows).toEqual([])
  })

  it('caps to the limit', () => {
    const many = Array.from({ length: 12 }, (_, i) => row({ match_id: `m${i}` }))
    expect(mapRecentRpRows(many, 'basketball')).toHaveLength(RECENT_RP_LIMIT)
  })

  it('returns empty for undefined input', () => {
    expect(mapRecentRpRows(undefined, 'basketball')).toEqual([])
  })
})

describe('mapStreakResults', () => {
  it('keeps ties in the sequence, newest-first, scoped to activity', () => {
    const rows = [
      row({ match_id: 'a', activity_type: 'basketball', result: 'win' }),
      row({ match_id: 'b', activity_type: 'running', result: 'loss' }),
      row({ match_id: 'c', activity_type: 'basketball', result: 'tie' }),
    ]
    expect(mapStreakResults(rows, 'basketball')).toEqual(['win', 'tie'])
  })

  it('returns empty for undefined input', () => {
    expect(mapStreakResults(undefined, 'basketball')).toEqual([])
  })
})

describe('streakLabelForActivity', () => {
  it('computes a scoped streak label, skipping ties', () => {
    const rows = [
      row({ match_id: 'a', activity_type: 'basketball', result: 'win' }),
      row({ match_id: 'b', activity_type: 'basketball', result: 'tie' }),
      row({ match_id: 'c', activity_type: 'basketball', result: 'win' }),
    ]
    expect(streakLabelForActivity(rows, 'basketball')).toBe('W2')
  })

  it('is null when the activity has no decisive rows', () => {
    expect(streakLabelForActivity([row({ match_id: 'a', result: 'tie' })], 'basketball')).toBeNull()
  })
})
