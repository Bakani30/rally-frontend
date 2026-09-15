import { beforeEach, describe, expect, it, vi } from 'vitest'

import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type { ArenaSessionSnapshot } from '@/types/arenaSession'
import {
  ARENA_SESSION_RECONNECT_POLICY,
  canStagePartySelection,
  getArenaSessionBoardPresentation,
  getActivePartyMemberIds,
  mapArenaSessionSnapshot,
} from './arenaSessionService'
import { getArenaSessionTeamParticipationAction } from '@/components/arena-session/ArenaSessionBoard'
import { arenaSessionActions } from './arenaSessionActions'
import { getArenaSessionSnapshot } from './arenaSessionRepository'

vi.mock('@/lib/supabase/invokeFunction', () => ({
  invokeAuthenticatedFunction: vi.fn(),
}))

vi.mock('@/lib/supabase/edgeError', () => ({
  extractEdgeFunctionError: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

vi.mock('react-native', () => ({
  ActivityIndicator: () => null,
  Alert: { alert: vi.fn() },
  Platform: { select: <T,>(values: { ios?: T; android?: T; default?: T }) => values.ios ?? values.default ?? values.android },
  ScrollView: ({ children }: { children?: unknown }) => children ?? null,
  StyleSheet: { create: <T,>(styles: T) => styles, hairlineWidth: 1 },
  Text: () => null,
  View: ({ children }: { children?: unknown }) => children ?? null,
}))
vi.mock('expo-image', () => ({ Image: () => null }))
vi.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: () => null }))
vi.mock('@/components/layout/useScreenInsets', () => ({ useScreenInsets: () => ({ paddingTop: 0, paddingBottom: 0 }) }))
vi.mock('@/components/motion/PressableScale', () => ({ PressableScale: () => null }))
vi.mock('@/components/arena-session/ArenaSessionLiveCourt', () => ({ ArenaSessionCourtPreview: () => null, ArenaSessionLiveCourt: () => null }))
vi.mock('@/components/arena-session/ArenaSessionStakePanel', () => ({ ArenaSessionStakePanel: () => null }))
vi.mock('@/components/arena-session/ArenaTeamContinuationCard', () => ({ ArenaTeamContinuationCard: () => null }))
vi.mock('@/hooks/useAppTheme', () => ({ useSportTheme: () => new Proxy({}, { get: () => '#000' }) }))
vi.mock('@/stores/languageStore', () => ({ useLanguageStore: () => 'th' }))

describe('ArenaSessionBoard presenter', () => {
  it('builds an exact arena, cycle, and revision decision input from the actor snapshot', () => {
    const participantSnapshot: ArenaSessionSnapshot = {
      ...queuedSnapshot,
      session: { ...queuedSnapshot.session, arenaEventId: 'arena-9' },
      teamParticipation: {
        participationCycleId: 'cycle-7',
        teamId: 'team-1',
        lane: 'champion',
        state: 'decision_required',
        revision: 4,
        queuePosition: null,
        blocksPairing: true,
        capabilities: { canContinue: true, canRetire: true },
      },
    }
    expect(getArenaSessionTeamParticipationAction(participantSnapshot, 'retire')).toEqual({
      arenaId: 'arena-9',
      participationCycleId: 'cycle-7',
      expectedRevision: 4,
      decision: 'retire',
    })
    expect(getArenaSessionTeamParticipationAction(queuedSnapshot, 'continue')).toBeNull()
  })

  it('presents the four required board states', () => {
    expect(getArenaSessionBoardPresentation(formingSnapshot).headline).toBe('เลือกสมาชิกเข้าแข่งขัน')
    expect(getArenaSessionBoardPresentation(queuedSnapshot).headline).toBe('อยู่ในคิว')
    expect(getArenaSessionBoardPresentation(unavailableSnapshot).headline).toBe('สมาชิกไม่พร้อมใช้งาน')
    expect(getArenaSessionBoardPresentation(closedSnapshot).headline).toBe('สนามจบแล้ว')
  })

  it('maps actor authority and safe session facts without coordinates', () => {
    const view = mapArenaSessionSnapshot({
      ...queuedSnapshot,
      session: {
        ...queuedSnapshot.session,
        sessionState: 'draining',
        drainDeadlineAt: '2026-07-31T12:20:00.000Z',
      },
    })

    expect(view.actorRole).toBe('member')
    expect(view.presenceStatus).toBe('valid')
    expect(view.canJoin).toBe(false)
    expect(view.drainDeadlineAt).toBe('2026-07-31T12:20:00.000Z')
    expect(view.status).toBe('draining')
    expect(JSON.stringify(view)).not.toContain('currentLat')
    expect(JSON.stringify(view)).not.toContain('currentLng')
  })

  it.each([
    ['queued', 'queued'],
    ['on_deck', 'on_deck'],
    ['active', 'active'],
    ['champion', 'champion'],
    ['disputed', 'disputed'],
  ] as const)('maps team status %s to the board state', (teamStatus, expected) => {
    const view = mapArenaSessionSnapshot({
      ...queuedSnapshot,
      teams: [{ ...queuedSnapshot.teams[0], status: teamStatus }],
    })

    expect(view.status).toBe(expected)
  })

  it.each([
    ['closed', 'closed'],
    ['cancelled', 'cancelled'],
  ] as const)('keeps terminal session state %s terminal', (sessionState, expected) => {
    expect(mapArenaSessionSnapshot({
      ...formingSnapshot,
      session: { ...formingSnapshot.session, sessionState },
    }).status).toBe(expected)
  })

  it('requires fresh Presence for re-entry while allowing leave after Presence was revoked', async () => {
    const recordPresenceSpy = vi.spyOn(arenaSessionActions, 'recordPresence').mockResolvedValue({
      resourceId: 'arena-1',
      result: { arenaEventId: 'arena-1' },
    })
    const view = mapArenaSessionSnapshot(unavailableSnapshot)

    expect(view.status).toBe('member_unavailable')
    expect(view.canRecordPresence).toBe(true)
    expect(view.canLeave).toBe(true)
    expect(mapArenaSessionSnapshot({
      ...unavailableSnapshot,
      teams: [{ ...unavailableSnapshot.teams[0], status: 'queued' }],
    }).canLeave).toBe(true)
    expect(getArenaSessionBoardPresentation(unavailableSnapshot).detail).toContain('ยืนยันตำแหน่งใหม่')
    expect(recordPresenceSpy).not.toHaveBeenCalled()

    await arenaSessionActions.recordPresence({
      arenaEventId: 'arena-1',
      currentLat: 13.7563,
      currentLng: 100.5018,
      accuracyM: 30,
    })
    expect(recordPresenceSpy).toHaveBeenCalledTimes(1)
    recordPresenceSpy.mockRestore()
  })

  it('lets a Host with staged roster membership confirm only their own readiness', () => {
    const hostRosterSnapshot = snapshot({
      session: { sessionState: 'open' },
      actor: {
        role: 'host',
        memberState: 'staged',
        teamId: 'team-1',
        presenceStatus: 'required',
        canJoin: false,
      },
      teams: [{
        teamId: 'team-1',
        name: 'Host Crew',
        status: 'forming',
        queuePosition: null,
        members: [{ displayName: 'Host', handle: 'host', avatarUrl: null }],
      }],
    })

    expect(mapArenaSessionSnapshot(hostRosterSnapshot).canRecordPresence).toBe(true)
    expect(mapArenaSessionSnapshot({
      ...hostRosterSnapshot,
      actor: { ...hostRosterSnapshot.actor, presenceStatus: 'valid' },
    }).canReady).toBe(true)
    expect(mapArenaSessionSnapshot({
      ...hostRosterSnapshot,
      actor: {
        ...hostRosterSnapshot.actor,
        teamId: undefined,
        memberState: undefined,
        presenceStatus: 'valid',
      },
    }).canReady).toBe(false)
  })

  it('allows a Host with active team roster membership to leave', () => {
    const hostRosterSnapshot = snapshot({
      session: { sessionState: 'open' },
      actor: {
        role: 'host',
        memberState: 'staged',
        teamId: 'team-1',
        presenceStatus: 'required',
        canJoin: false,
      },
      teams: [{
        teamId: 'team-1',
        name: 'Host Crew',
        status: 'forming',
        queuePosition: null,
        members: [{ displayName: 'Host', handle: 'host', avatarUrl: null }],
      }],
    })

    expect(mapArenaSessionSnapshot(hostRosterSnapshot).canLeave).toBe(true)
    expect(mapArenaSessionSnapshot({
      ...hostRosterSnapshot,
      teams: [{ ...hostRosterSnapshot.teams[0], status: 'active' }],
    }).canLeave).toBe(false)
  })

  it('allows the selected Party Host to stage without Arena Host authority', () => {
    const partyHostSnapshot = snapshot({
      session: { sessionState: 'open' },
      actor: { role: 'observer', presenceStatus: 'required', canJoin: false },
    })
    const party = { host_user_id: 'party-host' }

    expect(mapArenaSessionSnapshot(partyHostSnapshot, {
      actorUserId: 'party-host',
      party,
    }).canStage).toBe(true)
    expect(mapArenaSessionSnapshot(partyHostSnapshot, {
      actorUserId: 'other-user',
      party,
    }).canStage).toBe(false)
    expect(mapArenaSessionSnapshot({
      ...partyHostSnapshot,
      actor: { ...partyHostSnapshot.actor, role: 'host' },
    }, {
      actorUserId: 'arena-host',
      party,
    }).canStage).toBe(false)
  })

  it('uses immutable server Round authority instead of the current Party Host', () => {
    const live = liveRoundSnapshot({
      actor: {
        role: 'member',
        memberState: 'ready',
        teamId: 'team-1',
        presenceStatus: 'valid',
        canJoin: false,
        roundState: {
          proposalAmount: 40,
          confirmed: false,
          capabilities: {
            isRoundCaptain: false,
            canEditOwnStake: true,
            canConfirmStake: true,
            canStartRound: false,
          },
        },
      },
    })

    const partyHostView = mapArenaSessionSnapshot(live, {
      actorUserId: 'current-party-host',
      party: { host_user_id: 'current-party-host' },
    })
    expect(partyHostView.roundPhase).toBe('ready_to_start')
    expect(partyHostView.canEditOwnStake).toBe(true)
    expect(partyHostView.canConfirmStake).toBe(true)
    expect(partyHostView).toHaveProperty('canStartRound', false)

    const frozenCaptainView = mapArenaSessionSnapshot({
      ...live,
      actor: {
        ...live.actor,
        roundState: {
          ...live.actor.roundState!,
          capabilities: {
            ...live.actor.roundState!.capabilities,
            isRoundCaptain: true,
            canStartRound: true,
          },
        },
      },
    }, {
      actorUserId: 'not-current-party-host',
      party: { host_user_id: 'someone-else' },
    })
    expect(frozenCaptainView.canStartRound).toBe(true)
  })

  it('keeps the active Round visible while the Session drains', () => {
    const view = mapArenaSessionSnapshot(liveRoundSnapshot({
      session: { sessionState: 'draining' },
      liveRound: {
        ...liveRoundSnapshot().liveRound!,
        status: 'in_progress',
        phase: 'active',
      },
    }))

    expect(view.status).toBe('draining')
    expect(view.roundPhase).toBe('active')
    expect(view.roundId).toBe('round-1')
  })

  it('fails closed to queue between rounds instead of inferring settled authority', () => {
    const view = mapArenaSessionSnapshot(snapshot({
      session: { sessionState: 'open' },
      rounds: [{
        roundId: 'old-round',
        status: 'settled',
        championTeamId: 'team-1',
        challengerTeamId: 'team-2',
        winnerTeamId: 'team-1',
        loserTeamId: 'team-2',
        startedAt: '2026-08-05T09:00:00.000Z',
        submittedAt: '2026-08-05T09:10:00.000Z',
        settledAt: '2026-08-05T09:12:00.000Z',
      }],
    }))

    expect(view.roundPhase).toBe('queue')
    expect(view.roundId).toBeNull()
    expect(view.canStartRound).toBe(false)
  })

  it('keeps the Party staging presenter enabled for a second team while open', () => {
    const view = mapArenaSessionSnapshot({
      ...formingSnapshot,
      session: { ...formingSnapshot.session, sessionState: 'open' },
      actor: { ...formingSnapshot.actor, presenceStatus: 'valid' },
      teams: [{
        teamId: 'team-1',
        name: 'First Crew',
        status: 'queued',
        queuePosition: 1,
        members: [],
      }],
    }, {
      actorUserId: 'party-host',
      party: { host_user_id: 'party-host' },
    })

    expect(view.canStage).toBe(true)
  })

  it('keeps reconnect snapshot reads read-only and never auto-restores a leave', () => {
    expect(ARENA_SESSION_RECONNECT_POLICY).toEqual({
      refetchSnapshot: true,
      recordPresence: false,
      ready: false,
    })

    const revokedView = mapArenaSessionSnapshot(unavailableSnapshot)
    expect(revokedView.canRecordPresence).toBe(true)
    expect(revokedView.canReady).toBe(false)

    const serverLeftSnapshot = snapshot({
      session: { sessionState: 'open' },
      actor: {
        role: 'member',
        memberState: 'left',
        teamId: 'team-1',
        presenceStatus: 'revoked',
        canJoin: false,
      },
      teams: [{
        teamId: 'team-1',
        name: 'Former Crew',
        status: 'forming',
        queuePosition: null,
        members: [],
      }],
    })
    const serverLeftView = mapArenaSessionSnapshot(serverLeftSnapshot)
    expect(serverLeftView.canRecordPresence).toBe(false)
    expect(serverLeftView.canReady).toBe(false)
    expect(getArenaSessionBoardPresentation(serverLeftSnapshot).detail).toContain('Host')
  })

  it('caps Party staging at five members and requires an exact team size', () => {
    const party = {
      party_members: Array.from({ length: 6 }, (_, index) => ({
        user_id: `user-${index}`,
        status: 'active' as const,
      })),
    }
    const ids = getActivePartyMemberIds(party as never)

    expect(ids).toHaveLength(5)
    expect(canStagePartySelection(ids.slice(0, 3), 3)).toBe(true)
    expect(canStagePartySelection(ids.slice(0, 2), 3)).toBe(false)
    expect(canStagePartySelection(ids, 3)).toBe(false)
  })
})

describe('arenaSessionRepository snapshot read', () => {
  beforeEach(() => vi.mocked(invokeAuthenticatedFunction).mockReset())

  it('uses the actor-scoped GET snapshot endpoint and keeps reconnect read-only', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: queuedSnapshot,
      error: null,
    } as never)

    await expect(getArenaSessionSnapshot('arena-1')).resolves.toEqual(queuedSnapshot)
    expect(invokeAuthenticatedFunction).toHaveBeenCalledTimes(1)
    expect(invokeAuthenticatedFunction).toHaveBeenCalledWith(
      'arena-sessions?arenaEventId=arena-1',
      { method: 'GET' },
    )
    expect(ARENA_SESSION_RECONNECT_POLICY.recordPresence).toBe(false)
    expect(ARENA_SESSION_RECONNECT_POLICY.ready).toBe(false)
  })
})

const formingSnapshot = snapshot({
  actor: { role: 'host', presenceStatus: 'required', canJoin: false },
  teams: [],
})

const queuedSnapshot = snapshot({
  actor: {
    role: 'member',
    memberState: 'ready',
    teamId: 'team-1',
    presenceStatus: 'valid',
    canJoin: false,
  },
  teams: [{
    teamId: 'team-1',
    name: 'Court Crew',
    status: 'queued',
    queuePosition: 2,
    members: [{ displayName: 'Ari', handle: 'ari', avatarUrl: null }],
  }],
})

const unavailableSnapshot = snapshot({
  actor: {
    role: 'member',
    memberState: 'staged',
    teamId: 'team-1',
    presenceStatus: 'revoked',
    canJoin: false,
  },
  teams: [{
    teamId: 'team-1',
    name: 'Court Crew',
    status: 'forming',
    queuePosition: null,
    members: [{ displayName: 'Ari', handle: 'ari', avatarUrl: null }],
  }],
})

const closedSnapshot = snapshot({
  session: { sessionState: 'closed', closedAt: '2026-07-31T12:00:00.000Z' },
})

function snapshot(
  overrides: {
    session?: Partial<ArenaSessionSnapshot['session']>
    actor?: Partial<ArenaSessionSnapshot['actor']>
    teams?: ArenaSessionSnapshot['teams']
    rounds?: ArenaSessionSnapshot['rounds']
    liveRound?: ArenaSessionSnapshot['liveRound']
  } = {},
): ArenaSessionSnapshot {
  return {
    serverTime: '2026-08-05T10:00:00.000Z',
    session: {
      arenaEventId: 'arena-1',
      sourceKind: 'ad_hoc',
      mode: 'casual',
      title: 'Saturday Court',
      activityType: 'basketball',
      teamSize: 3,
      joinMode: 'open',
      sessionState: 'preparing',
      openedAt: null,
      drainingAt: null,
      drainDeadlineAt: null,
      closedAt: null,
      cancelledAt: null,
      createdAt: '2026-07-31T12:00:00.000Z',
      updatedAt: '2026-07-31T12:00:00.000Z',
      ...overrides.session,
    },
    actor: {
      role: 'observer',
      presenceStatus: 'required',
      canJoin: false,
      ...overrides.actor,
    },
    teamParticipation: { blocksPairing: false },
    teams: overrides.teams ?? [],
    rounds: overrides.rounds ?? [],
    liveRound: overrides.liveRound ?? null,
  }
}

function liveRoundSnapshot(
  overrides: Parameters<typeof snapshot>[0] = {},
): ArenaSessionSnapshot {
  return snapshot({
    session: { sessionState: 'open', ...overrides.session },
    actor: {
      role: 'member',
      memberState: 'ready',
      teamId: 'team-1',
      presenceStatus: 'valid',
      canJoin: false,
      roundState: {
        proposalAmount: 40,
        confirmed: true,
        capabilities: {
          isRoundCaptain: true,
          canEditOwnStake: true,
          canConfirmStake: true,
          canStartRound: true,
        },
      },
      ...overrides.actor,
    },
    teams: overrides.teams ?? [],
    rounds: overrides.rounds ?? [],
    liveRound: overrides.liveRound ?? {
      roundId: 'round-1',
      status: 'stake_acceptance',
      phase: 'ready_to_start',
      stake: {
        version: 4,
        courtAvailableAt: '2026-08-05T09:55:00.000Z',
        confirmationDeadlineAt: '2026-08-05T10:05:00.000Z',
        confirmedCount: 6,
        requiredCount: 6,
      },
      champion: { teamId: 'team-1', score: null, members: [] },
      challenger: { teamId: 'team-2', score: null, members: [] },
    },
  })
}
