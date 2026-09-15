import { beforeEach, describe, expect, it, vi } from 'vitest'
import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import {
  chooseArenaTeamParticipation,
  getArenaSessionSnapshot,
} from './arenaSessionRepository'
import { arenaSessionActions } from './arenaSessionActions'
import { mapArenaSessionSnapshot } from './arenaSessionService'

vi.mock('@/lib/supabase/invokeFunction', () => ({
  invokeAuthenticatedFunction: vi.fn(),
}))

vi.mock('@/lib/supabase/edgeError', () => ({
  extractEdgeFunctionError: vi.fn(async (error) => error),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}))

const arenaId = '11111111-1111-4111-8111-111111111111'
const cycleId = '22222222-2222-4222-8222-222222222222'

describe('Arena team participation mobile transport', () => {
  beforeEach(() => {
    vi.mocked(invokeAuthenticatedFunction).mockReset()
    vi.mocked(extractEdgeFunctionError).mockReset()
  })

  it('sends the exact captain decision body to arena-events without an actor id', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: participationActionOutput(),
      error: null,
    } as never)

    await expect(chooseArenaTeamParticipation({
      arenaId,
      participationCycleId: cycleId,
      expectedRevision: 1,
      decision: 'continue',
    })).resolves.toEqual(participationActionOutput())

    expect(invokeAuthenticatedFunction).toHaveBeenCalledWith('arena-events', {
      body: {
        action: 'choose_team_participation',
        sessionId: arenaId,
        participationCycleId: cycleId,
        expectedRevision: 1,
        decision: 'continue',
      },
    })
    expect(JSON.stringify(vi.mocked(invokeAuthenticatedFunction).mock.calls[0])).not.toContain('actor')
  })

  it('rejects a malformed or non-echoed decision result instead of treating it as success', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: {
        arenaId,
        result: {
          participationCycleId: cycleId,
          teamId: 'team-1',
          state: 'ready_to_pair',
          revision: 2,
          decision: 'retire',
          idempotent: false,
        },
      },
      error: null,
    } as never)

    await expect(chooseArenaTeamParticipation({
      arenaId,
      participationCycleId: cycleId,
      expectedRevision: 1,
      decision: 'continue',
    })).rejects.toThrow('arena-events returned an invalid team participation result')
  })

  it('preserves the stable Edge conflict code without branching on server message text', async () => {
    const edgeConflict = {
      code: 'arena_team_participation_cycle_conflict',
      message: 'arbitrary server copy that must not control client behavior',
    }
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: null,
      error: edgeConflict,
    } as never)
    vi.mocked(extractEdgeFunctionError).mockResolvedValue(edgeConflict as never)

    await expect(chooseArenaTeamParticipation({
      arenaId,
      participationCycleId: cycleId,
      expectedRevision: 1,
      decision: 'continue',
    })).rejects.toMatchObject({ code: 'arena_team_participation_cycle_conflict' })

    expect(extractEdgeFunctionError).toHaveBeenCalledWith(
      edgeConflict,
      'Arena team participation action failed',
    )
  })

  it('requires an exact detailed or coarse participation snapshot after cutover', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: sessionSnapshot({ blocksPairing: false }),
      error: null,
    } as never)

    await expect(getArenaSessionSnapshot(arenaId)).resolves.toMatchObject({
      teamParticipation: { blocksPairing: false },
    })

    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: sessionSnapshot({
        participationCycleId: cycleId,
        teamId: 'team-1',
        lane: 'queue',
        state: 'ready_to_pair',
        revision: 2,
        queuePosition: 3,
        blocksPairing: false,
        capabilities: { canContinue: false, canRetire: true },
      }),
      error: null,
    } as never)

    await expect(getArenaSessionSnapshot(arenaId)).resolves.toMatchObject({
      teamParticipation: {
        participationCycleId: cycleId,
        capabilities: { canContinue: false, canRetire: true },
      },
    })

    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: sessionSnapshot({ blocksPairing: false, capabilities: { canContinue: false, canRetire: false } }),
      error: null,
    } as never)

    await expect(getArenaSessionSnapshot(arenaId))
      .rejects.toThrow('arena-sessions returned an invalid team participation snapshot')
  })

  it('delegates the decision action and exposes server capabilities without recomputing them', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: participationActionOutput(),
      error: null,
    } as never)

    await arenaSessionActions.chooseTeamParticipation({
      arenaId,
      participationCycleId: cycleId,
      expectedRevision: 1,
      decision: 'continue',
    })

    const model = mapArenaSessionSnapshot(sessionSnapshot({
      participationCycleId: cycleId,
      teamId: 'team-1',
      lane: 'champion',
      state: 'ready_to_pair',
      revision: 2,
      queuePosition: null,
      blocksPairing: false,
      capabilities: { canContinue: false, canRetire: true },
    }) as never)

    expect(model.teamParticipation).toEqual({
      participationCycleId: cycleId,
      teamId: 'team-1',
      lane: 'champion',
      state: 'ready_to_pair',
      revision: 2,
      queuePosition: null,
      blocksPairing: false,
      capabilities: { canContinue: false, canRetire: true },
    })
  })
})

function participationActionOutput() {
  return {
    arenaId,
    result: {
      participationCycleId: cycleId,
      teamId: 'team-1',
      state: 'ready_to_pair',
      revision: 2,
      decision: 'continue',
      idempotent: false,
    },
  }
}

function sessionSnapshot(teamParticipation: unknown) {
  return {
    session: {
      arenaEventId: arenaId,
      sourceKind: 'ad_hoc',
      mode: 'casual',
      title: 'Court',
      activityType: 'basketball',
      teamSize: 3,
      joinMode: 'open',
      sessionState: 'open',
      openedAt: null,
      drainingAt: null,
      drainDeadlineAt: null,
      closedAt: null,
      cancelledAt: null,
      createdAt: '2026-08-24T00:00:00.000Z',
      updatedAt: '2026-08-24T00:00:00.000Z',
    },
    actor: {
      role: 'member',
      presenceStatus: 'valid',
      canJoin: false,
      canOpen: false,
      canRecordPresence: false,
    },
    teams: [],
    rounds: [],
    liveRound: null,
    teamParticipation,
  }
}
