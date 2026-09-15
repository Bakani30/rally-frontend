import { describe, expect, it } from 'vitest'

import { getPendingTeamResultReviewAction } from './teamResultReviewAction'
import type { MyMatch } from '@/types/match'

function match(overrides: Partial<MyMatch> = {}): MyMatch {
  return {
    id: 'match-1',
    created_by: 'user-a',
    activity_type: 'basketball',
    stake: 50,
    stake_currency: 'leaderboard_point',
    status: 'in_progress',
    deadline: '2026-05-13T10:00:00.000Z',
    winner_user_id: null,
    is_tie: false,
    is_coop: false,
    updated_at: '2026-05-13T00:00:00.000Z',
    match_participants: [
      { user_id: 'user-a', side: 0 },
      { user_id: 'user-b', side: 1 },
    ],
    match_team_result_submissions: [
      { id: 'a', side_index: 0, submitted_by: 'user-a', team_score: 8, notes: null, proof_urls: [], accepted_by: null, accepted_at: null, created_at: '2026-05-13T00:01:00.000Z', updated_at: '2026-05-13T00:01:00.000Z' },
      { id: 'b', side_index: 1, submitted_by: 'user-b', team_score: 9, notes: null, proof_urls: [], accepted_by: null, accepted_at: null, created_at: '2026-05-13T00:02:00.000Z', updated_at: '2026-05-13T00:03:00.000Z' },
    ],
    match_abuse_reports: [],
    ...overrides,
  }
}

describe('getPendingTeamResultReviewAction', () => {
  it('surfaces a team result review after both scores exist and my side has not accepted', () => {
    expect(getPendingTeamResultReviewAction(match(), 'user-a')).toEqual({
      scoreLabel: '8 - 9',
      updatedAt: '2026-05-13T00:03:00.000Z',
    })
  })

  it('hides the review while an open challenge is still blocking acceptance', () => {
    expect(getPendingTeamResultReviewAction(match({
      match_abuse_reports: [
        {
          id: 'report-1',
          match_id: 'match-1',
          reporter_user_id: 'user-a',
          reported_user_id: 'user-b',
          reason: 'team_result_incorrect',
          note: null,
          evidence_paths: [],
          status: 'open',
          created_at: '2026-05-13T00:04:00.000Z',
        },
      ],
    }), 'user-a')).toBeNull()
  })
})
