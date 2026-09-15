import { describe, expect, it } from 'vitest'

import type {
  AlphaRefereePlayerStatDraft,
  MatchParticipant,
  MatchTeamResultSubmission,
  PlayerScoreDraft,
  Side,
} from '@/types/match'
import {
  buildBasketballLiveStatsByUser,
  buildNoRefereeBasketballStats,
  canEditBasketballLiveStat,
  canSubmitBasketballEndGame,
  getBasketballLiveScoreBySide,
  hasBothTeamResultSubmissions,
  isPlayerScoreDraftSubmittedForSide,
} from './basketballLiveScoring'

const NOW = '2026-06-13T10:00:00.000Z'

function participant(userId: string, side: Side): MatchParticipant {
  return {
    user_id: userId,
    side,
    stake_contribution: 30,
    accepted_at: NOW,
    joined_at: NOW,
    is_active: true,
    rating_before: null,
    rating_after: null,
    users: null,
  }
}

function refereeStat(
  userId: string,
  side: Side,
  points: number,
  overrides: Partial<AlphaRefereePlayerStatDraft> = {},
): AlphaRefereePlayerStatDraft {
  return {
    id: `stat-${userId}`,
    draft_id: 'draft-1',
    match_id: 'match-1',
    user_id: userId,
    side_index: side,
    points,
    rebounds: 0,
    assists: 0,
    blocks: 0,
    three_pointers_made: 0,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  }
}

function playerDraft(
  side: Side,
  status: PlayerScoreDraft['status'],
  basketballStats: PlayerScoreDraft['basketball_stats'],
): PlayerScoreDraft {
  return {
    id: `draft-${side}`,
    match_id: 'match-1',
    activity_type: 'basketball',
    side_index: side,
    submitted_by: side === 0 ? 'a1' : 'b1',
    status,
    team_score: basketballStats.reduce((total, stat) => total + stat.points, 0),
    basketball_stats: basketballStats,
    badminton_sets: [],
    note: null,
    proof_urls: [],
    submitted_at: status === 'submitted' ? NOW : null,
    created_at: NOW,
    updated_at: NOW,
  }
}

function resultSubmission(side: Side): MatchTeamResultSubmission {
  return {
    id: `submission-${side}`,
    side_index: side,
    submitted_by: side === 0 ? 'a1' : 'b1',
    team_score: side === 0 ? 21 : 18,
    notes: null,
    proof_urls: [],
    accepted_by: null,
    accepted_at: null,
    created_at: NOW,
    updated_at: NOW,
  }
}

describe('basketball live scoring helpers', () => {
  it('updates court totals from player PTS', () => {
    const participants = [
      participant('a1', 0),
      participant('a2', 0),
      participant('b1', 1),
    ]
    const stats = buildBasketballLiveStatsByUser({
      participants,
      refereeStatDrafts: [
        refereeStat('a1', 0, 2),
        refereeStat('a2', 0, 3),
        refereeStat('b1', 1, 1),
      ],
    })

    expect(getBasketballLiveScoreBySide(participants, stats)).toEqual({ 0: 5, 1: 1 })
  })

  it('allows no-referee players to edit only their own side before submit', () => {
    expect(canEditBasketballLiveStat({
      matchStatus: 'in_progress',
      hasReferee: false,
      refereeCanEdit: false,
      currentUserSide: 0,
      targetSide: 0,
    })).toBe(true)

    expect(canEditBasketballLiveStat({
      matchStatus: 'in_progress',
      hasReferee: false,
      refereeCanEdit: false,
      currentUserSide: 0,
      targetSide: 1,
    })).toBe(false)
  })

  it('lets the active referee edit both sides', () => {
    expect(canEditBasketballLiveStat({
      matchStatus: 'in_progress',
      hasReferee: true,
      refereeCanEdit: true,
      currentUserSide: null,
      targetSide: 1,
    })).toBe(true)
  })

  it('disables end game until at least one score or stat exists', () => {
    const participants = [participant('a1', 0), participant('b1', 1)]
    const blankStats = buildBasketballLiveStatsByUser({ participants })

    expect(canSubmitBasketballEndGame({
      matchStatus: 'in_progress',
      hasReferee: false,
      refereeCanSubmit: false,
      playerCanSubmit: true,
      currentUserSide: 0,
      participants,
      statsByUser: blankStats,
    })).toBe(false)

    const withAssist = {
      ...blankStats,
      a1: { ...blankStats.a1, assists: 1 },
    }
    expect(canSubmitBasketballEndGame({
      matchStatus: 'in_progress',
      hasReferee: false,
      refereeCanSubmit: false,
      playerCanSubmit: true,
      currentUserSide: 0,
      participants,
      statsByUser: withAssist,
    })).toBe(true)
  })

  it('requires both side submissions before score review can accept', () => {
    expect(hasBothTeamResultSubmissions([resultSubmission(0)])).toBe(false)
    expect(hasBothTeamResultSubmissions([resultSubmission(0), resultSubmission(1)])).toBe(true)
  })

  it('builds no-referee payload only for the submitting side', () => {
    const participants = [participant('a1', 0), participant('b1', 1)]
    const stats = buildBasketballLiveStatsByUser({
      participants,
      playerScoreDrafts: [
        playerDraft(0, 'open', [{
          userId: 'a1',
          points: 3,
          rebounds: 1,
          assists: 0,
          blocks: 0,
          threePointersMade: 1,
        }]),
        playerDraft(1, 'open', [{
          userId: 'b1',
          points: 2,
          rebounds: 0,
          assists: 0,
          blocks: 0,
          threePointersMade: 0,
        }]),
      ],
    })

    expect(buildNoRefereeBasketballStats(participants, 0, stats)).toEqual([{
      userId: 'a1',
      points: 3,
      rebounds: 1,
      assists: 0,
      blocks: 0,
      threePointersMade: 1,
    }])
  })

  it('locks no-referee live editing after that side submits', () => {
    const draft = playerDraft(0, 'submitted', [])

    expect(isPlayerScoreDraftSubmittedForSide([draft], 0)).toBe(true)
    expect(canEditBasketballLiveStat({
      matchStatus: 'in_progress',
      hasReferee: false,
      refereeCanEdit: false,
      currentUserSide: 0,
      targetSide: 0,
      ownSideSubmitted: true,
    })).toBe(false)
  })
})
