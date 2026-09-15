import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/users/userLookupService', () => ({
  normalizeHandle: (raw: string) => raw.trim().replace(/^@+/, '').toLowerCase(),
  validateHandleFormat: () => null,
}))

import type { MatchInvite, MatchParticipant, MatchRefereeAssignment, MatchWithRelations } from '@/types/match'
import { getMatchDetailState } from './matchRules'
import {
  buildRunningLobbyActions,
  buildRunningLobbyLayout,
  buildRunningLobbyModeCards,
} from './runningLobbyLayout'

function participant(
  userId: string,
  side: 0 | 1,
  overrides: Partial<MatchParticipant> = {},
): MatchParticipant {
  return {
    user_id: userId,
    side,
    stake_contribution: 50,
    accepted_at: null,
    joined_at: `2026-06-14T00:0${userId.slice(-1) || 0}:00.000Z`,
    is_active: true,
    rating_before: null,
    rating_after: null,
    users: {
      id: userId,
      display_name: userId,
      email: `${userId}@example.com`,
      handle: userId,
      avatar_url: null,
      leaderboard_score: 100,
    },
    ...overrides,
  }
}

function invite(
  id: string,
  side: 0 | 1,
): MatchInvite {
  return {
    id,
    match_id: 'match-1',
    invitee_user_id: `${id}-user`,
    inviter_user_id: 'user-1',
    side,
    status: 'pending',
    sent_at: '2026-06-14T00:00:00.000Z',
    responded_at: null,
    invitee: {
      id: `${id}-user`,
      display_name: id,
      email: `${id}@example.com`,
      handle: id,
      avatar_url: null,
    },
  }
}

function match(overrides: Partial<MatchWithRelations> = {}): MatchWithRelations {
  return {
    id: 'match-1',
    source: 'legacy_standalone',
    created_by: 'user-1',
    activity_type: 'running',
    rule_text: null,
    rule_params: { running_mode: 'race', mode: 'sensor', distance_meters: 5000 },
    stake: 50,
    stake_currency: 'leaderboard_point',
    deadline: '2026-06-15T00:00:00.000Z',
    status: 'pending',
    accepted_at: null,
    started_at: null,
    winner_user_id: null,
    is_tie: false,
    is_coop: false,
    team_size_per_side: 1,
    join_mode: 'open',
    join_code: 'ABC123',
    entry_code: null,
    match_participants: [],
    match_invites: [],
    match_submissions: [],
    match_team_result_submissions: [],
    match_cancel_requests: [],
    match_participant_contributions: [],
    match_abuse_reports: [],
    ...overrides,
  }
}

function refereeAssignment(overrides: Partial<MatchRefereeAssignment> = {}): MatchRefereeAssignment {
  return {
    id: 'assignment-1',
    match_id: 'match-1',
    referee_user_id: 'ref-1',
    activity_type: 'running',
    assigned_by: 'user-1',
    status: 'assigned',
    assigned_at: '2026-06-14T00:00:00.000Z',
    updated_at: '2026-06-14T00:00:00.000Z',
    referee: {
      id: 'ref-1',
      display_name: 'Ref One',
      email: 'ref@example.com',
      handle: 'refone',
      avatar_url: null,
    },
    ...overrides,
  }
}

describe('running lobby mode cards', () => {
  it('maps the selected state and locked labels for alpha cards', () => {
    const cards = buildRunningLobbyModeCards({
      runningMode: 'race',
      runningResultMode: 'sensor_pace_5k',
      canUseCrewMapAlpha: false,
      canUseOneVOne5kPaceAlpha: true,
      canUseRefereeRunResultAlpha: false,
      gateLabels: {
        running_crew_map_alpha: 'ALLOWLIST',
        running_referee_result_alpha: 'CLOSED',
      },
    })

    expect(cards.map((card) => [card.key, card.enabled, card.selected, card.lockedLabel])).toEqual([
      ['crew_map', false, false, 'ALLOWLIST'],
      ['one_v_one_5k', true, true, null],
      ['referee_result', false, false, 'CLOSED'],
    ])
  })
})

describe('running lobby slot layout', () => {
  it('builds crew slots from occupied, pending, and empty runner positions', () => {
    const room = match({
      rule_params: { running_mode: 'coop', mode: 'sensor' },
      is_coop: true,
      stake: 0,
      team_size_per_side: 5,
      match_participants: [
        participant('user-1', 0, { accepted_at: '2026-06-14T00:01:00.000Z' }),
        participant('user-2', 0),
      ],
      match_invites: [invite('invite-1', 0)],
    })
    const layout = buildRunningLobbyLayout(room, getMatchDetailState(room, 'user-1'), 'user-1')

    expect(layout?.mode).toBe('crew_map')
    expect(layout?.slots).toHaveLength(5)
    expect(layout?.slots.map((slot) => slot.state)).toEqual(['occupied', 'occupied', 'pending', 'open', 'open'])
    expect(layout?.readyCountLabel).toBe('1/5')
    expect(layout?.openRunnerSlots).toBe(2)
  })

  it('builds only A/B runner slots for 1v1 5K pace rooms', () => {
    const room = match({
      match_participants: [
        participant('user-1', 0),
        participant('user-2', 1),
      ],
    })
    const layout = buildRunningLobbyLayout(room, getMatchDetailState(room, 'user-1'), 'user-1')

    expect(layout?.mode).toBe('one_v_one_5k')
    expect(layout?.slots).toHaveLength(2)
    expect(layout?.slots.map((slot) => slot.shortLabel)).toEqual(['A', 'B'])
    expect(layout?.refereeSlot).toBeNull()
  })

  it('adds a referee slot for manual referee running rooms', () => {
    const room = match({
      rule_params: { running_mode: 'race', mode: 'manual', label: 'Referee Run Result' },
      match_participants: [participant('user-1', 0)],
      match_invites: [invite('invite-1', 1)],
    })
    const layout = buildRunningLobbyLayout(
      room,
      getMatchDetailState(room, 'user-1'),
      'user-1',
      { refereeAssignment: refereeAssignment() },
    )

    expect(layout?.mode).toBe('referee_result')
    expect(layout?.slots.map((slot) => slot.state)).toEqual(['occupied', 'pending'])
    expect(layout?.refereeSlot).toMatchObject({
      state: 'assigned',
      shortLabel: 'REF',
      referee: { name: 'Ref One' },
    })
  })

  it('marks the referee slot as invited (pending) before the referee accepts', () => {
    const room = match({
      rule_params: { running_mode: 'race', mode: 'manual', label: 'Referee Run Result' },
      match_participants: [participant('user-1', 0)],
      match_invites: [invite('invite-1', 1)],
    })
    const layout = buildRunningLobbyLayout(
      room,
      getMatchDetailState(room, 'user-1'),
      'user-1',
      { refereeAssignment: refereeAssignment({ status: 'invited' }) },
    )

    expect(layout?.refereeSlot).toMatchObject({
      state: 'invited',
      shortLabel: 'REF',
      referee: { name: 'Ref One' },
    })
  })
})

describe('running lobby actions', () => {
  it('surfaces join, invite, stake, ready, start, and danger actions from existing state', () => {
    expect(buildRunningLobbyActions({
      isParticipant: false,
      isHost: false,
      canJoin: true,
      firstJoinSide: 1,
      canStart: false,
      canInvite: false,
      myAccepted: false,
      canEditStake: false,
      canLeave: false,
      canCancel: false,
    }).primary).toEqual({ key: 'join', side: 1 })

    expect(buildRunningLobbyActions({
      isParticipant: true,
      isHost: true,
      canJoin: false,
      firstJoinSide: 0,
      canStart: true,
      canInvite: true,
      myAccepted: true,
      canEditStake: true,
      canLeave: false,
      canCancel: true,
    })).toMatchObject({
      primary: { key: 'start' },
      sidecar: { key: 'stake' },
      secondary: [{ key: 'invite' }, { key: 'cancel' }],
    })
  })
})
