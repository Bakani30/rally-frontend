import { describe, expect, it } from 'vitest'

import {
  getNewMatchHistoryRows,
  getNewMatchRatingPreview,
} from './newMatchPreview'
import type { MatchTeamResultSubmission, MyMatch } from '@/types/match'

function teamSubmission(
  side: 0 | 1,
  score: number,
  updatedAt = '2026-06-14T00:00:00.000Z',
): MatchTeamResultSubmission {
  return {
    id: `score-${side}-${score}`,
    side_index: side,
    submitted_by: side === 0 ? 'user-a' : 'user-b',
    team_score: score,
    notes: null,
    proof_urls: [],
    accepted_by: null,
    accepted_at: null,
    created_at: updatedAt,
    updated_at: updatedAt,
  }
}

function match(overrides: Partial<MyMatch> = {}): MyMatch {
  return {
    id: 'match-1',
    created_by: 'user-a',
    activity_type: 'basketball',
    stake: 24,
    stake_currency: 'leaderboard_point',
    status: 'settled',
    deadline: '2026-06-14T10:00:00.000Z',
    winner_user_id: 'user-b',
    is_tie: false,
    is_coop: false,
    updated_at: '2026-06-14T00:00:00.000Z',
    match_participants: [
      { user_id: 'user-a', side: 0 },
      { user_id: 'user-b', side: 1 },
      { user_id: 'user-c', side: 1 },
    ],
    match_team_result_submissions: [
      teamSubmission(0, 17),
      teamSubmission(1, 21),
    ],
    match_abuse_reports: [],
    ...overrides,
  }
}

describe('getNewMatchRatingPreview', () => {
  it('returns the selected activity ELO and match count', () => {
    expect(getNewMatchRatingPreview('basketball', [
      { activity: 'running', rating: 520, tier: 'bronze', matches: 3 },
      { activity: 'basketball', rating: 812, tier: 'gold', matches: 22 },
    ])).toEqual({
      rating: 812,
      matches: 22,
      tierLabel: 'Gold',
      meta: 'GOLD TIER · 22 MATCHES',
    })
  })
})

describe('getNewMatchHistoryRows', () => {
  it('uses real settled match scores and team-side outcome', () => {
    expect(getNewMatchHistoryRows({
      matches: [match()],
      userId: 'user-c',
      activity: 'basketball',
    })).toEqual([
      {
        result: 'W',
        score: '17 - 21',
        meta: '24 RP · JUN 14',
        delta: '+24',
        tone: 'win',
      },
    ])
  })

  it('filters by selected activity and keeps the latest rows first', () => {
    const rows = getNewMatchHistoryRows({
      matches: [
        match({ id: 'old', updated_at: '2026-06-10T00:00:00.000Z', stake: 10 }),
        match({ id: 'run', activity_type: 'running' }),
        match({ id: 'new', updated_at: '2026-06-15T00:00:00.000Z', stake: 16 }),
      ],
      userId: 'user-a',
      activity: 'basketball',
      limit: 2,
    })

    expect(rows.map((row) => row.meta)).toEqual(['16 RP · JUN 15', '10 RP · JUN 10'])
    expect(rows.map((row) => row.result)).toEqual(['L', 'L'])
  })
})
