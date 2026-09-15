import { describe, expect, it } from 'vitest'
import { buildRematchParams } from './rematch'
import type { MatchParticipant, MatchWithRelations } from '@/types/match'

function participant(userId: string, side: 0 | 1, handle: string, name: string): MatchParticipant {
  return {
    user_id: userId,
    side,
    stake_contribution: 50,
    accepted_at: null,
    rating_before: null,
    rating_after: null,
    users: { id: userId, display_name: name, email: '', handle, avatar_url: null },
  }
}

function baseMatch(overrides: Partial<MatchWithRelations>): MatchWithRelations {
  return {
    id: 'm1',
    created_by: 'me',
    activity_type: 'basketball',
    rule_text: null,
    rule_params: {},
    stake: 80,
    stake_currency: 'points',
    deadline: '',
    status: 'settled',
    accepted_at: null,
    started_at: null,
    winner_user_id: null,
    is_tie: false,
    is_coop: false,
    team_size_per_side: 1,
    join_mode: 'open',
    join_code: null,
    entry_code: null,
    match_participants: [],
    match_submissions: [],
    ...overrides,
  } as MatchWithRelations
}

describe('buildRematchParams', () => {
  it('includes the single opponent for a 1v1 match', () => {
    const match = baseMatch({
      team_size_per_side: 1,
      match_participants: [
        participant('me', 0, 'me_h', 'Me'),
        participant('opp', 1, 'opp_h', 'Opp'),
      ],
    })
    const params = buildRematchParams(match, 'me')
    expect(params).toEqual({
      invite: 'opp_h',
      inviteName: 'Opp',
      inviteUserId: 'opp',
      activity: 'basketball',
      stake: '80',
      teamSize: '1',
      rematchOf: 'm1',
    })
  })

  it('omits the opponent for a team match (>1 per side)', () => {
    const match = baseMatch({
      team_size_per_side: 3,
      match_participants: [
        participant('me', 0, 'me_h', 'Me'),
        participant('a', 0, 'a_h', 'A'),
        participant('x', 1, 'x_h', 'X'),
        participant('y', 1, 'y_h', 'Y'),
      ],
    })
    const params = buildRematchParams(match, 'me')
    expect(params.invite).toBeUndefined()
    expect(params).toMatchObject({ activity: 'basketball', stake: '80', teamSize: '3', rematchOf: 'm1' })
  })

  it('omits the opponent for a coop match', () => {
    const match = baseMatch({
      is_coop: true,
      match_participants: [
        participant('me', 0, 'me_h', 'Me'),
        participant('opp', 1, 'opp_h', 'Opp'),
      ],
    })
    expect(buildRematchParams(match, 'me').invite).toBeUndefined()
  })
})
