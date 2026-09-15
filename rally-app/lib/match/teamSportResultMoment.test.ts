import { describe, expect, it } from 'vitest'

import type {
  MatchParticipant,
  MatchSubmissionActivity,
  MatchTeamResultSubmission,
  MatchWithRelations,
} from '@/types/match'
import {
  getTeamScoreReadiness,
  getTeamSportOutcomeSummary,
  getTeamSportScoreboard,
} from './teamSportResultMoment'

const NOW = '2026-05-19T10:00:00.000Z'

function participant(
  userId: string,
  side: 0 | 1,
  stake = 50,
  overrides: Partial<MatchParticipant> = {},
): MatchParticipant {
  return {
    user_id: userId,
    side,
    stake_contribution: stake,
    accepted_at: NOW,
    is_active: true,
    rating_before: null,
    rating_after: null,
    users: null,
    ...overrides,
  }
}

function teamSubmission(
  sideIndex: 0 | 1,
  teamScore: number,
): MatchTeamResultSubmission {
  return {
    id: `team-submission-${sideIndex}`,
    side_index: sideIndex,
    submitted_by: sideIndex === 0 ? 'user-a' : 'user-b',
    team_score: teamScore,
    notes: null,
    proof_urls: [],
    accepted_by: null,
    accepted_at: null,
    created_at: NOW,
    updated_at: NOW,
  }
}

function recordedTeamActivity(
  sideAScore: number,
  sideBScore: number,
): MatchSubmissionActivity {
  return {
    id: 'activity-1',
    activity_type: 'basketball',
    point_delta: null,
    running_activity_details: null,
    team_sport_activity_details: {
      format: 'basketball',
      team_size: 1,
      side_0_score: sideAScore,
      side_1_score: sideBScore,
      winning_side: sideAScore === sideBScore ? null : sideAScore > sideBScore ? 0 : 1,
      score_log: null,
    },
    activity_session_media: [],
  }
}

function match(overrides: Partial<MatchWithRelations> = {}): MatchWithRelations {
  return {
    id: 'match-1',
    source: 'legacy_standalone',
    created_by: 'user-a',
    activity_type: 'basketball',
    rule_text: null,
    rule_params: {},
    stake: 50,
    stake_currency: 'leaderboard_point',
    deadline: '2026-05-20T10:00:00.000Z',
    status: 'settled',
    accepted_at: NOW,
    started_at: NOW,
    winner_user_id: 'user-a',
    is_tie: false,
    is_coop: false,
    team_size_per_side: 1,
    join_mode: 'open',
    join_code: null,
    entry_code: null,
    match_participants: [
      participant('user-a', 0, 50),
      participant('user-b', 1, 50),
    ],
    match_invites: [],
    match_submissions: [
      {
        id: 'submission-1',
        submitted_by: 'user-a',
        winner_user_id: 'user-a',
        created_at: NOW,
        activity_session_id: 'activity-1',
        activity_sessions: recordedTeamActivity(21, 18),
      },
    ],
    match_team_result_submissions: [
      teamSubmission(0, 19),
      teamSubmission(1, 17),
    ],
    match_cancel_requests: [],
    match_participant_contributions: [],
    match_abuse_reports: [],
    ...overrides,
  }
}

describe('getTeamScoreReadiness', () => {
  it('asks for a score before contribution math matters', () => {
    expect(getTeamScoreReadiness({ scoreText: '', contributionTotal: 0 })).toEqual({
      kind: 'needs_score',
      score: null,
      delta: null,
      label: 'Enter your score',
    })
  })

  it('reports how many points still need assignment', () => {
    expect(getTeamScoreReadiness({ scoreText: '12', contributionTotal: 8 })).toEqual({
      kind: 'needs_contributions',
      score: 12,
      delta: 4,
      label: 'Assign 4 pts',
    })
  })

  it('reports how many contribution points must be removed', () => {
    expect(getTeamScoreReadiness({ scoreText: '12', contributionTotal: 15 })).toEqual({
      kind: 'over_contributed',
      score: 12,
      delta: 3,
      label: 'Remove 3 pts',
    })
  })

  it('marks the score ready when contributions equal team score', () => {
    expect(getTeamScoreReadiness({ scoreText: '12', contributionTotal: 12 })).toEqual({
      kind: 'ready',
      score: 12,
      delta: 0,
      label: 'Ready to lock',
    })
  })
})

describe('getTeamSportScoreboard', () => {
  it('prefers recorded activity scores over team result submissions', () => {
    expect(getTeamSportScoreboard(match())).toEqual({
      sideAScore: 21,
      sideBScore: 18,
      winnerSide: 0,
      source: 'recorded',
    })
  })

  it('falls back to team result submissions when no recorded team activity exists', () => {
    expect(getTeamSportScoreboard(match({
      match_submissions: [],
      match_team_result_submissions: [
        teamSubmission(0, 11),
        teamSubmission(1, 15),
      ],
    }))).toEqual({
      sideAScore: 11,
      sideBScore: 15,
      winnerSide: 1,
      source: 'team_submissions',
    })
  })
})

describe('getTeamSportOutcomeSummary', () => {
  it('computes the winner point delta from the opposing side pot', () => {
    expect(getTeamSportOutcomeSummary(match(), 'user-a')).toMatchObject({
      kind: 'win',
      mySide: 0,
      winnerSide: 0,
      pointsDelta: 50,
    })
  })

  it('computes the loser point delta from their own stake', () => {
    expect(getTeamSportOutcomeSummary(match(), 'user-b')).toMatchObject({
      kind: 'lose',
      mySide: 1,
      winnerSide: 0,
      pointsDelta: -50,
    })
  })

  it('returns zero movement for a settled tie', () => {
    expect(getTeamSportOutcomeSummary(match({
      winner_user_id: null,
      is_tie: true,
    }), 'user-a')).toMatchObject({
      kind: 'tie',
      mySide: 0,
      winnerSide: null,
      pointsDelta: 0,
    })
  })
})
