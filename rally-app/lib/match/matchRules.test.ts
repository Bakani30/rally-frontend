import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/users/userLookupService', () => ({
  normalizeHandle: (raw: string) => raw.trim().replace(/^@+/, '').toLowerCase(),
  validateHandleFormat: () => null,
}))

import {
  canChallengeTeamResult,
  canRequestMutualCancel,
  canRequestResultCorrection,
  canRequestTeamResultCorrection,
  canRespondTeamResultCorrection,
  canRespondToResultCorrection,
  getAlphaRefereeDutyState,
  getAlphaRefereeDraftScoreBySide,
  getAlphaRefereePlayerStatDraft,
  getBasketballPlayerSelfStatDraft,
  getBasketballPlayerSelfStatDrafts,
  canFinishCoopRunMatch,
  canLeaveCoopRunMatch,
  getCoopRunActiveTeamProgress,
  getCurrentAlphaRefereeResult,
  getMyTeamCorrectionToRespond,
  getPendingCorrectionRequest,
  getPendingTeamResultCorrection,
  getRefereeAssignmentInProgress,
  hasActiveAlphaRefereeAssignment,
  getMatchDetailState,
  getOpenTeamResultChallenge,
  getTeamResultChallengeTargetUserId,
  shouldBlockBasketballPlayerFinalSubmit,
  validateRefereePlayerStatDraftInput,
  willCoopRunSubmitCompleteBelowMinimum,
} from './matchRules'
import type {
  AlphaRefereeDuty,
  AlphaRefereeLiveScoreDraft,
  AlphaRefereeResultSubmission,
  MatchRefereeAssignment,
  MatchWithRelations,
} from '@/types/match'

function teamReviewMatch(overrides: Partial<MatchWithRelations> = {}): MatchWithRelations {
  return {
    id: 'match-1',
    status: 'in_progress',
    activity_type: 'basketball',
    match_participants: [
      { user_id: 'user-a', side: 0, stake_contribution: 50, accepted_at: null, rating_before: null, rating_after: null, users: null },
      { user_id: 'user-b', side: 1, stake_contribution: 50, accepted_at: null, rating_before: null, rating_after: null, users: null },
    ],
    match_team_result_submissions: [
      { id: 'side-a', side_index: 0, submitted_by: 'user-a', team_score: 8, notes: null, proof_urls: [], accepted_by: null, accepted_at: null, created_at: '2026-05-13T00:00:00.000Z', updated_at: '2026-05-13T00:00:00.000Z' },
      { id: 'side-b', side_index: 1, submitted_by: 'user-b', team_score: 99, notes: null, proof_urls: [], accepted_by: null, accepted_at: null, created_at: '2026-05-13T00:00:00.000Z', updated_at: '2026-05-13T00:00:00.000Z' },
    ],
    match_abuse_reports: [],
    ...overrides,
  } as MatchWithRelations
}

describe('team result challenges', () => {
  it('allows a participant to challenge after both sides submit team results', () => {
    expect(canChallengeTeamResult(teamReviewMatch(), 'user-a')).toBe(true)
  })

  it('targets the opposing player submitter for a normal team result challenge', () => {
    expect(getTeamResultChallengeTargetUserId(teamReviewMatch(), 'user-a')).toBe('user-b')
  })

  it('targets the referee submitter for a referee-created team result challenge', () => {
    const baseMatch = teamReviewMatch()
    const match = teamReviewMatch({
      match_team_result_submissions: (baseMatch.match_team_result_submissions ?? []).map((submission) => ({
        ...submission,
        submitted_by: 'referee-user',
      })),
    })

    expect(getTeamResultChallengeTargetUserId(match, 'user-a')).toBe('referee-user')
  })

  it('returns null when the challenger side or opposing submission is missing', () => {
    expect(getTeamResultChallengeTargetUserId(teamReviewMatch(), 'outsider')).toBeNull()
    expect(getTeamResultChallengeTargetUserId(teamReviewMatch({
      match_team_result_submissions: [
        { id: 'side-a', side_index: 0, submitted_by: 'user-a', team_score: 8, notes: null, proof_urls: [], accepted_by: null, accepted_at: null, created_at: '2026-05-13T00:00:00.000Z', updated_at: '2026-05-13T00:00:00.000Z' },
      ],
    }), 'user-a')).toBeNull()
  })

  it('blocks new challenges while an open team result challenge exists', () => {
    const match = teamReviewMatch({
      match_abuse_reports: [
        {
          id: 'report-1',
          match_id: 'match-1',
          reporter_user_id: 'user-a',
          reported_user_id: 'user-b',
          reason: 'team_result_incorrect',
          note: 'wrong score',
          evidence_paths: [],
          status: 'open',
          created_at: '2026-05-13T00:01:00.000Z',
        },
      ],
    })

    expect(getOpenTeamResultChallenge(match)?.id).toBe('report-1')
    expect(canChallengeTeamResult(match, 'user-b')).toBe(false)
  })
})

function alphaRefereeResult(
  overrides: Partial<AlphaRefereeResultSubmission> = {},
): AlphaRefereeResultSubmission {
  return {
    id: 'alpha-result-1',
    match_id: 'match-1',
    assignment_id: 'assignment-1',
    referee_user_id: 'referee-user',
    result_kind: 'team_score',
    side_0_score: 8,
    side_1_score: 6,
    winner_side: null,
    winner_user_id: null,
    is_tie: false,
    note: null,
    proof_urls: [],
    status: 'pending_player_action',
    created_at: '2026-06-04T00:00:00.000Z',
    updated_at: '2026-06-04T00:00:00.000Z',
    referee: null,
    ...overrides,
  }
}

describe('alpha referee current result', () => {
  it('returns null when the match has no alpha referee result', () => {
    expect(getCurrentAlphaRefereeResult(teamReviewMatch())).toBeNull()
  })

  it('returns a pending team-score alpha referee result', () => {
    const result = alphaRefereeResult()
    const match = teamReviewMatch({ alpha_referee_result_submissions: [result] })

    expect(getCurrentAlphaRefereeResult(match)).toBe(result)
  })

  it('handles a Supabase one-to-one alpha referee result object', () => {
    const result = alphaRefereeResult()
    const match = teamReviewMatch({ alpha_referee_result_submissions: result })

    expect(getCurrentAlphaRefereeResult(match)).toBe(result)
  })

  it('returns a pending manual-running alpha referee result', () => {
    const result = alphaRefereeResult({
      result_kind: 'manual_running_result',
      side_0_score: null,
      side_1_score: null,
      winner_side: 0,
      winner_user_id: 'user-a',
    })
    const match = teamReviewMatch({ alpha_referee_result_submissions: [result] })

    expect(getCurrentAlphaRefereeResult(match)).toBe(result)
  })

  it('ignores cleared or superseded alpha referee results', () => {
    const match = teamReviewMatch({
      alpha_referee_result_submissions: [
        alphaRefereeResult({ id: 'cleared-result', status: 'cleared' }),
        alphaRefereeResult({ id: 'superseded-result', status: 'superseded' }),
      ],
    })

    expect(getCurrentAlphaRefereeResult(match)).toBeNull()
  })
})

describe('alpha referee duty state', () => {
  it('returns not_ready when the assigned match is still pending', () => {
    expect(getAlphaRefereeDutyState(alphaRefereeDuty({ match: { status: 'pending' } }), 'referee-user')).toBe('not_ready')
  })

  it('returns needs_result when the assigned match can accept a referee result', () => {
    expect(getAlphaRefereeDutyState(alphaRefereeDuty({ match: { status: 'in_progress' } }), 'referee-user')).toBe('needs_result')
  })

  it('returns live_draft when the referee has started live scoring', () => {
    expect(getAlphaRefereeDutyState(alphaRefereeDuty({
      latestDraft: alphaDutyDraft({ status: 'open' }),
    }), 'referee-user')).toBe('live_draft')
  })

  it('handles a Supabase one-to-one assignment object on match detail', () => {
    const assignment: MatchRefereeAssignment = {
      id: 'assignment-1',
      match_id: 'match-1',
      referee_user_id: 'referee-user',
      activity_type: 'basketball',
      assigned_by: 'creator-user',
      status: 'assigned',
      assigned_at: '2026-06-04T00:00:00.000Z',
      updated_at: '2026-06-04T00:00:00.000Z',
      referee: null,
    }
    const match = teamReviewMatch({
      status: 'accepted',
      match_team_result_submissions: [],
      match_referee_assignments: assignment,
    })

    expect(getAlphaRefereeDutyState(match, 'referee-user')).toBe('needs_result')
  })

  it('returns waiting_players when a referee result is pending player action', () => {
    expect(getAlphaRefereeDutyState(alphaRefereeDuty({
      latestResult: alphaDutyResult({ status: 'pending_player_action' }),
    }), 'referee-user')).toBe('waiting_players')
  })

  it('returns correction_requested before superseded when players ask the referee to fix the score', () => {
    expect(getAlphaRefereeDutyState(alphaRefereeDuty({
    
      
      latestResult: alphaDutyResult({ status: 'superseded' }),
      latestDraft: alphaDutyDraft({ status: 'correction_requested' }),
    }), 'referee-user')).toBe('correction_requested')
  })

  it('returns cleared or superseded after the player lifecycle resolves', () => {
    expect(getAlphaRefereeDutyState(alphaRefereeDuty({
      latestResult: alphaDutyResult({ status: 'cleared' }),
    }), 'referee-user')).toBe('cleared')
    expect(getAlphaRefereeDutyState(alphaRefereeDuty({
      latestResult: alphaDutyResult({ status: 'superseded' }),
    }), 'referee-user')).toBe('superseded')
  })

  it('does not open referee actions for a non-assigned user', () => {
    expect(getAlphaRefereeDutyState(alphaRefereeDuty(), 'outsider')).toBe('closed')
  })
})

describe('alpha referee live draft stats', () => {
  it('sums player PTS by side', () => {
    const match = teamReviewMatch({
      alpha_referee_live_score_drafts: [alphaLiveDraft()],
    })

    expect(getAlphaRefereeDraftScoreBySide(match)).toEqual({ 0: 8, 1: 5 })
  })

  it('returns the player stat draft for a tapped player', () => {
    const match = teamReviewMatch({
      alpha_referee_live_score_drafts: [alphaLiveDraft()],
    })

    expect(getAlphaRefereePlayerStatDraft(match, 'user-a')).toMatchObject({
      points: 8,
      rebounds: 3,
      assists: 2,
      blocks: 1,
      three_pointers_made: 2,
    })
  })

  it('validates non-negative integer referee player stats', () => {
    expect(validateRefereePlayerStatDraftInput({
      points: 8,
      rebounds: 3,
      assists: 2,
      blocks: 1,
      threePointersMade: 2,
    })).toBeNull()
    expect(validateRefereePlayerStatDraftInput({
      points: -1,
      rebounds: 0,
      assists: 0,
      blocks: 0,
      threePointersMade: 0,
    })).toContain('PTS')
  })

  it('requires PTS to cover made threes', () => {
    expect(validateRefereePlayerStatDraftInput({
      points: 2,
      rebounds: 0,
      assists: 0,
      blocks: 0,
      threePointersMade: 1,
    })).toContain('3PM')
  })

  it('covers made long-range shots at two points in half-court formats', () => {
    expect(validateRefereePlayerStatDraftInput({
      points: 2,
      rebounds: 0,
      assists: 0,
      blocks: 0,
      threePointersMade: 1,
    }, 2)).toBeNull()
    expect(validateRefereePlayerStatDraftInput({
      points: 1,
      rebounds: 0,
      assists: 0,
      blocks: 0,
      threePointersMade: 1,
    }, 2)).toContain('2PT')
  })

  it('blocks basketball player final submit while an active referee is assigned', () => {
    const assignment: MatchRefereeAssignment = {
      id: 'assignment-1',
      match_id: 'match-1',
      referee_user_id: 'referee-user',
      activity_type: 'basketball',
      assigned_by: 'user-a',
      status: 'assigned',
      assigned_at: '2026-06-04T00:00:00.000Z',
      updated_at: '2026-06-04T00:00:00.000Z',
      referee: null,
    }

    expect(hasActiveAlphaRefereeAssignment(teamReviewMatch({
      match_referee_assignments: [assignment],
    }))).toBe(true)
    expect(shouldBlockBasketballPlayerFinalSubmit(teamReviewMatch({
      match_referee_assignments: [assignment],
    }))).toBe(true)
    expect(shouldBlockBasketballPlayerFinalSubmit(teamReviewMatch({
      activity_type: 'badminton',
      match_referee_assignments: [assignment],
    }))).toBe(false)
    expect(shouldBlockBasketballPlayerFinalSubmit(teamReviewMatch({
      match_referee_assignments: [{ ...assignment, status: 'removed' }],
    }))).toBe(false)
  })
})

describe('basketball player self-stat drafts', () => {
  it('returns the player-owned advisory stat draft for the current user', () => {
    const match = teamReviewMatch({
      basketball_player_stat_drafts: [
        {
          id: 'self-a',
          match_id: 'match-1',
          user_id: 'user-a',
          side_index: 0,
          points: 10,
          rebounds: 4,
          assists: 2,
          blocks: 1,
          three_pointers_made: 2,
          note: 'felt good',
          created_at: '2026-06-04T00:00:00.000Z',
          updated_at: '2026-06-04T00:00:00.000Z',
        },
      ],
    })

    expect(getBasketballPlayerSelfStatDraft(match, 'user-a')).toMatchObject({
      points: 10,
      rebounds: 4,
      note: 'felt good',
    })
    expect(getBasketballPlayerSelfStatDraft(match, 'user-b')).toBeNull()
  })

  it('handles a Supabase one-to-one self-stat relation object', () => {
    const match = teamReviewMatch({
      basketball_player_stat_drafts: {
        id: 'self-a',
        match_id: 'match-1',
        user_id: 'user-a',
        side_index: 0,
        points: 7,
        rebounds: 2,
        assists: 3,
        blocks: 0,
        three_pointers_made: 1,
        note: null,
        created_at: '2026-06-04T00:00:00.000Z',
        updated_at: '2026-06-04T00:00:00.000Z',
      },
    })

    expect(getBasketballPlayerSelfStatDrafts(match)).toHaveLength(1)
    expect(getBasketballPlayerSelfStatDraft(match, 'user-a')?.points).toBe(7)
  })
})

function alphaDutyResult(
  overrides: Partial<NonNullable<AlphaRefereeDuty['latestResult']>> = {},
): NonNullable<AlphaRefereeDuty['latestResult']> {
  return {
    id: 'alpha-result-1',
    matchId: 'match-1',
    assignmentId: 'assignment-1',
    refereeUserId: 'referee-user',
    resultKind: 'team_score',
    side0Score: 8,
    side1Score: 6,
    winnerSide: null,
    winnerUserId: null,
    isTie: false,
    note: null,
    proofUrls: [],
    status: 'pending_player_action',
    createdAt: '2026-06-04T00:00:00.000Z',
    updatedAt: '2026-06-04T00:00:00.000Z',
    ...overrides,
  }
}

function alphaDutyDraft(
  overrides: Partial<NonNullable<AlphaRefereeDuty['latestDraft']>> = {},
): NonNullable<AlphaRefereeDuty['latestDraft']> {
  return {
    id: 'draft-1',
    matchId: 'match-1',
    assignmentId: 'assignment-1',
    refereeUserId: 'referee-user',
    status: 'open',
    correctionNote: null,
    submittedAt: null,
    correctionRequestedAt: null,
    createdAt: '2026-06-04T00:00:00.000Z',
    updatedAt: '2026-06-04T00:00:00.000Z',
    ...overrides,
  }
}

function alphaRefereeDuty(overrides: {
  match?: Partial<AlphaRefereeDuty['match']>
  latestResult?: AlphaRefereeDuty['latestResult']
  latestDraft?: AlphaRefereeDuty['latestDraft']
} = {}): AlphaRefereeDuty {
  return {
    assignmentId: 'assignment-1',
    matchId: 'match-1',
    refereeUserId: 'referee-user',
    activityType: 'basketball',
    assignmentStatus: 'assigned',
    assignedAt: '2026-06-04T00:00:00.000Z',
    updatedAt: '2026-06-04T00:00:00.000Z',
    latestResult: overrides.latestResult ?? null,
    latestDraft: overrides.latestDraft ?? null,
    match: {
      id: 'match-1',
      createdBy: 'creator-user',
      activityType: 'basketball',
      ruleText: null,
      ruleParams: {},
      stake: 30,
      stakeCurrency: 'leaderboard_point',
      status: 'in_progress',
      deadline: '2026-06-05T00:00:00.000Z',
      winnerUserId: null,
      isTie: false,
      isCoop: false,
      teamSizePerSide: 1,
      acceptedAt: null,
      startedAt: null,
      submittedAt: null,
      settledAt: null,
      participants: [
        { userId: 'user-a', side: 0, isActive: true, displayName: 'A', handle: 'a', avatarUrl: null },
        { userId: 'user-b', side: 1, isActive: true, displayName: 'B', handle: 'b', avatarUrl: null },
      ],
      teamResults: [],
      submissions: [],
      ...overrides.match,
    },
  }
}

function alphaLiveDraft(overrides: Partial<AlphaRefereeLiveScoreDraft> = {}): AlphaRefereeLiveScoreDraft {
  return {
    id: 'draft-1',
    match_id: 'match-1',
    assignment_id: 'assignment-1',
    referee_user_id: 'referee-user',
    status: 'open',
    correction_note: null,
    submitted_at: null,
    correction_requested_at: null,
    created_at: '2026-06-04T00:00:00.000Z',
    updated_at: '2026-06-04T00:00:00.000Z',
    player_stats: [
      {
        id: 'stat-a',
        draft_id: 'draft-1',
        match_id: 'match-1',
        user_id: 'user-a',
        side_index: 0,
        points: 8,
        rebounds: 3,
        assists: 2,
        blocks: 1,
        three_pointers_made: 2,
        created_at: '2026-06-04T00:00:00.000Z',
        updated_at: '2026-06-04T00:00:00.000Z',
      },
      {
        id: 'stat-b',
        draft_id: 'draft-1',
        match_id: 'match-1',
        user_id: 'user-b',
        side_index: 1,
        points: 5,
        rebounds: 1,
        assists: 1,
        blocks: 2,
        three_pointers_made: 1,
        created_at: '2026-06-04T00:00:00.000Z',
        updated_at: '2026-06-04T00:00:00.000Z',
      },
    ],
    ...overrides,
  }
}

function coopRunMatch(overrides: Partial<MatchWithRelations> = {}): MatchWithRelations {
  return {
    id: 'match-1',
    created_by: 'user-a',
    status: 'in_progress',
    activity_type: 'running',
    is_coop: true,
    stake: 0,
    match_participants: [
      { user_id: 'user-a', side: 0, stake_contribution: 0, accepted_at: '2026-05-13T00:00:00.000Z', is_active: false, rating_before: null, rating_after: null, users: null },
      { user_id: 'user-b', side: 0, stake_contribution: 0, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
    ],
    match_invites: [],
    match_submissions: [],
    ...overrides,
  } as MatchWithRelations
}

describe('co-op soft leave', () => {
  it('does not treat an inactive participant as still in the room', () => {
    const state = getMatchDetailState(coopRunMatch(), 'user-a')

    expect(state.myParticipant).toBeNull()
    expect(state.participants.map((participant) => participant.user_id)).toEqual(['user-b'])
  })

  it('blocks repeated leave actions after the participant is already inactive', () => {
    expect(canLeaveCoopRunMatch(coopRunMatch(), 'user-a')).toBe(false)
  })

  it('counts co-op run progress from active accepted teammates only', () => {
    const match = coopRunMatch({
      match_participants: [
        { user_id: 'user-a', side: 0, stake_contribution: 0, accepted_at: '2026-05-13T00:00:00.000Z', is_active: false, rating_before: null, rating_after: null, users: null },
        { user_id: 'user-b', side: 0, stake_contribution: 0, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
        { user_id: 'user-c', side: 0, stake_contribution: 0, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
      ],
      match_submissions: [
        runSubmission('user-a', 2000),
        runSubmission('user-b', 600),
      ],
    })

    expect(getCoopRunActiveTeamProgress(match)).toEqual({
      required: 2,
      submitted: 1,
      distanceMeters: 600,
    })
    expect(willCoopRunSubmitCompleteBelowMinimum(match, 'user-c', 350)).toBe(true)
    expect(willCoopRunSubmitCompleteBelowMinimum(match, 'user-c', 450)).toBe(false)
  })
})

describe('co-op run finish (creator force-settle)', () => {
  function finishableMatch(overrides: Partial<MatchWithRelations> = {}): MatchWithRelations {
    return coopRunMatch({
      created_by: 'user-a',
      status: 'in_progress',
      match_participants: [
        { user_id: 'user-a', side: 0, stake_contribution: 0, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
        { user_id: 'user-b', side: 0, stake_contribution: 0, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
      ],
      match_submissions: [runSubmission('user-a', 5000)],
      ...overrides,
    })
  }

  it('lets the creator finish once the active team cleared 1 km', () => {
    expect(canFinishCoopRunMatch(finishableMatch(), 'user-a')).toBe(true)
  })

  it('hides finish when the active team is still under 1 km', () => {
    const match = finishableMatch({ match_submissions: [runSubmission('user-a', 800)] })
    expect(canFinishCoopRunMatch(match, 'user-a')).toBe(false)
  })

  it('only the creator can finish', () => {
    expect(canFinishCoopRunMatch(finishableMatch(), 'user-b')).toBe(false)
  })

  it('cannot finish before the match is in progress', () => {
    expect(canFinishCoopRunMatch(finishableMatch({ status: 'accepted' }), 'user-a')).toBe(false)
  })
})

function runSubmission(userId: string, distanceMeters: number) {
  return {
    id: `submission-${userId}`,
    submitted_by: userId,
    winner_user_id: null,
    created_at: '2026-05-13T00:05:00.000Z',
    activity_session_id: `session-${userId}`,
    activity_sessions: {
      id: `session-${userId}`,
      activity_type: 'running',
      point_delta: 0,
      running_activity_details: {
        distance_meters: distanceMeters,
        moving_time_seconds: 180,
        pace_seconds_per_km: 300,
      },
      team_sport_activity_details: null,
      activity_session_media: [],
    },
  } as NonNullable<MatchWithRelations['match_submissions']>[number]
}

function pendingCorrectionRequest(requestedBy: string) {
  return {
    id: 'rc-1',
    requested_by: requestedBy,
    responded_by: null,
    status: 'pending' as const,
    proposed_winner_side: 1 as const,
    proposed_is_tie: false,
    proposed_side_0_score: 70,
    proposed_side_1_score: 80,
    proposed_score_log: null,
    requested_at: '',
    responded_at: null,
    expires_at: '',
  }
}

describe('result-phase mutual cancel', () => {
  it('can request mutual cancel in submitted status', () => {
    const match = teamReviewMatch({
      status: 'submitted',
      match_participants: [
        { user_id: 'user-a', side: 0, stake_contribution: 50, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
        { user_id: 'user-b', side: 1, stake_contribution: 50, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
      ],
    })
    expect(canRequestMutualCancel(match, 'user-a')).toBe(true)
  })

  it('can request mutual cancel in disputed status', () => {
    const match = teamReviewMatch({
      status: 'disputed',
      match_participants: [
        { user_id: 'user-a', side: 0, stake_contribution: 50, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
        { user_id: 'user-b', side: 1, stake_contribution: 50, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
      ],
    })
    expect(canRequestMutualCancel(match, 'user-a')).toBe(true)
  })

  it('cannot request mutual cancel when a pending cancel already exists', () => {
    const match = teamReviewMatch({
      status: 'submitted',
      match_participants: [
        { user_id: 'user-a', side: 0, stake_contribution: 50, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
        { user_id: 'user-b', side: 1, stake_contribution: 50, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
      ],
      match_cancel_requests: [
        { id: 'cr-1', requested_by: 'user-b', responded_by: null, status: 'pending', requested_at: '', responded_at: null, expires_at: '' },
      ],
    })
    expect(canRequestMutualCancel(match, 'user-a')).toBe(false)
  })
})

describe('result correction eligibility', () => {
  it('getPendingCorrectionRequest returns pending request or null', () => {
    const match = teamReviewMatch({ status: 'submitted', match_result_correction_requests: [pendingCorrectionRequest('user-a')] })
    expect(getPendingCorrectionRequest(match)?.id).toBe('rc-1')
    expect(getPendingCorrectionRequest(teamReviewMatch({ status: 'submitted' }))).toBeNull()
  })

  it('active participant can request correction when no pending correction exists', () => {
    const match = teamReviewMatch({
      status: 'submitted',
      match_participants: [
        { user_id: 'user-a', side: 0, stake_contribution: 50, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
        { user_id: 'user-b', side: 1, stake_contribution: 50, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
      ],
    })
    expect(canRequestResultCorrection(match, 'user-a')).toBe(true)
    expect(canRequestResultCorrection(match, 'user-b')).toBe(true)
  })

  it('cannot request a second correction while one is pending', () => {
    const match = teamReviewMatch({
      status: 'submitted',
      match_participants: [
        { user_id: 'user-a', side: 0, stake_contribution: 50, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
        { user_id: 'user-b', side: 1, stake_contribution: 50, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
      ],
      match_result_correction_requests: [pendingCorrectionRequest('user-a')],
    })
    expect(canRequestResultCorrection(match, 'user-b')).toBe(false)
  })

  it('cannot request correction in non-submitted/disputed status', () => {
    const match = teamReviewMatch({
      status: 'in_progress',
      match_participants: [
        { user_id: 'user-a', side: 0, stake_contribution: 50, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
        { user_id: 'user-b', side: 1, stake_contribution: 50, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
      ],
    })
    expect(canRequestResultCorrection(match, 'user-a')).toBe(false)
  })

  it('opposite-side participant can respond to a pending correction; requester cannot', () => {
    const match = teamReviewMatch({
      status: 'submitted',
      match_participants: [
        { user_id: 'user-a', side: 0, stake_contribution: 50, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
        { user_id: 'user-b', side: 1, stake_contribution: 50, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
      ],
      match_result_correction_requests: [pendingCorrectionRequest('user-a')],
    })
    expect(canRespondToResultCorrection(match, 'user-b')).toBe(true)
    expect(canRespondToResultCorrection(match, 'user-a')).toBe(false)
  })

  it('outsider cannot respond to a pending correction', () => {
    const match = teamReviewMatch({
      status: 'submitted',
      match_participants: [
        { user_id: 'user-a', side: 0, stake_contribution: 50, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
        { user_id: 'user-b', side: 1, stake_contribution: 50, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
      ],
      match_result_correction_requests: [pendingCorrectionRequest('user-a')],
    })
    expect(canRespondToResultCorrection(match, 'outsider')).toBe(false)
  })

  it('returns false for canRespondToResultCorrection when no pending correction exists', () => {
    const match = teamReviewMatch({
      status: 'submitted',
      match_participants: [
        { user_id: 'user-a', side: 0, stake_contribution: 50, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
        { user_id: 'user-b', side: 1, stake_contribution: 50, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
      ],
    })
    expect(canRespondToResultCorrection(match, 'user-b')).toBe(false)
  })
})

function pendingTeamCorrectionRequest(requestedSide: 0 | 1, requestedBy: string) {
  return {
    id: 'tcr-1',
    match_id: 'match-1',
    requested_by: requestedBy,
    requested_side: requestedSide,
    status: 'pending' as const,
    responded_by: null,
    created_at: '2026-06-28T00:00:00.000Z',
    expires_at: '2026-06-29T00:00:00.000Z',
    resolved_at: null,
  }
}

function basketballMatchWithBothSubmissions(overrides: Partial<MatchWithRelations> = {}): MatchWithRelations {
  return teamReviewMatch({
    status: 'in_progress',
    match_participants: [
      { user_id: 'user-a', side: 0, stake_contribution: 50, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
      { user_id: 'user-b', side: 1, stake_contribution: 50, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
    ],
    match_team_result_submissions: [
      { id: 'side-a', side_index: 0, submitted_by: 'user-a', team_score: 8, notes: null, proof_urls: [], accepted_by: null, accepted_at: null, created_at: '2026-05-13T00:00:00.000Z', updated_at: '2026-05-13T00:00:00.000Z' },
      { id: 'side-b', side_index: 1, submitted_by: 'user-b', team_score: 99, notes: null, proof_urls: [], accepted_by: null, accepted_at: null, created_at: '2026-05-13T00:00:00.000Z', updated_at: '2026-05-13T00:00:00.000Z' },
    ],
    ...overrides,
  })
}

describe('team result correction guards', () => {
  it('getPendingTeamResultCorrection returns pending request or null', () => {
    const matchWithPending = basketballMatchWithBothSubmissions({
      match_team_result_correction_requests: [pendingTeamCorrectionRequest(0, 'user-a')],
    })
    expect(getPendingTeamResultCorrection(matchWithPending)?.id).toBe('tcr-1')
    expect(getPendingTeamResultCorrection(basketballMatchWithBothSubmissions())).toBeNull()
  })

  it('active participant can request correction when both submissions exist and no pending request', () => {
    const match = basketballMatchWithBothSubmissions()
    expect(canRequestTeamResultCorrection(match, 'user-a')).toBe(true)
    expect(canRequestTeamResultCorrection(match, 'user-b')).toBe(true)
  })

  it('outsider cannot request team result correction', () => {
    expect(canRequestTeamResultCorrection(basketballMatchWithBothSubmissions(), 'outsider')).toBe(false)
  })

  it('cannot request team result correction when match is not in_progress', () => {
    const match = basketballMatchWithBothSubmissions({ status: 'submitted' })
    expect(canRequestTeamResultCorrection(match, 'user-a')).toBe(false)
  })

  it('cannot request when only one side has submitted', () => {
    const match = basketballMatchWithBothSubmissions({
      match_team_result_submissions: [
        { id: 'side-a', side_index: 0, submitted_by: 'user-a', team_score: 8, notes: null, proof_urls: [], accepted_by: null, accepted_at: null, created_at: '2026-05-13T00:00:00.000Z', updated_at: '2026-05-13T00:00:00.000Z' },
      ],
    })
    expect(canRequestTeamResultCorrection(match, 'user-a')).toBe(false)
  })

  it('cannot request a second correction while one is pending', () => {
    const matchWithPending = basketballMatchWithBothSubmissions({
      match_team_result_correction_requests: [pendingTeamCorrectionRequest(0, 'user-a')],
    })
    expect(canRequestTeamResultCorrection(matchWithPending, 'user-b')).toBe(false)
  })

  it('side 1 can respond to a side-0 correction request', () => {
    const matchWithPending = basketballMatchWithBothSubmissions({
      match_team_result_correction_requests: [pendingTeamCorrectionRequest(0, 'user-a')],
    })
    expect(canRespondTeamResultCorrection(matchWithPending, 'user-b')).toBe(true)
  })

  it('side 0 (requester) cannot respond to own request', () => {
    const matchWithPending = basketballMatchWithBothSubmissions({
      match_team_result_correction_requests: [pendingTeamCorrectionRequest(0, 'user-a')],
    })
    expect(canRespondTeamResultCorrection(matchWithPending, 'user-a')).toBe(false)
  })

  it('outsider cannot respond to a pending team result correction', () => {
    const matchWithPending = basketballMatchWithBothSubmissions({
      match_team_result_correction_requests: [pendingTeamCorrectionRequest(0, 'user-a')],
    })
    expect(canRespondTeamResultCorrection(matchWithPending, 'outsider')).toBe(false)
  })

  it('returns false for canRespondTeamResultCorrection when no pending request exists', () => {
    expect(canRespondTeamResultCorrection(basketballMatchWithBothSubmissions(), 'user-b')).toBe(false)
  })

  it('getMyTeamCorrectionToRespond returns the pending request for the opposing side', () => {
    const matchWithPending = basketballMatchWithBothSubmissions({
      match_team_result_correction_requests: [pendingTeamCorrectionRequest(0, 'user-a')],
    })
    expect(getMyTeamCorrectionToRespond(matchWithPending, 'user-b')?.id).toBe('tcr-1')
    expect(getMyTeamCorrectionToRespond(matchWithPending, 'user-a')).toBeNull()
    expect(getMyTeamCorrectionToRespond(basketballMatchWithBothSubmissions(), 'user-b')).toBeNull()
  })
})

describe('getRefereeAssignmentInProgress', () => {
  const base = { id: 'a1', match_id: 'm1', referee_user_id: 'u1', activity_type: 'basketball', assigned_by: 'h1', assigned_at: '', updated_at: '' } as const

  it('returns an invited assignment', () => {
    const match = { match_referee_assignments: [{ ...base, status: 'invited' }] } as never
    expect(getRefereeAssignmentInProgress(match)?.status).toBe('invited')
  })

  it('returns an assigned assignment', () => {
    const match = { match_referee_assignments: [{ ...base, status: 'assigned' }] } as never
    expect(getRefereeAssignmentInProgress(match)?.status).toBe('assigned')
  })

  it('returns null for declined/removed', () => {
    const match = { match_referee_assignments: [{ ...base, status: 'declined' }] } as never
    expect(getRefereeAssignmentInProgress(match)).toBeNull()
  })
})
