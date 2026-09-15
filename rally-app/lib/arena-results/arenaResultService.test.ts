import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  approveArenaResult,
  fetchArenaResultSnapshot,
  mutualCancelArenaResult,
  requestArenaResultCorrection,
  submitArenaResult,
} from './arenaResultRepository'
import { arenaResultService, getArenaResultSnapshot } from './arenaResultService'

vi.mock('./arenaResultRepository', () => ({
  fetchArenaResultSnapshot: vi.fn(),
  submitArenaResult: vi.fn(),
  approveArenaResult: vi.fn(),
  requestArenaResultCorrection: vi.fn(),
  mutualCancelArenaResult: vi.fn(),
}))

const HASH = 'a'.repeat(64)

describe('arenaResultService', () => {
  beforeEach(() => {
    vi.mocked(fetchArenaResultSnapshot).mockReset()
    vi.mocked(submitArenaResult).mockReset()
    vi.mocked(approveArenaResult).mockReset()
    vi.mocked(requestArenaResultCorrection).mockReset()
    vi.mocked(mutualCancelArenaResult).mockReset()
    vi.mocked(submitArenaResult).mockResolvedValue({} as never)
    vi.mocked(requestArenaResultCorrection).mockResolvedValue({} as never)
    vi.mocked(mutualCancelArenaResult).mockResolvedValue({} as never)
  })

  it.each([0, 1] as const)('accepts a submitted result with %d of 2 approvals', async (approvedCount) => {
    const snapshot = resultSnapshot({
      currentResult: submittedResult(approvedCount),
      actor: actor({ canApprove: approvedCount === 0 }),
    })
    vi.mocked(fetchArenaResultSnapshot).mockResolvedValue(snapshot)

    await expect(getArenaResultSnapshot('match-id')).resolves.toMatchObject({
      currentResult: { kind: 'submitted', approvals: { approvedCount, requiredCount: 2 } },
    })
  })

  it.each(['correction_requested', 'stat_edit'] as const)(
    'accepts awaiting resubmission for %s',
    async (reason) => {
      vi.mocked(fetchArenaResultSnapshot).mockResolvedValue(resultSnapshot({
        matchStatus: 'in_progress',
        roundStatus: 'disputed',
        currentResult: {
          kind: 'awaiting_resubmission',
          reason,
          resultVersion: 2,
          statsVersion: 3,
          payloadHash: HASH,
          previousSide0Score: 11,
          previousSide1Score: 8,
          note: null,
          requestedByActor: false,
        },
      }))

      await expect(getArenaResultSnapshot('match-id')).resolves.toMatchObject({
        currentResult: { kind: 'awaiting_resubmission', reason },
      })
    },
  )

  it.each([
    ['awaiting_start', resultSnapshot({
      matchStatus: 'pending',
      roundStatus: 'stake_acceptance',
      draftReadiness: { draftCount: 0, requiredCount: 0, complete: false },
      actorDraft: null,
      currentResult: null,
      actor: actor(disabledCapabilities()),
    })],
    ['active', resultSnapshot({
      matchStatus: 'in_progress',
      roundStatus: 'in_progress',
      currentResult: null,
      actor: actor({
        canSubmit: true,
        canApprove: false,
        canRequestCorrection: false,
        canRequestCancel: false,
      }),
    })],
    ['awaiting_review', resultSnapshot({ currentResult: submittedResult(0) })],
    ['awaiting_resubmission', resultSnapshot({
      matchStatus: 'in_progress',
      roundStatus: 'disputed',
      currentResult: awaitingResubmission(),
    })],
    ['cancel_pending', resultSnapshot({
      cancellation: {
        status: 'pending',
        cancelRequestId: '77777777-7777-4777-8777-777777777777',
        requester: 'other',
      },
      actor: actor({
        canSubmit: false,
        canApprove: false,
        canRequestCorrection: false,
        canRequestCancel: false,
        canAgreeCancel: true,
        canDeclineCancel: true,
        canWithdrawCancel: false,
        canEditActorDraft: false,
      }),
    })],
    ['held', resultSnapshot({
      matchStatus: 'disputed',
      roundStatus: 'disputed',
      currentResult: null,
      actor: actor(disabledCapabilities()),
    })],
    ['settled', resultSnapshot({
      matchStatus: 'settled',
      roundStatus: 'settled',
      currentResult: null,
      actor: actor(disabledCapabilities()),
      outcome: settledOutcome(),
    })],
    ['cancelled', resultSnapshot({
      matchStatus: 'cancelled',
      roundStatus: 'cancelled',
      currentResult: null,
      actor: actor(disabledCapabilities()),
      outcome: cancelledOutcome(),
    })],
    ['closed_before_start', resultSnapshot({
      matchStatus: 'cancelled',
      roundStatus: 'cancelled',
      draftReadiness: { draftCount: 0, requiredCount: 0, complete: false },
      actorDraft: null,
      currentResult: null,
      actor: actor(disabledCapabilities()),
    })],
  ])('accepts exact %s phase matrix snapshots', async (phase, snapshot) => {
    vi.mocked(fetchArenaResultSnapshot).mockResolvedValue(snapshot)

    await expect(getArenaResultSnapshot('match-id')).resolves.toMatchObject({ phase })
  })

  it('accepts a read-only teammate during a pending captain cancellation', async () => {
    vi.mocked(fetchArenaResultSnapshot).mockResolvedValue(resultSnapshot({
      cancellation: {
        status: 'pending',
        cancelRequestId: '77777777-7777-4777-8777-777777777777',
        requester: 'other',
      },
      actor: {
        role: 'player',
        side: 0,
        capabilities: disabledCapabilities(),
      },
    }))

    await expect(getArenaResultSnapshot('match-id')).resolves.toMatchObject({
      phase: 'cancel_pending',
      actor: { role: 'player', capabilities: disabledCapabilities() },
    })
  })

  it.each([
    ['before result submission', resultSnapshot({
      matchStatus: 'in_progress',
      roundStatus: 'in_progress',
      currentResult: null,
      actorDraft: actorDraft({ points: 7, note: 'pre-submit' }),
    })],
    ['while awaiting resubmission', resultSnapshot({
      matchStatus: 'in_progress',
      roundStatus: 'disputed',
      currentResult: {
        kind: 'awaiting_resubmission',
        reason: 'stat_edit',
        resultVersion: 2,
        statsVersion: 3,
        payloadHash: HASH,
        previousSide0Score: 11,
        previousSide1Score: 8,
        note: null,
        requestedByActor: false,
      },
      actorDraft: actorDraft({ points: 8, note: 'edited draft' }),
    })],
    ['after terminal settlement', resultSnapshot({
      matchStatus: 'settled',
      roundStatus: 'settled',
      currentResult: null,
      actorDraft: actorDraft({ points: 9, note: null }),
      actor: actor(disabledCapabilities()),
      outcome: {
        status: 'settled',
        winnerSide: 0,
        actorOutcome: 'win',
        rotation: {
          championStreak: 1,
          winnerRetired: false,
          loserQueuePosition: 2,
          loserRetired: false,
          appliedAt: '2026-08-17T10:00:00.000Z',
        },
      },
    })],
  ])('accepts the actor-only draft %s', async (_phase, snapshot) => {
    vi.mocked(fetchArenaResultSnapshot).mockResolvedValue(snapshot)

    await expect(getArenaResultSnapshot('match-id')).resolves.toMatchObject({
      actorDraft: (snapshot as { actorDraft: unknown }).actorDraft,
    })
  })

  it('accepts a null actor draft for an authorized referee snapshot', async () => {
    vi.mocked(fetchArenaResultSnapshot).mockResolvedValue(resultSnapshot({
      currentResult: submittedResult(0),
      actor: { ...actor(disabledCapabilities()), role: 'referee', side: null },
      actorDraft: null,
    }))

    await expect(getArenaResultSnapshot('match-id')).resolves.toMatchObject({ actorDraft: null })
  })

  it('accepts a null actor draft for a roster actor without a saved draft', async () => {
    vi.mocked(fetchArenaResultSnapshot).mockResolvedValue(resultSnapshot({
      currentResult: submittedResult(0),
      actorDraft: null,
    }))

    await expect(getArenaResultSnapshot('match-id')).resolves.toMatchObject({ actorDraft: null })
  })

  it('accepts settled and cancelled durable outcomes', async () => {
    vi.mocked(fetchArenaResultSnapshot)
      .mockResolvedValueOnce(resultSnapshot({
        matchStatus: 'settled',
        roundStatus: 'settled',
        currentResult: null,
        actor: actor(disabledCapabilities()),
        outcome: {
          status: 'settled',
          winnerSide: 0,
          actorOutcome: 'win',
          rotation: {
            championStreak: 2,
            winnerRetired: false,
            loserQueuePosition: 3,
            loserRetired: false,
            appliedAt: '2026-08-17T10:00:00.000Z',
          },
        },
      }))
      .mockResolvedValueOnce(resultSnapshot({
        matchStatus: 'cancelled',
        roundStatus: 'cancelled',
        currentResult: null,
        actor: actor(disabledCapabilities()),
        outcome: {
          status: 'cancelled',
          winnerSide: null,
          actorOutcome: 'cancelled',
          rotation: {
            actorQueuePosition: 2,
            otherTeamRequeued: true,
            appliedAt: '2026-08-17T10:00:00.000Z',
          },
        },
      }))

    await expect(getArenaResultSnapshot('settled-match')).resolves.toMatchObject({
      outcome: { status: 'settled' },
    })
    await expect(getArenaResultSnapshot('cancelled-match')).resolves.toMatchObject({
      outcome: { status: 'cancelled', rotation: { otherTeamRequeued: true } },
    })
  })

  it('accepts disputed snapshots only when result actions are read-only', async () => {
    vi.mocked(fetchArenaResultSnapshot).mockResolvedValue(resultSnapshot({
      roundStatus: 'disputed',
      actor: actor({
        canSubmit: false,
        canApprove: false,
        canRequestCorrection: false,
        canRequestCancel: false,
        canAgreeCancel: false,
        canDeclineCancel: false,
        canWithdrawCancel: false,
        canEditActorDraft: false,
      }),
    }))

    await expect(getArenaResultSnapshot('match-id')).resolves.toMatchObject({
      roundStatus: 'disputed',
      actor: { capabilities: { canSubmit: false, canApprove: false } },
    })
  })

  it('preserves server-authorized correction capabilities while a resubmission is awaiting', async () => {
    vi.mocked(fetchArenaResultSnapshot).mockResolvedValue(resultSnapshot({
      matchStatus: 'in_progress',
      roundStatus: 'disputed',
      currentResult: {
        kind: 'awaiting_resubmission',
        reason: 'correction_requested',
        resultVersion: 2,
        statsVersion: 3,
        payloadHash: HASH,
        previousSide0Score: 11,
        previousSide1Score: 8,
        note: null,
        requestedByActor: false,
      },
      actor: actor({
        canSubmit: true,
        canApprove: false,
        canRequestCorrection: false,
        canRequestCancel: true,
        canAgreeCancel: false,
        canDeclineCancel: false,
        canWithdrawCancel: false,
        canEditActorDraft: true,
      }),
    }))

    await expect(getArenaResultSnapshot('match-id')).resolves.toMatchObject({
      matchStatus: 'in_progress',
      roundStatus: 'disputed',
      currentResult: { kind: 'awaiting_resubmission' },
      actor: {
        capabilities: {
          canSubmit: true,
          canEditActorDraft: true,
        },
      },
    })
  })

  it.each([
    ['payload hash', resultSnapshot({ currentResult: submittedResult(1, { payloadHash: 'not-a-hash' }) })],
    ['awaiting review cancellation agreement capability', resultSnapshot({
      currentResult: submittedResult(0),
      actor: actor({ canAgreeCancel: true }),
    })],
    ['approval count', resultSnapshot({ currentResult: submittedResult(2, { approvals: { side0: true, side1: true, approvedCount: 1, requiredCount: 2, actorApproved: true } }) })],
    ['stat side', resultSnapshot({ currentResult: submittedResult(1, { stats: [stat({ side: 2 })] }) })],
    ['settled rotation', resultSnapshot({
      matchStatus: 'settled',
      roundStatus: 'settled',
      currentResult: null,
      outcome: {
        status: 'settled',
        winnerSide: 0,
        actorOutcome: 'win',
        rotation: {
          championStreak: 1,
          winnerRetired: false,
          loserQueuePosition: null,
          loserRetired: false,
        },
      },
    })],
    ['raw user identifier', resultSnapshot({ currentResult: submittedResult(1, { stats: [{ ...stat(), userId: 'raw-user-id' }] }) })],
    ['other actor draft identifier', resultSnapshot({ actorDraft: { ...actorDraft(), userId: 'other-actor' } })],
    ['referee actor draft', resultSnapshot({
      actor: { ...actor(), role: 'referee', side: null },
      actorDraft: actorDraft(),
    })],
    ['terminal resubmission', resultSnapshot({
      matchStatus: 'settled',
      roundStatus: 'settled',
      currentResult: {
        kind: 'awaiting_resubmission',
        reason: 'correction_requested',
        resultVersion: 2,
        statsVersion: 3,
        payloadHash: HASH,
        previousSide0Score: 11,
        previousSide1Score: 8,
        note: null,
        requestedByActor: false,
      },
      outcome: {
        status: 'settled',
        winnerSide: 0,
        actorOutcome: 'win',
        rotation: {
          championStreak: 1,
          winnerRetired: false,
          loserQueuePosition: 2,
          loserRetired: false,
          appliedAt: '2026-08-17T10:00:00.000Z',
        },
      },
    })],
    ['held capabilities', resultSnapshot({
      matchStatus: 'disputed',
      roundStatus: 'disputed',
      currentResult: null,
      actor: actor({
        canSubmit: false,
        canApprove: false,
        canRequestCorrection: false,
        canRequestCancel: false,
        canAgreeCancel: false,
        canDeclineCancel: false,
        canWithdrawCancel: false,
        canEditActorDraft: true,
      }),
    })],
    ['unknown current result', resultSnapshot({ currentResult: { kind: 'held' } })],
  ])('rejects malformed %s snapshots before UI can enable actions', async (_label, snapshot) => {
    vi.mocked(fetchArenaResultSnapshot).mockResolvedValue(snapshot)

    await expect(getArenaResultSnapshot('match-id')).rejects.toMatchObject({
      code: 'arena_result_invalid_snapshot',
    })
  })

  it.each([
    ['a player submitting an active result', resultSnapshot({
      matchStatus: 'in_progress',
      roundStatus: 'in_progress',
      currentResult: null,
      actor: {
        role: 'player',
        side: 0,
        capabilities: {
          ...disabledCapabilities(),
          canSubmit: true,
          canEditActorDraft: true,
        },
      },
    })],
    ['a player approving a submitted result', resultSnapshot({
      actor: {
        role: 'player',
        side: 0,
        capabilities: {
          ...disabledCapabilities(),
          canApprove: true,
          canEditActorDraft: true,
        },
      },
    })],
    ['a player requesting cancellation during resubmission', resultSnapshot({
      matchStatus: 'in_progress',
      roundStatus: 'disputed',
      currentResult: awaitingResubmission(),
      actor: {
        role: 'player',
        side: 0,
        capabilities: {
          ...disabledCapabilities(),
          canRequestCancel: true,
          canEditActorDraft: true,
        },
      },
    })],
    ['a non-captain claiming to be the cancellation requester', resultSnapshot({
      cancellation: {
        status: 'pending',
        cancelRequestId: '77777777-7777-4777-8777-777777777777',
        requester: 'self',
      },
      actor: {
        role: 'player',
        side: 0,
        capabilities: disabledCapabilities(),
      },
    })],
    ['a referee carrying a roster side', resultSnapshot({
      matchStatus: 'in_progress',
      roundStatus: 'in_progress',
      currentResult: null,
      actorDraft: null,
      actor: {
        role: 'referee',
        side: 0,
        capabilities: {
          ...disabledCapabilities(),
          canSubmit: true,
        },
      },
    })],
  ])('rejects impossible actor capability projections: %s', async (_label, snapshot) => {
    vi.mocked(fetchArenaResultSnapshot).mockResolvedValue(snapshot)

    await expect(getArenaResultSnapshot('match-id')).rejects.toMatchObject({
      code: 'arena_result_invalid_snapshot',
    })
  })

  it('forwards canonical action inputs and preserves version conflicts for the hook', async () => {
    const conflict = { code: 'arena_result_version_conflict', message: 'stale' }
    vi.mocked(approveArenaResult).mockRejectedValue(conflict)

    await expect(arenaResultService.submit({
      matchId: 'match-id', side0Score: 11, side1Score: 8, expectedReviewEpoch: 3,
    })).resolves.toEqual({})
    await expect(arenaResultService.approve({
      matchId: 'match-id', resultVersion: 2, payloadHash: HASH, expectedReviewEpoch: 3,
    })).rejects.toBe(conflict)
    await arenaResultService.requestCorrection({
      matchId: 'match-id', resultVersion: 2, payloadHash: HASH, expectedReviewEpoch: 3,
    })
    await arenaResultService.mutualCancel({
      matchId: 'match-id', cancelAction: 'request', expectedReviewEpoch: 3,
    })

    expect(submitArenaResult).toHaveBeenCalledWith({
      matchId: 'match-id', side0Score: 11, side1Score: 8, expectedReviewEpoch: 3,
    })
    expect(approveArenaResult).toHaveBeenCalledWith({
      matchId: 'match-id', resultVersion: 2, payloadHash: HASH, expectedReviewEpoch: 3,
    })
    expect(requestArenaResultCorrection).toHaveBeenCalledWith({
      matchId: 'match-id', resultVersion: 2, payloadHash: HASH, expectedReviewEpoch: 3,
    })
    expect(mutualCancelArenaResult).toHaveBeenCalledWith({
      matchId: 'match-id', cancelAction: 'request', expectedReviewEpoch: 3,
    })
  })
})

function resultSnapshot(overrides: Record<string, unknown> = {}) {
  const snapshot = {
    arenaEventId: 'arena-id',
    roundId: 'round-id',
    matchId: 'match-id',
    activityType: 'basketball',
    reviewEpoch: 1,
    matchStatus: 'in_progress',
    roundStatus: 'result_pending',
    draftReadiness: { draftCount: 6, requiredCount: 6, complete: true },
    actorDraft: actorDraft(),
    currentResult: submittedResult(1),
    cancellation: { status: 'none', cancelRequestId: null, requester: null },
    actor: actor(),
    outcome: null,
    ...overrides,
  }
  const phase = typeof overrides.phase === 'string'
    ? overrides.phase
    : phaseForSnapshot(snapshot)
  return {
    ...snapshot,
    phase,
    actor: Object.prototype.hasOwnProperty.call(overrides, 'actor')
      ? snapshot.actor
      : actorForPhase(phase),
  }
}

function submittedResult(approvedCount: 0 | 1 | 2, overrides: Record<string, unknown> = {}) {
  const approvals = approvedCount === 0
    ? { side0: false, side1: false, approvedCount, requiredCount: 2, actorApproved: false }
    : approvedCount === 1
      ? { side0: true, side1: false, approvedCount, requiredCount: 2, actorApproved: true }
      : { side0: true, side1: true, approvedCount, requiredCount: 2, actorApproved: true }
  return {
    kind: 'submitted',
    resultVersion: 2,
    statsVersion: 3,
    payloadHash: HASH,
    submitterRole: 'captain',
    side0Score: 11,
    side1Score: 8,
    note: null,
    submittedAt: '2026-08-17T10:00:00.000Z',
    stats: [stat()],
    approvals,
    ...overrides,
  }
}

function stat(overrides: Record<string, unknown> = {}) {
  return {
    side: 0,
    isActor: true,
    displayName: 'Captain',
    handle: 'captain',
    avatarUrl: null,
    points: 11,
    rebounds: 2,
    assists: 1,
    blocks: 0,
    threePointersMade: 1,
    ...overrides,
  }
}

function actorDraft(overrides: Record<string, unknown> = {}) {
  return {
    points: 5,
    rebounds: 1,
    assists: 2,
    blocks: 0,
    threePointersMade: 1,
    note: 'my draft',
    updatedAt: '2026-08-17T10:00:00.000Z',
    draftRevision: 1,
    ...overrides,
  }
}

function actor(capabilities: Record<string, boolean> = {}) {
  return {
    role: 'captain',
    side: 0,
    capabilities: {
      canSubmit: false,
      canApprove: true,
      canRequestCorrection: true,
      canRequestCancel: true,
      canAgreeCancel: false,
      canDeclineCancel: false,
      canWithdrawCancel: false,
      canEditActorDraft: true,
      ...capabilities,
    },
  }
}

function actorForPhase(phase: string) {
  if (phase === 'active') {
    return actor({
      canSubmit: true,
      canApprove: false,
      canRequestCorrection: false,
      canRequestCancel: false,
    })
  }
  if (phase === 'awaiting_resubmission') {
    return actor({
      canSubmit: true,
      canApprove: false,
      canRequestCorrection: false,
      canRequestCancel: true,
    })
  }
  if (phase === 'awaiting_review') return actor()
  return actor(disabledCapabilities())
}

function disabledCapabilities(): Record<string, boolean> {
  return {
    canSubmit: false,
    canApprove: false,
    canRequestCorrection: false,
    canRequestCancel: false,
    canAgreeCancel: false,
    canDeclineCancel: false,
    canWithdrawCancel: false,
    canEditActorDraft: false,
  }
}

function awaitingResubmission() {
  return {
    kind: 'awaiting_resubmission',
    reason: 'stat_edit',
    resultVersion: 2,
    statsVersion: 3,
    payloadHash: HASH,
    previousSide0Score: 11,
    previousSide1Score: 8,
    note: null,
    requestedByActor: false,
  }
}

function settledOutcome() {
  return {
    status: 'settled',
    winnerSide: 0,
    actorOutcome: 'win',
    rotation: {
      championStreak: 1,
      winnerRetired: false,
      loserQueuePosition: 2,
      loserRetired: false,
      appliedAt: '2026-08-17T10:00:00.000Z',
    },
  }
}

function cancelledOutcome() {
  return {
    status: 'cancelled',
    winnerSide: null,
    actorOutcome: 'cancelled',
    rotation: {
      actorQueuePosition: 2,
      otherTeamRequeued: true,
      appliedAt: '2026-08-17T10:00:00.000Z',
    },
  }
}

function phaseForSnapshot(snapshot: Record<string, unknown>) {
  if (snapshot.matchStatus === 'pending') return 'awaiting_start'
  if (snapshot.matchStatus === 'settled') return 'settled'
  if (snapshot.matchStatus === 'cancelled') {
    return snapshot.outcome === null ? 'closed_before_start' : 'cancelled'
  }
  const cancellation = snapshot.cancellation as { status?: unknown }
  if (cancellation.status === 'pending') return 'cancel_pending'
  const currentResult = snapshot.currentResult as { kind?: unknown } | null
  if (currentResult?.kind === 'awaiting_resubmission') return 'awaiting_resubmission'
  if (snapshot.matchStatus === 'disputed' || snapshot.roundStatus === 'disputed') return 'held'
  if (currentResult?.kind === 'submitted') return 'awaiting_review'
  return 'active'
}
