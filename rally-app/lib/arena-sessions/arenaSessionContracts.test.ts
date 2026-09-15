import { describe, expect, it } from 'vitest'
import type { ArenaRoundPhase, ArenaSessionSnapshot } from '@/types/arenaSession'

describe('Arena Session mobile contracts', () => {
  it('supports every UI round phase', () => {
    const phases: ArenaRoundPhase[] = [
      'queue',
      'stake_confirmation',
      'ready_to_start',
      'active',
      'result_review',
      'settled',
      'cancelled',
      'void',
    ]

    expect(phases).toEqual([
      'queue',
      'stake_confirmation',
      'ready_to_start',
      'active',
      'result_review',
      'settled',
      'cancelled',
      'void',
    ])
  })

  it('types the server-backed round snapshot fields', () => {
    const snapshot: ArenaSessionSnapshot = {
      serverTime: '2026-08-05T10:00:00.000Z',
      session: {
        arenaEventId: 'arena-1',
        sourceKind: 'ad_hoc',
        mode: 'casual',
        title: 'Saturday Court',
        activityType: 'basketball',
        teamSize: 3,
        joinMode: 'open',
        sessionState: 'open',
        openedAt: '2026-08-05T09:00:00.000Z',
        drainingAt: null,
        drainDeadlineAt: null,
        closedAt: null,
        cancelledAt: null,
        createdAt: '2026-08-05T08:00:00.000Z',
        updatedAt: '2026-08-05T10:00:00.000Z',
      },
      actor: {
        role: 'member',
        memberState: 'ready',
        teamId: 'team-1',
        presenceStatus: 'valid',
        canJoin: false,
        canOpen: false,
        canRecordPresence: false,
        roundState: {
          proposalAmount: 42,
          confirmed: true,
          capabilities: {
            isRoundCaptain: true,
            canEditOwnStake: true,
            canConfirmStake: true,
            canStartRound: true,
          },
        },
      },
      teamParticipation: { blocksPairing: false },
      teams: [],
      rounds: [],
      liveRound: {
        roundId: 'round-1',
        status: 'stake_acceptance',
        phase: 'ready_to_start',
        stake: {
          version: 3,
          courtAvailableAt: '2026-08-05T10:05:00.000Z',
          confirmationDeadlineAt: '2026-08-05T10:10:00.000Z',
          confirmedCount: 6,
          requiredCount: 6,
        },
        champion: {
          teamId: 'team-1',
          score: null,
          members: [{
            displayName: 'Ari',
            handle: 'ari',
            avatarUrl: null,
            positionKey: 'guard',
            isCaptain: true,
          }],
        },
        challenger: {
          teamId: 'team-2',
          score: null,
          members: [{
            displayName: 'Bea',
            handle: 'bea',
            avatarUrl: null,
            positionKey: 'guard',
            isCaptain: false,
          }],
        },
      },
    }

    expect(snapshot.liveRound?.stake?.confirmedCount).toBe(6)
    expect(snapshot.liveRound?.champion.members[0]?.isCaptain).toBe(true)
  })
})
