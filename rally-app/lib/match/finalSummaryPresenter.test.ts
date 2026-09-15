import { describe, expect, it } from 'vitest'

import type {
  MatchParticipant,
  RefereeMatchRecord,
  MatchTeamResultSubmission,
  MatchWithRelations,
} from '@/types/match'
import type { BasketballLiveStatsByUser } from './basketballLiveScoring'
import { buildBasketballFinalSummary } from './finalSummaryPresenter'

type PresenterMatch = Pick<
  MatchWithRelations,
  'status' | 'winner_user_id' | 'is_tie' | 'match_participants' | 'match_submissions' | 'match_team_result_submissions' | 'referee_match_records'
>

// No accepted team-result data — presenter falls back to draft-derived scores.
function pendingMatchFixture(participants: MatchParticipant[]): PresenterMatch {
  return {
    status: 'in_progress',
    winner_user_id: null,
    is_tie: false,
    match_participants: participants,
    match_submissions: [],
    match_team_result_submissions: [],
    referee_match_records: [],
  }
}

function teamResultSubmissionFixture(
  side: 0 | 1,
  teamScore: number,
  overrides: Partial<MatchTeamResultSubmission> = {},
): MatchTeamResultSubmission {
  return {
    id: `submission-${side}`,
    side_index: side,
    submitted_by: `user-${side}`,
    team_score: teamScore,
    notes: null,
    proof_urls: [],
    accepted_by: `user-${side === 0 ? 1 : 0}`,
    accepted_at: '2026-05-20T00:10:00.000Z',
    created_at: '2026-05-20T00:05:00.000Z',
    updated_at: '2026-05-20T00:10:00.000Z',
    ...overrides,
  }
}

// Settled team-result submissions exist for both sides, with a winner
// resolved (winner_user_id + status settled) — presenter must source scores
// and outcome from this, not from live drafts.
function settledMatchFixture(input: {
  participants: MatchParticipant[]
  sideAScore: number
  sideBScore: number
  winnerUserId: string | null
  isTie?: boolean
  refereeFinalStatus?: RefereeMatchRecord['final_status']
}): PresenterMatch {
  return {
    status: 'settled',
    winner_user_id: input.winnerUserId,
    is_tie: input.isTie ?? false,
    match_participants: input.participants,
    match_submissions: [],
    match_team_result_submissions: [
      teamResultSubmissionFixture(0, input.sideAScore),
      teamResultSubmissionFixture(1, input.sideBScore),
    ],
    referee_match_records: input.refereeFinalStatus
      ? [{
          id: 'record-1',
          match_id: 'match-1',
          assignment_id: 'assignment-1',
          referee_user_id: 'referee-1',
          activity_type: 'basketball',
          result_id: 'result-1',
          final_status: input.refereeFinalStatus,
          correction_count: input.refereeFinalStatus === 'corrected' ? 1 : 0,
          had_dispute: input.refereeFinalStatus !== 'accepted',
          quality_delta: 1,
          referee_level_after: 2,
          trust_tier_after: 'court_side',
          settled_at: '2026-05-20T00:10:00.000Z',
          created_at: '2026-05-20T00:10:00.000Z',
          updated_at: '2026-05-20T00:10:00.000Z',
        }]
      : [],
  }
}

function participantFixture(
  userId: string,
  side: 0 | 1,
  overrides: Partial<MatchParticipant> = {},
): MatchParticipant {
  return {
    user_id: userId,
    side,
    stake_contribution: 50,
    accepted_at: null,
    joined_at: `2026-05-20T00:0${userId.slice(-1) || 0}:00.000Z`,
    is_active: true,
    lobby_position_key: null,
    rating_before: null,
    rating_after: null,
    users: {
      id: userId,
      display_name: userId,
      email: `${userId}@example.com`,
      handle: userId,
      avatar_url: null,
      jersey_number: 12,
      leaderboard_score: 140,
    },
    ...overrides,
  }
}

function statsByUser(records: Record<string, {
  points: number
  rebounds?: number
  assists?: number
  blocks?: number
}>): BasketballLiveStatsByUser {
  return Object.fromEntries(
    Object.entries(records).map(([userId, stats]) => [
      userId,
      {
        points: stats.points,
        rebounds: stats.rebounds ?? 0,
        assists: stats.assists ?? 0,
        blocks: stats.blocks ?? 0,
        threePointersMade: 0,
      },
    ]),
  )
}

describe('buildBasketballFinalSummary', () => {
  const displayName = (p: MatchParticipant) => p.users?.display_name || p.user_id

  describe('outcome', () => {
    it('(a) returns "win" when mySide is 0 and scoreA > scoreB', () => {
      const participants = [
        participantFixture('user-a', 0),
        participantFixture('user-b', 1),
      ]
      const stats = statsByUser({
        'user-a': { points: 25 },
        'user-b': { points: 20 },
      })
      const myParticipant = participants[0]

      const result = buildBasketballFinalSummary({
        participants,
        statsByUser: stats,
        mySide: 0,
        myParticipant,
        match: pendingMatchFixture(participants),
        currentUserId: 'user-a',
        displayName,
      })

      expect(result.outcome).toBe('win')
      expect(result.scoreA).toBe(25)
      expect(result.scoreB).toBe(20)
    })

    it('(b) returns "loss" when mySide is 0 and scoreA < scoreB', () => {
      const participants = [
        participantFixture('user-a', 0),
        participantFixture('user-b', 1),
      ]
      const stats = statsByUser({
        'user-a': { points: 15 },
        'user-b': { points: 25 },
      })
      const myParticipant = participants[0]

      const result = buildBasketballFinalSummary({
        participants,
        statsByUser: stats,
        mySide: 0,
        myParticipant,
        match: pendingMatchFixture(participants),
        currentUserId: 'user-a',
        displayName,
      })

      expect(result.outcome).toBe('loss')
      expect(result.scoreA).toBe(15)
      expect(result.scoreB).toBe(25)
    })

    it('(c) returns "tie" when scoreA equals scoreB', () => {
      const participants = [
        participantFixture('user-a', 0),
        participantFixture('user-b', 1),
      ]
      const stats = statsByUser({
        'user-a': { points: 20 },
        'user-b': { points: 20 },
      })
      const myParticipant = participants[0]

      const result = buildBasketballFinalSummary({
        participants,
        statsByUser: stats,
        mySide: 0,
        myParticipant,
        match: pendingMatchFixture(participants),
        currentUserId: 'user-a',
        displayName,
      })

      expect(result.outcome).toBe('tie')
      expect(result.scoreA).toBe(20)
      expect(result.scoreB).toBe(20)
    })

    it('(d) returns "neutral" when mySide is null', () => {
      const participants = [
        participantFixture('user-a', 0),
        participantFixture('user-b', 1),
      ]
      const stats = statsByUser({
        'user-a': { points: 25 },
        'user-b': { points: 20 },
      })

      const result = buildBasketballFinalSummary({
        participants,
        statsByUser: stats,
        mySide: null,
        myParticipant: null,
        match: pendingMatchFixture(participants),
        currentUserId: 'user-a',
        displayName,
      })

      expect(result.outcome).toBe('neutral')
      expect(result.scoreA).toBe(25)
      expect(result.scoreB).toBe(20)
    })
  })

  describe('trusted top performer', () => {
    it('picks one overall top scorer from accepted referee stats and skips inactive participants', () => {
      const participants = [
        participantFixture('user-a1', 0),
        participantFixture('user-a2', 0),
        participantFixture('user-b1', 1),
        participantFixture('user-b2', 1, { is_active: false }),
      ]
      const stats = statsByUser({
        'user-a1': { points: 15 },
        'user-a2': { points: 25, rebounds: 8, assists: 6, blocks: 2 },
        'user-b1': { points: 22 },
        'user-b2': { points: 30 },
      })

      const result = buildBasketballFinalSummary({
        participants,
        statsByUser: stats,
        mySide: 0,
        myParticipant: participants[0],
        match: settledMatchFixture({
          participants,
          sideAScore: 68,
          sideBScore: 61,
          winnerUserId: 'user-a1',
          refereeFinalStatus: 'accepted',
        }),
        currentUserId: 'user-a',
        displayName,
      })

      expect(result.topPerformer).toEqual({
        userId: 'user-a2',
        name: 'user-a2',
        initials: 'U',
        points: 25,
        rebounds: 8,
        assists: 6,
        blocks: 2,
        side: 0,
      })
    })

    it.each(['corrected'] as const)('allows %s referee stats', (refereeFinalStatus) => {
      const participants = [participantFixture('user-a', 0), participantFixture('user-b', 1)]
      const result = buildBasketballFinalSummary({
        participants,
        statsByUser: statsByUser({ 'user-a': { points: 12 }, 'user-b': { points: 20 } }),
        mySide: 0,
        myParticipant: participants[0],
        match: settledMatchFixture({
          participants,
          sideAScore: 40,
          sideBScore: 45,
          winnerUserId: 'user-b',
          refereeFinalStatus,
        }),
        currentUserId: 'user-a',
        displayName,
      })
      expect(result.topPerformer?.userId).toBe('user-b')
    })

    it.each([undefined, 'disputed'] as const)('hides untrusted stats for final status %s', (refereeFinalStatus) => {
      const participants = [participantFixture('user-a', 0), participantFixture('user-b', 1)]
      const result = buildBasketballFinalSummary({
        participants,
        statsByUser: statsByUser({ 'user-a': { points: 12 }, 'user-b': { points: 20 } }),
        mySide: 0,
        myParticipant: participants[0],
        match: settledMatchFixture({
          participants,
          sideAScore: 40,
          sideBScore: 45,
          winnerUserId: 'user-b',
          refereeFinalStatus,
        }),
        currentUserId: 'user-a',
        displayName,
      })
      expect(result.topPerformer).toBeNull()
    })
  })

  describe('ratingDelta', () => {
    it('(f) returns null when rating_after is null', () => {
      const participants = [
        participantFixture('user-a', 0, {
          rating_before: 1500,
          rating_after: null,
        }),
        participantFixture('user-b', 1),
      ]
      const stats = statsByUser({
        'user-a': { points: 25 },
        'user-b': { points: 20 },
      })

      const result = buildBasketballFinalSummary({
        participants,
        statsByUser: stats,
        mySide: 0,
        myParticipant: participants[0],
        match: pendingMatchFixture(participants),
        currentUserId: 'user-a',
        displayName,
      })

      expect(result.ratingDelta).toBeNull()
    })

    it('(f) returns null when rating_before is null', () => {
      const participants = [
        participantFixture('user-a', 0, {
          rating_before: null,
          rating_after: 1520,
        }),
        participantFixture('user-b', 1),
      ]
      const stats = statsByUser({
        'user-a': { points: 25 },
        'user-b': { points: 20 },
      })

      const result = buildBasketballFinalSummary({
        participants,
        statsByUser: stats,
        mySide: 0,
        myParticipant: participants[0],
        match: pendingMatchFixture(participants),
        currentUserId: 'user-a',
        displayName,
      })

      expect(result.ratingDelta).toBeNull()
    })

    it('(f) returns numeric delta when both rating_before and rating_after are present', () => {
      const participants = [
        participantFixture('user-a', 0, {
          rating_before: 1500,
          rating_after: 1525,
        }),
        participantFixture('user-b', 1),
      ]
      const stats = statsByUser({
        'user-a': { points: 25 },
        'user-b': { points: 20 },
      })

      const result = buildBasketballFinalSummary({
        participants,
        statsByUser: stats,
        mySide: 0,
        myParticipant: participants[0],
        match: pendingMatchFixture(participants),
        currentUserId: 'user-a',
        displayName,
      })

      expect(result.ratingDelta).toBe(25) // 1525 - 1500
    })

    it('(f) can return negative rating delta on loss', () => {
      const participants = [
        participantFixture('user-a', 0, {
          rating_before: 1500,
          rating_after: 1480,
        }),
        participantFixture('user-b', 1),
      ]
      const stats = statsByUser({
        'user-a': { points: 15 },
        'user-b': { points: 25 },
      })

      const result = buildBasketballFinalSummary({
        participants,
        statsByUser: stats,
        mySide: 0,
        myParticipant: participants[0],
        match: pendingMatchFixture(participants),
        currentUserId: 'user-a',
        displayName,
      })

      expect(result.ratingDelta).toBe(-20) // 1480 - 1500
    })
  })

  describe('settled result sourcing', () => {
    it('(g) sources scoreA/scoreB from settled team-result submissions, not live drafts', () => {
      const participants = [
        participantFixture('user-a', 0),
        participantFixture('user-b', 1),
      ]
      // Drafts still show side 0 ahead — must not leak into the summary.
      const stats = statsByUser({
        'user-a': { points: 25 },
        'user-b': { points: 20 },
      })

      const result = buildBasketballFinalSummary({
        participants,
        statsByUser: stats,
        mySide: 0,
        myParticipant: participants[0],
        match: settledMatchFixture({
          participants,
          sideAScore: 18,
          sideBScore: 30,
          winnerUserId: 'user-b',
        }),
        currentUserId: 'user-a',
        displayName,
      })

      expect(result.scoreA).toBe(18)
      expect(result.scoreB).toBe(30)
    })

    it('(h) divergence: drafts say side A wins, settled result says side B wins — banner follows settled', () => {
      const participants = [
        participantFixture('user-a', 0),
        participantFixture('user-b', 1),
      ]
      // Drafts (e.g. unresolved player stat entries) show side 0 winning...
      const stats = statsByUser({
        'user-a': { points: 30 },
        'user-b': { points: 10 },
      })

      const result = buildBasketballFinalSummary({
        participants,
        statsByUser: stats,
        mySide: 0,
        myParticipant: participants[0],
        // ...but the accepted team-result submissions (authoritative) say side 1 won.
        match: settledMatchFixture({
          participants,
          sideAScore: 40,
          sideBScore: 55,
          winnerUserId: 'user-b',
        }),
        currentUserId: 'user-a',
        displayName,
      })

      expect(result.outcome).toBe('loss')
      expect(result.scoreA).toBe(40)
      expect(result.scoreB).toBe(55)
    })

    it('(i) falls back to draft-derived scores/outcome when no settled team-result data exists', () => {
      const participants = [
        participantFixture('user-a', 0),
        participantFixture('user-b', 1),
      ]
      const stats = statsByUser({
        'user-a': { points: 25 },
        'user-b': { points: 20 },
      })

      const result = buildBasketballFinalSummary({
        participants,
        statsByUser: stats,
        mySide: 0,
        myParticipant: participants[0],
        match: pendingMatchFixture(participants),
        currentUserId: 'user-a',
        displayName,
      })

      expect(result.outcome).toBe('win')
      expect(result.scoreA).toBe(25)
      expect(result.scoreB).toBe(20)
    })
  })
})
