import { describe, expect, it } from 'vitest'
import {
  canActAsArenaReferee,
  canAssignArenaReferee,
  canUserRefereeArenaRound,
  canSubmitArenaScore,
  getActiveArenaRound,
  getActiveArenaReferees,
  getArenaQueue,
  getArenaStandings,
  getRoundStakeForTeam,
  isArenaUserInRound,
} from './arenaRules'
import type { ArenaEvent, ArenaTeamStatus } from '@/types/arena'

const baseArena: ArenaEvent = {
  id: 'arena-1',
  created_by: 'user-1',
  title: '3v3 King Court',
  activity_type: 'basketball',
  team_size_per_side: 3,
  join_mode: 'open',
  join_code: 'ABCDEFGH',
  entry_code: null,
  rule_text: 'first to 11',
  target_score: 11,
  time_limit_seconds: 600,
  base_stake_per_player: 30,
  streak_increment_per_player: 10,
  max_streak: 5,
  status: 'open',
  current_champion_team_id: 'team-a',
  current_champion_streak: 2,
  created_at: '2026-06-01T10:00:00.000Z',
  updated_at: '2026-06-01T10:00:00.000Z',
  arena_teams: [
    team('team-a', 'Alpha', 'champion', null, 2, 2, 0, ['alpha-player']),
    team('team-b', 'Bravo', 'queued', 20, 0, 1, 1),
    team('team-c', 'Charlie', 'queued', 10, 0, 3, 1, ['charlie-player']),
  ],
  arena_referees: [
    referee('ref-2', 'active', 2),
    referee('removed-ref', 'removed', 0),
    referee('ref-1', 'active', 1),
  ],
  arena_rounds: [
    {
      id: 'round-1',
      arena_id: 'arena-1',
      match_id: 'match-1',
      champion_team_id: 'team-a',
      challenger_team_id: 'team-c',
      referee_user_id: 'ref-1',
      champion_stake_per_player: 50,
      challenger_stake_per_player: 30,
      status: 'stake_acceptance',
      rule_snapshot: {},
      started_at: null,
      submitted_at: null,
      dispute_deadline_at: null,
      settled_at: null,
      winner_team_id: null,
      loser_team_id: null,
      champion_score: null,
      challenger_score: null,
      created_at: '2026-06-01T10:05:00.000Z',
      updated_at: '2026-06-01T10:05:00.000Z',
    },
  ],
}

describe('arenaRules', () => {
  it('orders the live queue by queue position', () => {
    expect(getArenaQueue(baseArena).map((row) => row.id)).toEqual(['team-c', 'team-b'])
  })

  it('finds the active round and asymmetric stake for the champion', () => {
    const round = getActiveArenaRound(baseArena)
    expect(round?.id).toBe('round-1')
    expect(getRoundStakeForTeam(round, baseArena.arena_teams?.[0])).toBe(50)
  })

  it('orders standings by wins, streak, then point differential', () => {
    expect(getArenaStandings(baseArena).map((row) => row.id)).toEqual(['team-c', 'team-a', 'team-b'])
  })

  it('requires sudden death before a tied score can be submitted', () => {
    expect(canSubmitArenaScore(11, 11)).toBe(false)
    expect(canSubmitArenaScore(12, 11)).toBe(true)
  })

  it('keeps the referee pool to active refs ordered by rotation', () => {
    expect(getActiveArenaReferees(baseArena).map((row) => row.user_id)).toEqual(['ref-1', 'ref-2'])
  })

  it('detects round players by active team membership', () => {
    const round = getActiveArenaRound(baseArena)

    expect(isArenaUserInRound(baseArena, round, 'alpha-player')).toBe(true)
    expect(isArenaUserInRound(baseArena, round, 'ref-1')).toBe(false)
  })

  it('allows any active non-player referee candidate for a round', () => {
    const round = getActiveArenaRound(baseArena)

    expect(canUserRefereeArenaRound(baseArena, round, 'ref-1')).toBe(true)
    expect(canUserRefereeArenaRound(baseArena, round, 'alpha-player')).toBe(false)
    expect(canUserRefereeArenaRound(baseArena, round, 'removed-ref')).toBe(false)
  })

  it('limits referee controls to organizer or assigned referee when not playing', () => {
    const round = getActiveArenaRound(baseArena)
    const organizerArena = { ...baseArena, created_by: 'organizer' }
    const playingOrganizerArena = { ...baseArena, created_by: 'alpha-player' }

    expect(canAssignArenaReferee(playingOrganizerArena, round, 'alpha-player')).toBe(true)
    expect(canActAsArenaReferee(organizerArena, round, 'organizer')).toBe(true)
    expect(canActAsArenaReferee(baseArena, round, 'ref-1')).toBe(true)
    expect(canActAsArenaReferee(baseArena, round, 'ref-2')).toBe(false)
    expect(canActAsArenaReferee(playingOrganizerArena, round, 'alpha-player')).toBe(false)
  })
})

function team(
  id: string,
  name: string,
  status: ArenaTeamStatus,
  queuePosition: number | null,
  currentStreak: number,
  wins: number,
  losses: number,
  memberUserIds: string[] = [],
) {
  return {
    id,
    arena_id: 'arena-1',
    leader_user_id: `${id}-leader`,
    name,
    color_key: 'orange',
    icon_key: 'shield',
    status,
    queue_position: queuePosition,
    current_streak: currentStreak,
    best_streak: currentStreak,
    wins,
    losses,
    points_for: wins * 11,
    points_against: losses * 9,
    ready_at: '2026-06-01T10:00:00.000Z',
    created_at: `2026-06-01T10:0${wins}:00.000Z`,
    updated_at: '2026-06-01T10:00:00.000Z',
    arena_team_members: memberUserIds.map((userId) => ({
      arena_team_id: id,
      arena_id: 'arena-1',
      user_id: userId,
      accepted_at: '2026-06-01T10:00:00.000Z',
      is_active: true,
      created_at: '2026-06-01T10:00:00.000Z',
    })),
  }
}

function referee(userId: string, status: 'active' | 'removed', rotationIndex: number) {
  return {
    arena_id: 'arena-1',
    user_id: userId,
    status,
    rotation_index: rotationIndex,
    accepted_at: status === 'active' ? '2026-06-01T10:00:00.000Z' : null,
    created_at: `2026-06-01T10:0${rotationIndex}:00.000Z`,
  }
}
