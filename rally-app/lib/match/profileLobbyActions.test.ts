import { describe, expect, it } from 'vitest'
import type { MatchParticipant, MatchStatus, MatchWithRelations } from '@/types/match'
import { getProfileLobbyKickEligibility } from './profileLobbyActions'

function participant(userId: string, overrides: Partial<MatchParticipant> = {}): MatchParticipant {
  return {
    user_id: userId,
    side: 0,
    stake_contribution: 30,
    accepted_at: null,
    is_active: true,
    rating_before: null,
    rating_after: null,
    users: null,
    ...overrides,
  }
}

function match(overrides: Partial<MatchWithRelations> = {}): MatchWithRelations {
  return {
    id: 'match-1',
    source: 'legacy_standalone',
    created_by: 'host',
    activity_type: 'basketball',
    rule_text: null,
    rule_params: {},
    stake: 30,
    stake_currency: 'leaderboard_point',
    deadline: '2026-06-05T00:00:00.000Z',
    status: 'pending',
    accepted_at: null,
    started_at: null,
    winner_user_id: null,
    is_tie: false,
    is_coop: false,
    team_size_per_side: 3,
    join_mode: 'code',
    join_code: 'ABC123',
    entry_code: null,
    match_participants: [participant('host'), participant('target')],
    match_invites: [],
    match_submissions: [],
    match_team_result_submissions: [],
    match_cancel_requests: [],
    match_participant_contributions: [],
    match_abuse_reports: [],
    ...overrides,
  }
}

describe('getProfileLobbyKickEligibility', () => {
  it.each<MatchStatus>(['pending', 'accepted'])('allows the host to kick an active participant while %s', (status) => {
    const eligibility = getProfileLobbyKickEligibility(match({ status }), 'host', 'target')

    expect(eligibility.allowed).toBe(true)
  })

  it('rejects non-host actors', () => {
    expect(getProfileLobbyKickEligibility(match(), 'guest', 'target')).toEqual({
      allowed: false,
      reason: 'not_match_host',
    })
  })

  it('rejects kicking self', () => {
    expect(getProfileLobbyKickEligibility(match(), 'host', 'host')).toEqual({
      allowed: false,
      reason: 'cannot_kick_self',
    })
  })

  it('rejects matches after play starts', () => {
    expect(getProfileLobbyKickEligibility(match({ status: 'in_progress' }), 'host', 'target')).toEqual({
      allowed: false,
      reason: 'match_not_kickable',
    })
  })

  it('rejects missing or inactive target participants', () => {
    expect(getProfileLobbyKickEligibility(match(), 'host', 'missing')).toEqual({
      allowed: false,
      reason: 'target_not_participant',
    })
    expect(getProfileLobbyKickEligibility(match({
      match_participants: [participant('host'), participant('target', { is_active: false })],
    }), 'host', 'target')).toEqual({
      allowed: false,
      reason: 'target_not_participant',
    })
  })
})
