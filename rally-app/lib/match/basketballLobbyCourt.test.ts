import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/users/userLookupService', () => ({
  normalizeHandle: (raw: string) => raw.trim().replace(/^@+/, '').toLowerCase(),
  validateHandleFormat: () => null,
}))

import type { MatchParticipant, MatchWithRelations } from '@/types/match'
import { getMatchDetailState } from './matchRules'
import {
  buildBasketballLobbyCourt,
  buildTeamSportLobbyCourt,
  formatLobbyPositionJersey,
  getLobbyEmptySlotLabel,
  groupSpotsBySide,
  isBasketballLobbyPositionKey,
  isTeamSportLobbyPositionKey,
} from './basketballLobbyCourt'
import type { BasketballLobbyCourtLayout, BasketballLobbyCourtSpot } from './basketballLobbyCourt'

function spotFixture(side: 0 | 1, positionKey: BasketballLobbyCourtSpot['positionKey']): BasketballLobbyCourtSpot {
  return { side, positionKey, label: positionKey, shortLabel: positionKey.toUpperCase(), x: 0, y: 0, participant: null, selectable: false }
}

describe('groupSpotsBySide', () => {
  it('splits spots into exactly two side groups, side 0 then side 1, preserving order', () => {
    const layout = {
      activityType: 'basketball', kind: '5v5', teamSize: 5,
      spots: [spotFixture(0, 'pg'), spotFixture(1, 'pg'), spotFixture(0, 'sg'), spotFixture(1, 'sg')],
      invites: [],
    } as unknown as BasketballLobbyCourtLayout

    const groups = groupSpotsBySide(layout)

    expect(groups.map((g) => g.side)).toEqual([0, 1])
    expect(groups[0].spots.map((s) => s.positionKey)).toEqual(['pg', 'sg'])
    expect(groups[1].spots.map((s) => s.positionKey)).toEqual(['pg', 'sg'])
  })

  it('returns both groups even when a side has no spots', () => {
    const layout = {
      activityType: 'basketball', kind: '5v5', teamSize: 5,
      spots: [spotFixture(0, 'pg')], invites: [],
    } as unknown as BasketballLobbyCourtLayout

    const groups = groupSpotsBySide(layout)
    expect(groups).toHaveLength(2)
    expect(groups[1].spots).toEqual([])
  })
})

describe('lobby marker presentation', () => {
  it('hides the empty court short label in preferred-position mode', () => {
    expect(getLobbyEmptySlotLabel(true, 'PG')).toBeNull()
    expect(getLobbyEmptySlotLabel(false, 'PG')).toBe('PG')
  })

  it('renders a jersey without a leading separator when preferred position is null', () => {
    expect(formatLobbyPositionJersey(null, 12)).toBe('12')
  })

  it('renders non-null position and jersey with the lobby separator', () => {
    expect(formatLobbyPositionJersey('SF', 12)).toBe('SF · 12')
  })
})

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

function match(overrides: Partial<MatchWithRelations> = {}): MatchWithRelations {
  return {
    id: 'match-1',
    source: 'legacy_standalone',
    created_by: 'user-1',
    activity_type: 'basketball',
    rule_text: null,
    rule_params: {},
    stake: 50,
    stake_currency: 'leaderboard_point',
    deadline: '2026-05-21T00:00:00.000Z',
    status: 'pending',
    accepted_at: null,
    started_at: null,
    winner_user_id: null,
    is_tie: false,
    is_coop: false,
    team_size_per_side: 3,
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

describe('basketball lobby court presentation', () => {
  it('builds 3v3 spots and fills unselected players deterministically', () => {
    const room = match({
      team_size_per_side: 3,
      match_participants: [
        participant('user-2', 0, { joined_at: '2026-05-20T00:02:00.000Z' }),
        participant('user-1', 0, { joined_at: '2026-05-20T00:01:00.000Z' }),
        participant('user-3', 1, { joined_at: '2026-05-20T00:03:00.000Z' }),
      ],
    })
    const layout = buildBasketballLobbyCourt(room, getMatchDetailState(room, 'user-1'), 'user-1')

    expect(layout?.kind).toBe('3v3')
    expect(layout?.spots).toHaveLength(6)
    expect(layout?.spots.find((spot) => spot.side === 0 && spot.positionKey === 'pg')?.participant?.userId)
      .toBe('user-1')
    expect(layout?.spots.find((spot) => spot.side === 0 && spot.positionKey === 'sf')?.participant?.userId)
      .toBe('user-2')
  })

  it('uses persisted position before fallback order', () => {
    const room = match({
      team_size_per_side: 5,
      match_participants: [
        participant('user-1', 0, { lobby_position_key: 'c' }),
        participant('user-2', 0),
      ],
    })
    const layout = buildBasketballLobbyCourt(room, getMatchDetailState(room, 'user-1'), 'user-1')

    expect(layout?.kind).toBe('5v5')
    expect(layout?.spots).toHaveLength(10)
    expect(layout?.spots.find((spot) => spot.side === 0 && spot.positionKey === 'c')?.participant?.userId)
      .toBe('user-1')
    expect(layout?.spots.find((spot) => spot.side === 0 && spot.positionKey === 'pg')?.participant?.userId)
      .toBe('user-2')
  })

  it('passes jersey number and leaderboard score to court markers', () => {
    const room = match({
      match_participants: [
        participant('user-1', 0, {
          stake_contribution: 70,
          users: {
            id: 'user-1',
            display_name: 'Kai Court',
            email: 'kai@example.com',
            handle: 'kai',
            avatar_url: 'https://example.com/kai.png',
            jersey_number: 7,
            leaderboard_score: 880,
          },
        }),
      ],
    })
    const layout = buildBasketballLobbyCourt(room, getMatchDetailState(room, 'user-1'), 'user-1')
    const me = layout?.spots.find((spot) => spot.participant?.userId === 'user-1')?.participant

    expect(me?.name).toBe('Kai Court')
    expect(me?.jerseyNumber).toBe(7)
    expect(me?.leaderboardScore).toBe(880)
    expect(me?.stakePoints).toBe(70)
    expect(me?.avatarUrl).toBe('https://example.com/kai.png')
    expect(me?.isMe).toBe(true)
  })

  it('carries the spot side onto the participant token', () => {
    const room = match({
      match_participants: [
        participant('user-1', 0),
        participant('user-2', 1),
      ],
    })
    const layout = buildBasketballLobbyCourt(room, getMatchDetailState(room, 'user-1'), 'user-1')

    const occupiedSpots = layout?.spots.filter((spot) => spot.participant) ?? []
    expect(occupiedSpots.length).toBeGreaterThan(0)
    for (const spot of occupiedSpots) {
      expect(spot.participant?.side).toBe(spot.side)
    }
  })

  it('marks the host marker so host kick affordances can skip it', () => {
    const room = match({
      match_participants: [
        participant('user-1', 0),
        participant('user-2', 1),
      ],
    })
    const layout = buildBasketballLobbyCourt(room, getMatchDetailState(room, 'user-1'), 'user-1')

    expect(layout?.spots.find((spot) => spot.participant?.userId === 'user-1')?.participant)
      .toMatchObject({ isHost: true, isMe: true })
    expect(layout?.spots.find((spot) => spot.participant?.userId === 'user-2')?.participant)
      .toMatchObject({ isHost: false, isMe: false })
  })

  it('marks only other-side empty spots as selectable for 3v3 (team-switch only, no position picking)', () => {
    const room = match({
      team_size_per_side: 3,
      match_participants: [
        participant('user-1', 0, { lobby_position_key: 'pg' }),
        participant('user-2', 1, { lobby_position_key: 'pg' }),
      ],
    })
    const layout = buildBasketballLobbyCourt(room, getMatchDetailState(room, 'user-1'), 'user-1')

    expect(layout?.spots.find((spot) => spot.side === 0 && spot.positionKey === 'sf')?.selectable)
      .toBe(false)
    expect(layout?.spots.find((spot) => spot.side === 1 && spot.positionKey === 'sf')?.selectable)
      .toBe(true)
    expect(layout?.spots.find((spot) => spot.side === 0 && spot.positionKey === 'pg')?.selectable)
      .toBe(false)
  })

  it('keeps cross-side movement locked once the room is accepted', () => {
    const room = match({
      status: 'accepted',
      team_size_per_side: 3,
      match_participants: [
        participant('user-1', 0, { lobby_position_key: 'pg', accepted_at: '2026-05-20T00:10:00.000Z' }),
        participant('user-2', 1, { lobby_position_key: 'pg', accepted_at: '2026-05-20T00:11:00.000Z' }),
      ],
    })
    const layout = buildBasketballLobbyCourt(room, getMatchDetailState(room, 'user-1'), 'user-1')

    expect(layout?.spots.find((spot) => spot.side === 0 && spot.positionKey === 'sf')?.selectable)
      .toBe(false)
    expect(layout?.spots.find((spot) => spot.side === 1 && spot.positionKey === 'sf')?.selectable)
      .toBe(false)
  })

  it('keeps the court surface during live scoring and locks position edits', () => {
    const room = match({
      status: 'in_progress',
      team_size_per_side: 3,
      match_participants: [
        participant('user-1', 0, { lobby_position_key: 'pg', accepted_at: '2026-05-20T00:10:00.000Z' }),
        participant('user-2', 1, { lobby_position_key: 'pg', accepted_at: '2026-05-20T00:11:00.000Z' }),
      ],
    })
    const layout = buildBasketballLobbyCourt(room, getMatchDetailState(room, 'user-1'), 'user-1', {
      livePointsByUser: { 'user-1': 7, 'user-2': 5 },
    })

    expect(layout?.kind).toBe('3v3')
    expect(layout?.spots.find((spot) => spot.side === 0 && spot.positionKey === 'sf')?.selectable)
      .toBe(false)
    expect(layout?.spots.find((spot) => spot.participant?.userId === 'user-1')?.participant?.livePoints)
      .toBe(7)
  })

  it('attaches equipped titles per user when provided, null otherwise', () => {
    const room = match({
      team_size_per_side: 3,
      match_participants: [
        participant('user-1', 0, { lobby_position_key: 'pg' }),
        participant('user-2', 1, { lobby_position_key: 'pg' }),
      ],
    })
    const layout = buildBasketballLobbyCourt(room, getMatchDetailState(room, 'user-1'), 'user-1', {
      equippedTitlesByUser: {
        'user-1': {
          id: 'cos-1',
          code: 'title_beta_tester',
          asset_ref: 'BETA TESTER',
          name: 'Beta Tester',
          rarity: 'legendary',
        },
      },
    })

    const find = (userId: string) =>
      layout?.spots.find((spot) => spot.participant?.userId === userId)?.participant
    expect(find('user-1')?.equippedTitle?.code).toBe('title_beta_tester')
    expect(find('user-2')?.equippedTitle).toBeNull()
  })

  it('places 3v3 Team A in the inner ring and Team B in the outer ring', () => {
    const room = match({ team_size_per_side: 3 })
    const layout = buildBasketballLobbyCourt(room, getMatchDetailState(room, 'user-1'), 'user-1')

    const spot = (side: 0 | 1, positionKey: string) =>
      layout?.spots.find((candidate) => candidate.side === side && candidate.positionKey === positionKey)

    // 2026-07-11 FIBA vertical court redesign: A top/B bottom (full), A left/B right (half). Spec: docs/superpowers/specs/2026-07-11-basketball-match-redesign-design.md
    // 2026-07-12: all formats on the full court (founder revision)
    expect(spot(0, 'pg')).toMatchObject({ x: 50, y: 37 })
    expect(spot(0, 'sf')).toMatchObject({ x: 25, y: 25 })
    expect(spot(0, 'c')).toMatchObject({ x: 75, y: 25 })
    expect(spot(1, 'pg')).toMatchObject({ x: 50, y: 63 })
    expect(spot(1, 'sf')).toMatchObject({ x: 75, y: 75 })
    expect(spot(1, 'c')).toMatchObject({ x: 25, y: 75 })
  })

  it('builds 1v1 as a clear inner ring versus outer ring court', () => {
    const room = match({
      team_size_per_side: 1,
      match_participants: [
        participant('user-1', 0),
        participant('user-2', 1),
      ],
    })
    const layout = buildBasketballLobbyCourt(room, getMatchDetailState(room, 'user-1'), 'user-1')

    const spot = (side: 0 | 1) =>
      layout?.spots.find((candidate) => candidate.side === side && candidate.positionKey === 'duel')

    // 2026-07-11 FIBA vertical court redesign: A top/B bottom (full), A left/B right (half). Spec: docs/superpowers/specs/2026-07-11-basketball-match-redesign-design.md
    // 2026-07-12: all formats on the full court (founder revision)
    expect(layout?.kind).toBe('1v1')
    expect(layout?.teamSize).toBe(1)
    expect(layout?.spots).toHaveLength(2)
    expect(spot(0)).toMatchObject({ x: 50, y: 38, shortLabel: 'IN' })
    expect(spot(1)).toMatchObject({ x: 50, y: 62, shortLabel: 'OUT' })
    expect(spot(0)?.participant?.userId).toBe('user-1')
    expect(spot(1)?.participant?.userId).toBe('user-2')
  })

  it('recognizes 1v1 duel as a valid basketball lobby position key', () => {
    expect(isBasketballLobbyPositionKey('duel')).toBe(true)
    expect(isBasketballLobbyPositionKey('pg')).toBe(true)
    expect(isBasketballLobbyPositionKey('2v2')).toBe(false)
  })

  it('builds badminton singles on the near and far court lanes', () => {
    const room = match({
      activity_type: 'badminton',
      team_size_per_side: 1,
      match_participants: [
        participant('user-1', 0),
        participant('user-2', 1),
      ],
    })
    const layout = buildTeamSportLobbyCourt(room, getMatchDetailState(room, 'user-1'), 'user-1')

    const spot = (side: 0 | 1) =>
      layout?.spots.find((candidate) => candidate.side === side && candidate.positionKey === 'duel')

    expect(layout?.activityType).toBe('badminton')
    expect(layout?.kind).toBe('1v1')
    expect(layout?.teamSize).toBe(1)
    expect(layout?.spots).toHaveLength(2)
    expect(spot(0)).toMatchObject({ x: 50, y: 72, shortLabel: 'NEAR' })
    expect(spot(1)).toMatchObject({ x: 50, y: 28, shortLabel: 'FAR' })
    expect(spot(0)?.participant?.userId).toBe('user-1')
    expect(spot(1)?.participant?.userId).toBe('user-2')
  })

  it('builds badminton doubles with left and right slots on both sides', () => {
    const room = match({
      activity_type: 'badminton',
      team_size_per_side: 2,
      match_participants: [
        participant('user-1', 0, { lobby_position_key: 'right' }),
        participant('user-2', 0),
        participant('user-3', 1, { lobby_position_key: 'left' }),
      ],
    })
    const layout = buildTeamSportLobbyCourt(room, getMatchDetailState(room, 'user-1'), 'user-1')

    const spot = (side: 0 | 1, positionKey: string) =>
      layout?.spots.find((candidate) => candidate.side === side && candidate.positionKey === positionKey)

    expect(layout?.activityType).toBe('badminton')
    expect(layout?.kind).toBe('2v2')
    expect(layout?.teamSize).toBe(2)
    expect(layout?.spots).toHaveLength(4)
    expect(spot(0, 'left')).toMatchObject({ x: 35, y: 72, shortLabel: 'L' })
    expect(spot(0, 'right')?.participant?.userId).toBe('user-1')
    expect(spot(0, 'left')?.participant?.userId).toBe('user-2')
    expect(spot(1, 'left')?.participant?.userId).toBe('user-3')
    expect(spot(1, 'right')).toMatchObject({ x: 65, y: 28, shortLabel: 'R' })
  })

  it('keeps badminton lobby keys scoped to badminton room formats', () => {
    expect(isTeamSportLobbyPositionKey('badminton', 1, 'duel')).toBe(true)
    expect(isTeamSportLobbyPositionKey('badminton', 2, 'left')).toBe(true)
    expect(isTeamSportLobbyPositionKey('badminton', 2, 'pg')).toBe(false)
    expect(isTeamSportLobbyPositionKey('basketball', 3, 'left')).toBe(false)
  })

  it('does not keep the badminton court surface after the match starts', () => {
    const room = match({
      activity_type: 'badminton',
      status: 'in_progress',
      team_size_per_side: 1,
    })

    expect(buildTeamSportLobbyCourt(room, getMatchDetailState(room, 'user-1'), 'user-1')).toBeNull()
  })

  it('places 5v5 positions in a standard frontcourt shape', () => {
    const room = match({ team_size_per_side: 5 })
    const layout = buildBasketballLobbyCourt(room, getMatchDetailState(room, 'user-1'), 'user-1')

    const spot = (side: 0 | 1, positionKey: string) =>
      layout?.spots.find((candidate) => candidate.side === side && candidate.positionKey === positionKey)

    // 2026-07-11 FIBA vertical court redesign: A top/B bottom (full), A left/B right (half). Spec: docs/superpowers/specs/2026-07-11-basketball-match-redesign-design.md
    expect(spot(0, 'pg')).toMatchObject({ x: 50, y: 38 })
    expect(spot(0, 'sg')).toMatchObject({ x: 22, y: 30 })
    expect(spot(0, 'sf')).toMatchObject({ x: 78, y: 30 })
    expect(spot(0, 'pf')).toMatchObject({ x: 33, y: 25 })
    expect(spot(0, 'c')).toMatchObject({ x: 67, y: 25 })
    expect(spot(1, 'pg')).toMatchObject({ x: 50, y: 62 })
    expect(spot(1, 'sg')).toMatchObject({ x: 78, y: 70 })
    expect(spot(1, 'sf')).toMatchObject({ x: 22, y: 70 })
    expect(spot(1, 'pf')).toMatchObject({ x: 67, y: 75 })
    expect(spot(1, 'c')).toMatchObject({ x: 33, y: 75 })
  })

  it('ignores duplicate persisted spots and falls the duplicate into the next open spot', () => {
    const room = match({
      team_size_per_side: 3,
      match_participants: [
        participant('user-1', 0, { lobby_position_key: 'pg' }),
        participant('user-2', 0, { lobby_position_key: 'pg' }),
      ],
    })
    const layout = buildBasketballLobbyCourt(room, getMatchDetailState(room, 'user-1'), 'user-1')

    expect(layout?.spots.find((spot) => spot.side === 0 && spot.positionKey === 'pg')?.participant?.userId)
      .toBe('user-1')
    expect(layout?.spots.find((spot) => spot.side === 0 && spot.positionKey === 'sf')?.participant?.userId)
      .toBe('user-2')
  })

  it('does not build for unsupported room sizes', () => {
    const twoVsTwo = match({ team_size_per_side: 2 })

    expect(buildBasketballLobbyCourt(twoVsTwo, getMatchDetailState(twoVsTwo, 'user-1'), 'user-1')).toBeNull()
  })

  it('uses preferred position labels for occupied 1v1/3v3 markers and tolerates null', () => {
    const room = match({
      team_size_per_side: 3,
      match_participants: [
        participant('user-1', 0, { lobby_position_key: 'pg' }),
        participant('user-2', 1, { lobby_position_key: 'pg' }),
      ],
    })
    const layout = buildBasketballLobbyCourt(room, getMatchDetailState(room, 'user-1'), 'user-1', {
      preferredPositionShortByUser: { 'user-1': 'SF' },
    })

    const find = (userId: string) =>
      layout?.spots.find((spot) => spot.participant?.userId === userId)?.participant
    expect(find('user-1')?.positionLabel).toBe('SF')
    expect(find('user-2')?.positionLabel).toBeNull()

    const oneVOne = match({
      team_size_per_side: 1,
      match_participants: [participant('user-1', 0), participant('user-2', 1)],
    })
    const oneVOneLayout = buildBasketballLobbyCourt(
      oneVOne,
      getMatchDetailState(oneVOne, 'user-1'),
      'user-1',
      { preferredPositionShortByUser: { 'user-1': 'PG', 'user-2': undefined } },
    )
    expect(oneVOneLayout?.spots.find((spot) => spot.participant?.userId === 'user-1')?.participant?.positionLabel)
      .toBe('PG')
    expect(oneVOneLayout?.spots.find((spot) => spot.participant?.userId === 'user-2')?.participant?.positionLabel)
      .toBeNull()

    const nullLabelLayout = buildBasketballLobbyCourt(
      room,
      getMatchDetailState(room, 'user-1'),
      'user-1',
      { preferredPositionShortByUser: { 'user-1': null, 'user-2': '' } },
    )
    expect(nullLabelLayout?.spots.find((spot) => spot.participant?.userId === 'user-1')?.participant?.positionLabel)
      .toBeNull()
    expect(nullLabelLayout?.spots.find((spot) => spot.participant?.userId === 'user-2')?.participant?.positionLabel)
      .toBeNull()
  })

  it('3v3 pending: own-side empty spot is not selectable, other-side empty spot is', () => {
    const room = match({
      team_size_per_side: 3,
      match_participants: [
        participant('user-1', 0, { lobby_position_key: 'pg' }),
        participant('user-2', 1, { lobby_position_key: 'pg' }),
      ],
    })
    const layout = buildBasketballLobbyCourt(room, getMatchDetailState(room, 'user-1'), 'user-1')

    expect(layout?.spots.find((spot) => spot.side === 0 && spot.positionKey === 'sf')?.selectable)
      .toBe(false)
    expect(layout?.spots.find((spot) => spot.side === 1 && spot.positionKey === 'sf')?.selectable)
      .toBe(true)
  })

  it('3v3 accepted: no empty spot is selectable', () => {
    const room = match({
      status: 'accepted',
      team_size_per_side: 3,
      match_participants: [
        participant('user-1', 0, { lobby_position_key: 'pg', accepted_at: '2026-05-20T00:10:00.000Z' }),
        participant('user-2', 1, { lobby_position_key: 'pg', accepted_at: '2026-05-20T00:11:00.000Z' }),
      ],
    })
    const layout = buildBasketballLobbyCourt(room, getMatchDetailState(room, 'user-1'), 'user-1')

    expect(layout?.spots.filter((spot) => !spot.participant).every((spot) => !spot.selectable)).toBe(true)
  })

  it('sets usePreferredPositionLabels for 1v1 and 3v3, but not 5v5', () => {
    const oneVOne = match({ team_size_per_side: 1 })
    const threeVThree = match({ team_size_per_side: 3 })
    const fiveVFive = match({ team_size_per_side: 5 })

    expect(buildBasketballLobbyCourt(oneVOne, getMatchDetailState(oneVOne, 'user-1'), 'user-1')?.usePreferredPositionLabels)
      .toBe(true)
    expect(buildBasketballLobbyCourt(threeVThree, getMatchDetailState(threeVThree, 'user-1'), 'user-1')?.usePreferredPositionLabels)
      .toBe(true)
    expect(buildBasketballLobbyCourt(fiveVFive, getMatchDetailState(fiveVFive, 'user-1'), 'user-1')?.usePreferredPositionLabels)
      .toBe(false)
  })

  it('5v5: selectable behavior is unchanged and positionLabel is the court short label (shown on tap)', () => {
    const room = match({
      status: 'accepted',
      team_size_per_side: 5,
      match_participants: [
        participant('user-1', 0, { lobby_position_key: 'pg', accepted_at: '2026-05-20T00:10:00.000Z' }),
        participant('user-2', 1, { lobby_position_key: 'pg', accepted_at: '2026-05-20T00:11:00.000Z' }),
      ],
    })
    const layout = buildBasketballLobbyCourt(room, getMatchDetailState(room, 'user-1'), 'user-1')

    expect(layout?.spots.find((spot) => spot.side === 0 && spot.positionKey === 'sg')?.selectable)
      .toBe(true)
    expect(layout?.spots.find((spot) => spot.side === 1 && spot.positionKey === 'sg')?.selectable)
      .toBe(false)
    expect(layout?.spots.find((spot) => spot.participant?.userId === 'user-1')?.participant?.positionLabel)
      .toBe('PG')
  })
})
