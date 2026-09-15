import { describe, expect, it } from 'vitest'

import type { MatchHistoryImpact } from './matchHistoryImpactTypes'
import { presentBasketballHistoryMatch } from './basketballHistoryPresenter'
import type { MatchTeamResultSubmission, MyMatch } from '@/types/match'

function teamSubmission(
  side: 0 | 1,
  score: number,
  updatedAt = '2026-07-20T10:00:00.000Z',
): MatchTeamResultSubmission {
  return {
    id: `submission-${side}-${score}`,
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
    stake: 999,
    stake_currency: 'leaderboard_point',
    status: 'settled',
    deadline: '2026-07-20T23:59:00.000Z',
    winner_user_id: 'user-a',
    is_tie: false,
    is_coop: false,
    updated_at: '2026-07-20T12:00:00.000Z',
    settled_at: '2026-07-20T11:00:00.000Z',
    match_participants: [
      { user_id: 'user-a', side: 0 },
      { user_id: 'user-b', side: 1 },
      { user_id: 'user-c', side: 1 },
    ],
    match_team_result_submissions: [teamSubmission(0, 71), teamSubmission(1, 84)],
    ...overrides,
  } as MyMatch
}

function impact(overrides: Partial<MatchHistoryImpact> = {}): MatchHistoryImpact {
  return {
    matchId: 'match-1',
    activityType: 'basketball',
    settledAt: '2026-07-20T11:05:00.000Z',
    mySide: 0,
    myStakeAmount: 25,
    myStakeCurrency: 'credit',
    scoreDelta: 8,
    ratingBefore: 800,
    ratingAfter: 806,
    ratingDelta: 6,
    ...overrides,
  }
}

describe('presentBasketballHistoryMatch', () => {
  it('uses the winner side so a teammate of the winner sees a win', () => {
    const result = presentBasketballHistoryMatch({
      match: match(),
      currentUserId: 'user-c',
    })

    expect(result?.outcome).toBe('loss')

    const teammateWinner = presentBasketballHistoryMatch({
      match: match({
        winner_user_id: 'user-b',
        match_participants: [
          { user_id: 'user-a', side: 0 },
          { user_id: 'user-b', side: 1 },
          { user_id: 'user-c', side: 1 },
        ],
      }),
      currentUserId: 'user-c',
    })

    expect(teammateWinner?.outcome).toBe('win')
  })

  it('returns loss for a participant on the other side and tie for a tied settlement', () => {
    expect(
      presentBasketballHistoryMatch({ match: match(), currentUserId: 'user-a' })?.outcome,
    ).toBe('win')
    expect(
      presentBasketballHistoryMatch({
        match: match({ winner_user_id: null, is_tie: true }),
        currentUserId: 'user-c',
      })?.outcome,
    ).toBe('tie')
  })

  it('orients side 1 score as the current user score first', () => {
    const result = presentBasketballHistoryMatch({
      match: match(),
      currentUserId: 'user-c',
    })

    expect(result?.score).toEqual({ my: 84, opponent: 71 })
  })

  it('uses the impact side when the base history row has no participant side', () => {
    const result = presentBasketballHistoryMatch({
      match: match({
        match_participants: [
          { user_id: 'user-a', side: 0 },
          { user_id: 'user-b', side: 1 },
        ],
      }),
      currentUserId: 'user-c',
      impact: impact({ mySide: 1 }),
    })

    expect(result).toMatchObject({ outcome: 'loss', mySide: 1, score: { my: 84, opponent: 71 } })
  })

  it('does not fabricate a 0-0 score from a partial submission', () => {
    const result = presentBasketballHistoryMatch({
      match: match({ match_team_result_submissions: [teamSubmission(0, 71)] }),
      currentUserId: 'user-a',
    })

    expect(result?.score).toBeNull()
  })

  it('uses settled date and falls back to updated_at, never deadline', () => {
    expect(
      presentBasketballHistoryMatch({ match: match(), currentUserId: 'user-a' })?.date,
    ).toBe('2026-07-20T11:00:00.000Z')
    expect(
      presentBasketballHistoryMatch({
        match: match({ settled_at: null, updated_at: '2026-07-20T12:00:00.000Z' }),
        currentUserId: 'user-a',
      })?.date,
    ).toBe('2026-07-20T12:00:00.000Z')
  })

  it('preserves nullable score and rating deltas independently', () => {
    const result = presentBasketballHistoryMatch({
      match: match(),
      currentUserId: 'user-a',
      impact: impact({ scoreDelta: null, ratingDelta: -7, ratingBefore: null, ratingAfter: null }),
    })

    expect(result).toMatchObject({
      scoreDelta: null,
      ratingDelta: -7,
      ratingBefore: null,
      ratingAfter: null,
    })
  })

  it('uses the impact personal stake and does not infer it from the match pot', () => {
    const result = presentBasketballHistoryMatch({
      match: match({ stake: 999 }),
      currentUserId: 'user-a',
      impact: impact({ myStakeAmount: 25, myStakeCurrency: 'credit' }),
    })

    expect(result).toMatchObject({ stakeAmount: 25, stakeCurrency: 'credit' })
  })

  it('returns null for non-basketball or non-settled matches', () => {
    expect(
      presentBasketballHistoryMatch({
        match: match({ activity_type: 'running' }),
        currentUserId: 'user-a',
      }),
    ).toBeNull()
    expect(
      presentBasketballHistoryMatch({
        match: match({ status: 'submitted' }),
        currentUserId: 'user-a',
      }),
    ).toBeNull()
  })
})
