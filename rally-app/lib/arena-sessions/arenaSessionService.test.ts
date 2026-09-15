import { describe, expect, it, vi } from 'vitest'
import type { ArenaEvent, ArenaTeamStatus } from '@/types/arena'
import type { ArenaSessionMembershipCandidate, ArenaSessionSnapshot } from '@/types/arenaSession'
import {
  createArenaSessionCreateAttempt,
  createArenaSessionCreateNavigationLatch,
  mapArenaSessionSnapshot,
  resolveArenaSession,
  resolveArenaSessionArenaId,
} from './arenaSessionService'

const actorUserId = 'player-1'

const createPayload = {
  title: 'Saturday Court',
  activityType: 'basketball' as const,
  teamSize: 3 as const,
  ruleText: 'Casual Arena Session',
  targetScore: 11,
  timeLimitSeconds: 600,
  joinMode: 'open' as const,
  mode: 'casual' as const,
  anchorLat: 13.7,
  anchorLng: 100.5,
}

const baseArena: ArenaEvent = {
  id: 'arena-1',
  created_by: 'venue-host',
  title: 'King Court',
  activity_type: 'basketball',
  team_size_per_side: 3,
  join_mode: 'open',
  join_code: null,
  entry_code: null,
  rule_text: 'first to 11',
  target_score: 11,
  time_limit_seconds: 600,
  base_stake_per_player: 30,
  streak_increment_per_player: 10,
  max_streak: 5,
  status: 'open',
  current_champion_team_id: null,
  current_champion_streak: 0,
  created_at: '2026-07-30T10:00:00.000Z',
  updated_at: '2026-07-30T10:00:00.000Z',
  arena_teams: [team('team-1', 'forming')],
}

const activeMembership: ArenaSessionMembershipCandidate = {
  arenaId: 'arena-1',
  arenaTeamId: 'team-1',
  userId: actorUserId,
  acceptedAt: '2026-07-30T10:01:00.000Z',
  isActive: true,
}

describe('resolveArenaSession', () => {
  it('coalesces a same-payload double create into one outbound request with one key', async () => {
    const keys = ['arena-create-1', 'arena-create-2']
    const attempt = createArenaSessionCreateAttempt(() => keys.shift() ?? 'fallback')
    let release!: (output: { arenaEventId: string }) => void
    const request = vi.fn(() => new Promise<{ arenaEventId: string }>((resolve) => {
      release = resolve
    }))

    const first = attempt.execute(createPayload, request)
    const second = attempt.execute(createPayload, request)

    expect(first).toBe(second)
    await Promise.resolve()
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith({ ...createPayload, idempotencyKey: 'arena-create-1' })
    await expect(attempt.execute({ ...createPayload, title: 'Changed court' }, request))
      .rejects.toMatchObject({ code: 'arena_session_create_in_flight' })
    expect(request).toHaveBeenCalledTimes(1)

    release({ arenaEventId: 'arena-1' })
    await expect(first).resolves.toEqual({ arenaEventId: 'arena-1' })
  })

  it('latches a successful create before navigation so a rerender cannot send it twice', async () => {
    const attempt = createArenaSessionCreateAttempt(() => 'arena-create-1')
    const navigationLatch = createArenaSessionCreateNavigationLatch()
    const events: string[] = []
    let release!: (output: { arenaEventId: string }) => void
    const request = vi.fn(() => new Promise<{ arenaEventId: string }>((resolve) => {
      release = resolve
    }))
    const replace = vi.fn(() => events.push('replace'))

    function runCreateEffect() {
      if (!navigationLatch.claimTransport()) return undefined
      return attempt.execute(createPayload, request).then((output) => {
        if (!navigationLatch.succeed()) return output
        events.push('latched')
        replace()
        return output
      })
    }

    expect(navigationLatch.begin()).toBe(true)
    expect(navigationLatch.isFrozen()).toBe(true)
    const first = runCreateEffect()
    expect(first).toBeDefined()
    expect(runCreateEffect()).toBeUndefined()
    await Promise.resolve()
    expect(request).toHaveBeenCalledTimes(1)

    release({ arenaEventId: 'arena-1' })
    await expect(first).resolves.toEqual({ arenaEventId: 'arena-1' })

    // This models the source screen rerendering before Expo Router commits the
    // replace. The synchronous success latch must keep the form frozen.
    expect(navigationLatch.phase()).toBe('succeeded')
    expect(navigationLatch.isFrozen()).toBe(true)
    expect(runCreateEffect()).toBeUndefined()
    expect(request).toHaveBeenCalledTimes(1)
    expect(events).toEqual(['latched', 'replace'])
  })

  it('retains one create key when the exact payload retries after a failure', async () => {
    const keys = ['arena-create-1', 'arena-create-2']
    const attempt = createArenaSessionCreateAttempt(() => keys.shift() ?? 'fallback')
    const request = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ arenaEventId: 'arena-1' })

    await expect(attempt.execute(createPayload, request)).rejects.toThrow('offline')
    await expect(attempt.execute(createPayload, request)).resolves.toEqual({ arenaEventId: 'arena-1' })

    expect(request).toHaveBeenNthCalledWith(1, {
      ...createPayload,
      idempotencyKey: 'arena-create-1',
    })
    expect(request).toHaveBeenNthCalledWith(2, {
      ...createPayload,
      idempotencyKey: 'arena-create-1',
    })
  })

  it('retains the key when whitespace still hashes to the same server-canonical payload', async () => {
    const keys = ['arena-create-1', 'arena-create-2']
    const attempt = createArenaSessionCreateAttempt(() => keys.shift() ?? 'fallback')
    const request = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ arenaEventId: 'arena-1' })

    await expect(attempt.execute(createPayload, request)).rejects.toThrow('offline')
    await expect(attempt.execute({
      ...createPayload,
      title: '  Saturday Court  ',
      ruleText: '  Casual Arena Session  ',
    }, request)).resolves.toEqual({ arenaEventId: 'arena-1' })

    expect(request).toHaveBeenNthCalledWith(1, {
      ...createPayload,
      idempotencyKey: 'arena-create-1',
    })
    expect(request).toHaveBeenNthCalledWith(2, {
      ...createPayload,
      title: '  Saturday Court  ',
      ruleText: '  Casual Arena Session  ',
      idempotencyKey: 'arena-create-1',
    })
  })

  it('allocates a new create key when a failed attempt is retried with changed input', async () => {
    const keys = ['arena-create-1', 'arena-create-2']
    const attempt = createArenaSessionCreateAttempt(() => keys.shift() ?? 'fallback')
    const request = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ arenaEventId: 'arena-2' })

    await expect(attempt.execute(createPayload, request)).rejects.toThrow('offline')
    await expect(attempt.execute({ ...createPayload, title: 'Changed court' }, request))
      .resolves.toEqual({ arenaEventId: 'arena-2' })

    expect(request).toHaveBeenNthCalledWith(1, {
      ...createPayload,
      idempotencyKey: 'arena-create-1',
    })
    expect(request).toHaveBeenNthCalledWith(2, {
      ...createPayload,
      title: 'Changed court',
      idempotencyKey: 'arena-create-2',
    })
  })

  it('drops a server-conflicted key so a new attempt never repeats an incompatible payload hash', async () => {
    const keys = ['arena-create-1', 'arena-create-2']
    const attempt = createArenaSessionCreateAttempt(() => keys.shift() ?? 'fallback')
    const request = vi.fn()
      .mockRejectedValueOnce({ code: 'arena_session_idempotency_conflict' })
      .mockResolvedValueOnce({ arenaEventId: 'arena-2' })

    await expect(attempt.execute(createPayload, request)).rejects.toMatchObject({
      code: 'arena_session_idempotency_conflict',
    })
    await expect(attempt.execute(createPayload, request)).resolves.toEqual({ arenaEventId: 'arena-2' })

    expect(request).toHaveBeenNthCalledWith(1, {
      ...createPayload,
      idempotencyKey: 'arena-create-1',
    })
    expect(request).toHaveBeenNthCalledWith(2, {
      ...createPayload,
      idempotencyKey: 'arena-create-2',
    })
  })

  it('uses actor capabilities for Presence and Open, hides Open for Conquest, and carries the active match', () => {
    const snapshot = sessionSnapshot({
      actor: {
        role: 'host',
        presenceStatus: 'required',
        canJoin: false,
        canOpen: true,
        canRecordPresence: false,
        activeMatchId: 'match-1',
      },
    })

    expect(mapArenaSessionSnapshot(snapshot)).toMatchObject({
      canOpen: true,
      canRecordPresence: false,
      activeMatchId: 'match-1',
    })
    expect(mapArenaSessionSnapshot({
      ...snapshot,
      session: { ...snapshot.session, mode: 'conquest' },
    }).canOpen).toBe(false)
  })

  it('keeps Venue Host remote-open behavior when reading an older cached snapshot', () => {
    const snapshot = sessionSnapshot({
      session: {
        ...sessionSnapshot().session,
        sourceKind: 'venue',
      },
      actor: {
        role: 'host',
        presenceStatus: 'required',
        canJoin: false,
      },
    })

    expect(mapArenaSessionSnapshot(snapshot)).toMatchObject({
      canOpen: true,
      canRecordPresence: false,
    })
  })

  it('derives the Arena id from action input before a generic resource id', () => {
    const output = { resourceId: 'generic-resource', result: { arenaEventId: 'created-arena' } }

    expect(resolveArenaSessionArenaId('opened-arena', output)).toBe('opened-arena')
    expect(resolveArenaSessionArenaId({ arenaEventId: 'staged-arena' }, output)).toBe('staged-arena')
    expect(resolveArenaSessionArenaId({}, output)).toBe('created-arena')
    expect(resolveArenaSessionArenaId({}, { resourceId: 'fallback-arena', result: {} })).toBe(
      'fallback-arena',
    )
  })

  it('returns idle when there is no Arena event or own membership', () => {
    expect(resolveArenaSession({ userId: actorUserId, arena: null })).toEqual({ status: 'idle' })
    expect(resolveArenaSession({ userId: actorUserId, arena: baseArena })).toEqual({ status: 'idle' })
  })

  it.each(['closed', 'cancelled'] as const)('returns %s as terminal even without a roster member', (status) => {
    expect(resolveArenaSession({
      userId: actorUserId,
      arena: { ...baseArena, status },
    })).toEqual({ status, arenaId: 'arena-1' })
  })

  it.each(['queued', 'on_deck', 'active', 'champion', 'disputed'] as const)(
    'returns the canonical team status %s for a valid host-pulled member',
    (status) => {
      const arena = { ...baseArena, arena_teams: [team('team-1', status)] }

      expect(resolveArenaSession({
        userId: actorUserId,
        arena,
        membershipCandidate: activeMembership,
      })).toEqual({
        status,
        arenaId: 'arena-1',
        teamId: 'team-1',
        userId: actorUserId,
        acceptedAt: activeMembership.acceptedAt,
      })
    },
  )

  it('returns forming/staged when the canonical member is accepted', () => {
    expect(resolveArenaSession({
      userId: actorUserId,
      arena: baseArena,
      membershipCandidate: activeMembership,
    })).toEqual({
      status: 'forming',
      phase: 'staged',
      arenaId: 'arena-1',
      teamId: 'team-1',
      userId: actorUserId,
      acceptedAt: activeMembership.acceptedAt,
    })
  })

  it('returns forming/unready when the member has explicitly left a forming team', () => {
    const arena = {
      ...baseArena,
      arena_teams: [team('team-1', 'forming', null)],
    }
    const unreadyMembership = { ...activeMembership, acceptedAt: null }

    expect(resolveArenaSession({
      userId: actorUserId,
      arena,
      membershipCandidate: unreadyMembership,
    })).toEqual({
      status: 'forming',
      phase: 'unready',
      arenaId: 'arena-1',
      teamId: 'team-1',
      userId: actorUserId,
      acceptedAt: null,
    })
  })

  it('does not infer that a Venue Host left when the host is absent from the player roster', () => {
    expect(resolveArenaSession({ userId: 'venue-host', arena: baseArena })).toEqual({ status: 'idle' })
  })

  it('keeps a host-pulled member on the same canonical flow through ready, queue, and close', () => {
    const unreadyMembership = { ...activeMembership, acceptedAt: null }
    const unreadyArena = {
      ...baseArena,
      arena_teams: [team('team-1', 'forming', null)],
    }
    const queuedArena = {
      ...baseArena,
      arena_teams: [team('team-1', 'queued')],
    }

    expect(resolveArenaSession({
      userId: actorUserId,
      arena: unreadyArena,
      membershipCandidate: unreadyMembership,
    })).toMatchObject({ status: 'forming', phase: 'unready', arenaId: 'arena-1' })

    expect(resolveArenaSession({
      userId: actorUserId,
      arena: baseArena,
      membershipCandidate: activeMembership,
    })).toMatchObject({ status: 'forming', phase: 'staged', arenaId: 'arena-1' })

    expect(resolveArenaSession({
      userId: actorUserId,
      arena: queuedArena,
      membershipCandidate: activeMembership,
    })).toMatchObject({ status: 'queued', arenaId: 'arena-1' })

    expect(resolveArenaSession({
      userId: actorUserId,
      arena: { ...queuedArena, status: 'closed' },
      membershipCandidate: null,
    })).toEqual({ status: 'closed', arenaId: 'arena-1' })
  })

  it.each([
    ['missing event', null, activeMembership],
    ['missing team', baseArena, { ...activeMembership, arenaTeamId: 'missing-team' }],
    ['inactive candidate', baseArena, { ...activeMembership, isActive: false }],
    ['inactive canonical member', {
      ...baseArena,
      arena_teams: [team('team-1', 'forming', activeMembership.acceptedAt, false)],
    }, activeMembership],
  ])('returns member_unavailable for %s', (_label, arena, membershipCandidate) => {
    expect(resolveArenaSession({
      userId: actorUserId,
      arena,
      membershipCandidate,
    })).toMatchObject({
      status: 'member_unavailable',
      arenaId: membershipCandidate.arenaId,
      teamId: membershipCandidate.arenaTeamId,
      userId: actorUserId,
    })
  })
})

function team(
  id: string,
  status: ArenaTeamStatus,
  acceptedAt: string | null = '2026-07-30T10:01:00.000Z',
  isActive = true,
) {
  return {
    id,
    arena_id: 'arena-1',
    leader_user_id: 'venue-host',
    name: 'Team One',
    color_key: 'orange',
    icon_key: 'shield',
    status,
    queue_position: status === 'queued' ? 1 : null,
    current_streak: 0,
    best_streak: 0,
    wins: 0,
    losses: 0,
    points_for: 0,
    points_against: 0,
    ready_at: acceptedAt,
    created_at: '2026-07-30T10:00:00.000Z',
    updated_at: '2026-07-30T10:00:00.000Z',
    arena_team_members: [{
      arena_team_id: id,
      arena_id: 'arena-1',
      user_id: actorUserId,
      accepted_at: acceptedAt,
      is_active: isActive,
      created_at: '2026-07-30T10:00:00.000Z',
    }],
  }
}

function sessionSnapshot(overrides: Partial<ArenaSessionSnapshot> = {}): ArenaSessionSnapshot {
  return {
    session: {
      arenaEventId: 'arena-1',
      sourceKind: 'ad_hoc',
      mode: 'casual',
      title: 'King Court',
      activityType: 'basketball',
      teamSize: 3,
      joinMode: 'open',
      sessionState: 'preparing',
      openedAt: null,
      drainingAt: null,
      drainDeadlineAt: null,
      closedAt: null,
      cancelledAt: null,
      createdAt: '2026-07-30T10:00:00.000Z',
      updatedAt: '2026-07-30T10:00:00.000Z',
    },
    actor: {
      role: 'observer',
      presenceStatus: 'required',
      canJoin: false,
      ...overrides.actor,
    },
    teams: [],
    rounds: [],
    liveRound: null,
    ...overrides,
    teamParticipation: overrides.teamParticipation ?? { blocksPairing: false },
  }
}
