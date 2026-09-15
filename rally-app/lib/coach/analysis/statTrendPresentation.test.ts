import { describe, expect, it } from 'vitest'

import type { CoachStatTrend, CoachStatTrendBucket } from '@/lib/coach/coachTypes'
import { buildStatTrendRows } from './statTrendPresentation'

function bucket(over: Partial<CoachStatTrendBucket> = {}): CoachStatTrendBucket {
  return {
    bucketStart: '2026-07-06T00:00:00.000Z',
    matches: 2,
    averages: { points: 12, rebounds: 5, assists: 3, steals: 1, blocks: 1 },
    ...over,
  }
}

describe('buildStatTrendRows', () => {
  it('labels weekly rows with ISO week numbers', () => {
    const trend: CoachStatTrend = {
      weekly: [bucket({ bucketStart: '2026-07-06T00:00:00.000Z' })],
      monthly: [],
    }
    const rows = buildStatTrendRows(trend, 'weekly', 'en')
    expect(rows[0].label).toBe('W28')
  })

  it('labels monthly rows with short month names per language', () => {
    const trend: CoachStatTrend = {
      weekly: [],
      monthly: [bucket({ bucketStart: '2026-07-06T00:00:00.000Z' })],
    }
    expect(buildStatTrendRows(trend, 'monthly', 'en')[0].label).toBe('Jul')
    expect(buildStatTrendRows(trend, 'monthly', 'th')[0].label).toBe('ก.ค.')
  })

  it('labels monthly rows by UTC month, not local time, at a month boundary', () => {
    // Midnight UTC on the 1st: any negative-offset local timezone would read
    // this as the last day of the previous month if the label used
    // getMonth() instead of getUTCMonth().
    const trend: CoachStatTrend = {
      weekly: [],
      monthly: [bucket({ bucketStart: '2026-08-01T00:00:00.000Z' })],
    }
    expect(buildStatTrendRows(trend, 'monthly', 'en')[0].label).toBe('Aug')
  })

  it('computes pointsDelta against the previous bucket, oldest to newest', () => {
    const trend: CoachStatTrend = {
      weekly: [
        bucket({ bucketStart: '2026-06-22T00:00:00.000Z', averages: { points: 8, rebounds: 4, assists: 2, steals: 1, blocks: 0 } }),
        bucket({ bucketStart: '2026-06-29T00:00:00.000Z', averages: { points: 12, rebounds: 5, assists: 3, steals: 1, blocks: 1 } }),
      ],
      monthly: [],
    }
    const rows = buildStatTrendRows(trend, 'weekly', 'en')
    expect(rows.map((r) => r.key)).toEqual(['2026-06-22T00:00:00.000Z', '2026-06-29T00:00:00.000Z'])
    expect(rows[0].pointsDelta).toBeNull()
    expect(rows[1].pointsDelta).toBe(4)
  })

  it('formats a missing stat as an em dash', () => {
    const trend: CoachStatTrend = {
      weekly: [bucket({ averages: { points: null, rebounds: 5, assists: 3, steals: 1, blocks: 1 } })],
      monthly: [],
    }
    const rows = buildStatTrendRows(trend, 'weekly', 'en')
    expect(rows[0].points).toBe('—')
    expect(rows[0].pointsDelta).toBeNull()
    expect(rows[0].rebounds).toBe('5.0')
  })

  it('handles fewer than 2 buckets without crashing', () => {
    const empty = buildStatTrendRows({ weekly: [], monthly: [] }, 'weekly', 'en')
    expect(empty).toEqual([])

    const single = buildStatTrendRows({ weekly: [bucket()], monthly: [] }, 'weekly', 'en')
    expect(single).toHaveLength(1)
    expect(single[0].pointsDelta).toBeNull()
  })
})
