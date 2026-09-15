import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/users/userLookupService', () => ({
  normalizeHandle: (raw: string) => raw.trim().replace(/^@+/, '').toLowerCase(),
  validateHandleFormat: () => null,
}))

import type { MatchParticipant, MatchWithRelations } from '@/types/match'
import { buildMatchDetailPolicy } from './matchPagePolicy'

const NOW = '2026-05-19T00:00:00.000Z'

function participant(
  userId: string,
  side: 0 | 1,
  overrides: Partial<MatchParticipant> = {},
): MatchParticipant {
  return {
    user_id: userId,
    side,
    stake_contribution: 50,
    accepted_at: NOW,
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
    stake: 50,
    stake_currency: 'leaderboard_point',
    deadline: '2026-05-20T00:00:00.000Z',
    status: 'pending',
    accepted_at: null,
    started_at: null,
    winner_user_id: null,
    is_tie: false,
    is_coop: false,
    team_size_per_side: 1,
    join_mode: 'open',
    join_code: null,
    entry_code: null,
    match_participants: [participant('host', 0, { accepted_at: null })],
    match_invites: [],
    match_submissions: [],
    match_team_result_submissions: [],
    match_cancel_requests: [],
    match_participant_contributions: [],
    match_abuse_reports: [],
    ...overrides,
  }
}

describe('buildMatchDetailPolicy', () => {
  it('keeps join eligibility in a page-level policy contract', () => {
    const policy = buildMatchDetailPolicy(match(), 'guest')

    expect(policy.join).toEqual({ allowed: true, cta: 'Join' })
    expect(policy.cancelMatch).toEqual({
      allowed: false,
      reason: 'not_match_host',
      cta: 'Cancel match',
    })
  })

  it('blocks join when the current user already has a pending invite', () => {
    const policy = buildMatchDetailPolicy(match({
      match_invites: [
        {
          id: 'invite-1',
          match_id: 'match-1',
          invitee_user_id: 'guest',
          inviter_user_id: 'host',
          side: 1,
          status: 'pending',
          sent_at: NOW,
          responded_at: null,
        },
      ],
    }), 'guest')

    expect(policy.join).toEqual({
      allowed: false,
      reason: 'pending_invite_exists',
      cta: 'Respond to invite',
    })
  })

  it('moves start gating out of the screen with an actionable reason', () => {
    const notReady = buildMatchDetailPolicy(match({
      status: 'accepted',
      match_participants: [
        participant('host', 0),
      ],
    }), 'host')

    const ready = buildMatchDetailPolicy(match({
      status: 'accepted',
      match_participants: [
        participant('host', 0),
        participant('guest', 1),
      ],
    }), 'host')

    expect(notReady.startMatch).toMatchObject({
      allowed: false,
      reason: 'sides_not_ready',
      cta: 'START',
      message: expect.any(String),
    })
    expect(ready.startMatch).toEqual({ allowed: true, cta: 'START' })
  })

  it('allows team-sport hosts to start once current lobby players accept without filling every slot', () => {
    const policy = buildMatchDetailPolicy(match({
      status: 'pending',
      team_size_per_side: 3,
      match_participants: [
        participant('host', 0),
        participant('guest', 1),
      ],
    }), 'host')

    expect(policy.startMatch).toEqual({ allowed: true, cta: 'START' })
  })

  it('allows FFA running to start from one accepted pool instead of two sides', () => {
    const policy = buildMatchDetailPolicy(match({
      activity_type: 'running',
      rule_params: { running_mode: 'ffa', mode: 'sensor', winner_policy: 'winner_takes_pot' },
      status: 'accepted',
      team_size_per_side: 3,
      match_participants: [
        participant('host', 0),
        participant('runner-2', 0),
        participant('runner-3', 0),
      ],
    }), 'host')

    expect(policy.startMatch).toEqual({ allowed: true, cta: 'START' })
  })

  it('blocks a co-op crew run from starting with a single runner', () => {
    const policy = buildMatchDetailPolicy(match({
      activity_type: 'running',
      is_coop: true,
      stake: 0,
      rule_params: { running_mode: 'coop', mode: 'sensor', cooperative: true },
      status: 'accepted',
      team_size_per_side: 4,
      match_participants: [
        participant('host', 0),
      ],
    }), 'host')

    expect(policy.startMatch).toMatchObject({
      allowed: false,
      reason: 'coop_needs_min_runners',
    })
  })

  it('allows a co-op crew run to start once at least two runners have accepted', () => {
    const policy = buildMatchDetailPolicy(match({
      activity_type: 'running',
      is_coop: true,
      stake: 0,
      rule_params: { running_mode: 'coop', mode: 'sensor', cooperative: true },
      status: 'accepted',
      team_size_per_side: 4,
      match_participants: [
        participant('host', 0),
        participant('runner-2', 0),
      ],
    }), 'host')

    expect(policy.startMatch).toEqual({ allowed: true, cta: 'START' })
  })

  it('does not block start when the host stake exceeds their public Rally Score', () => {
    const policy = buildMatchDetailPolicy(match({
      status: 'accepted',
      stake: 60,
      match_participants: [
        participant('host', 0, { stake_contribution: 60 }),
        participant('guest', 1),
      ],
    }), 'host', {
      user_id: 'host',
      leaderboard_score: 20,
      spendable_points: 120,
      locked_points: 0,
      available_spendable: 120,
      credit_balance: 0,
      locked_credits: 0,
      available_credits: 0,
    })

    expect(policy.startMatch).toEqual({ allowed: true, cta: 'START' })
  })

  it('does not use another player public Rally Score as a start gate', () => {
    const policy = buildMatchDetailPolicy(match({
      status: 'accepted',
      stake: 60,
      match_participants: [
        participant('host', 0, { stake_contribution: 60 }),
        participant('guest', 1, {
          stake_contribution: 60,
          users: {
            id: 'guest',
            display_name: 'Guest',
            email: 'guest@example.com',
            handle: 'guest',
            leaderboard_score: 20,
          },
        }),
      ],
    }), 'host')

    expect(policy.startMatch).toEqual({ allowed: true, cta: 'START' })
  })

  it('reports manage actions as decisions instead of page-local booleans', () => {
    const policy = buildMatchDetailPolicy(match({
      status: 'in_progress',
      match_participants: [
        participant('host', 0),
        participant('guest', 1),
      ],
      match_cancel_requests: [
        {
          id: 'cancel-1',
          requested_by: 'host',
          responded_by: null,
          status: 'pending',
          requested_at: NOW,
          responded_at: null,
          expires_at: '2026-05-20T00:00:00.000Z',
        },
      ],
    }), 'guest')

    expect(policy.requestMutualCancel).toEqual({
      allowed: false,
      reason: 'cancel_request_pending',
      cta: 'Request cancel',
    })
    expect(policy.respondMutualCancel).toEqual({
      allowed: true,
      cta: 'Respond to cancel request',
    })
  })

  it('keeps submit result routing behind a decision for page shells', () => {
    expect(buildMatchDetailPolicy(match({ status: 'pending' }), 'host').submitResult).toEqual({
      allowed: false,
      reason: 'match_not_active',
      cta: 'Submit result',
    })
    expect(buildMatchDetailPolicy(match({ status: 'accepted' }), 'host').submitResult).toEqual({
      allowed: true,
      cta: 'Submit result',
    })
    expect(buildMatchDetailPolicy(match({ status: 'in_progress' }), 'host').submitResult).toEqual({
      allowed: true,
      cta: 'Submit result',
    })
  })
})
