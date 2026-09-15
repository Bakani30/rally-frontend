import { describe, expect, it } from 'vitest'

import { normalizeStatLine } from '@/lib/match/basketballStatSheetControls'
import type { ArenaRoundResultSnapshot } from '@/types/arenaResult'
import { deriveArenaResultPresentation } from './arenaResultPresentation'

const HASH = 'a'.repeat(64)

describe('deriveArenaResultPresentation', () => {
  it('keeps result submission unavailable while player stats are incomplete', () => {
    const presentation = deriveArenaResultPresentation(snapshot({
      draftReadiness: { draftCount: 3, requiredCount: 4, complete: false },
      actor: actor({ canSubmit: true }),
    }))

    expect(presentation).toMatchObject({
      kind: 'stats_incomplete',
      readiness: {
        label: 'รอสถิติผู้เล่นให้ครบ',
        progress: { current: 3, total: 4 },
      },
      score: { editable: false },
      mutations: noMutations(),
    })
  })

  it('exposes two editable scores only to a captain allowed to submit', () => {
    const presentation = deriveArenaResultPresentation(snapshot({
      actor: actor({ canSubmit: true }),
    }))

    expect(presentation).toMatchObject({
      kind: 'ready_to_submit',
      score: {
        side0: 0,
        side1: 0,
        editable: true,
        tieHelper: 'ต้องเล่นแต้มตัดสินก่อนส่งผล',
      },
      mutations: {
        ...noMutations(),
        submit: true,
      },
    })

    expect(deriveArenaResultPresentation(snapshot({
      actor: actor({ canSubmit: false }),
    }))).toMatchObject({
      kind: 'ready_to_submit',
      score: { editable: false },
      mutations: noMutations(),
    })
  })

  it('does not create a self-stat draft model or identifiers for a referee actor', () => {
    const presentation = deriveArenaResultPresentation(snapshot({
      actor: { ...actor(), role: 'referee', side: null },
    }))

    expect(presentation.actorStat).toBeNull()
    expect(JSON.stringify(presentation)).not.toMatch(/(?:userId|participantId|draftId)/)
  })

  it('uses a 2-point long-range stat label and validation floor for a 3v3 Arena actor draft', () => {
    const presentation = deriveArenaResultPresentation(snapshot({
      draftReadiness: { draftCount: 6, requiredCount: 6, complete: true },
    }))

    expect(presentation.actorStat).toMatchObject({
      longRangePointValue: 2,
      longShotLabel: '2PT',
    })
    expect(normalizeStatLine({
      points: 2,
      rebounds: 0,
      assists: 0,
      blocks: 0,
      threePointersMade: 1,
    }, presentation.actorStat?.longRangePointValue)).toMatchObject({
      points: 2,
      threePointersMade: 1,
    })
  })

  it('shows the immutable version and approval progress while awaiting approvals', () => {
    const presentation = deriveArenaResultPresentation(snapshot({
      currentResult: submitted({ approvedCount: 1, actorApproved: false }),
      actor: actor({ canApprove: true, canRequestCorrection: true }),
    }))

    expect(presentation).toMatchObject({
      kind: 'awaiting_approvals',
      consensus: {
        versionLabel: 'ผลแข่งเวอร์ชัน 2',
        approvalLabel: 'ยืนยันแล้ว 1/2',
        actorAlreadyApproved: false,
      },
      mutations: {
        ...noMutations(),
        approve: true,
        requestCorrection: true,
      },
    })
  })

  it('locks the approval CTA after the actor has approved the current version', () => {
    const presentation = deriveArenaResultPresentation(snapshot({
      currentResult: submitted({ approvedCount: 1, actorApproved: true }),
      actor: actor({ canApprove: true }),
    }))

    expect(presentation).toMatchObject({
      kind: 'awaiting_approvals',
      consensus: {
        actorAlreadyApproved: true,
        lockedLabel: 'คุณยืนยันผลแล้ว',
      },
      mutations: noMutations(),
    })
  })

  it('treats an invalidated result as prior-score context and gates resubmission', () => {
    const resubmission = {
      kind: 'awaiting_resubmission' as const,
      reason: 'correction_requested' as const,
      resultVersion: 2,
      statsVersion: 3,
      payloadHash: HASH,
      previousSide0Score: 11,
      previousSide1Score: 8,
      note: null,
      requestedByActor: false,
    }
    const allowed = deriveArenaResultPresentation(snapshot({
      currentResult: resubmission,
      actor: actor({ canSubmit: true }),
    }))

    expect(allowed).toMatchObject({
      kind: 'awaiting_resubmission',
      score: {
        side0: 11,
        side1: 8,
        editable: true,
        contextLabel: 'คะแนนเวอร์ชันก่อนหน้า',
      },
      mutations: {
        ...noMutations(),
        submit: true,
      },
    })

    expect(deriveArenaResultPresentation(snapshot({
      currentResult: resubmission,
      actor: actor({ canSubmit: false }),
    }))).toMatchObject({
      kind: 'awaiting_resubmission',
      score: { editable: false },
      mutations: noMutations(),
    })
  })

  it('prioritizes awaiting resubmission over disputed presentation state', () => {
    const presentation = deriveArenaResultPresentation(snapshot({
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
      actor: actor({ canSubmit: true, canEditActorDraft: true } as never),
    } as never))

    expect(presentation).toMatchObject({
      kind: 'awaiting_resubmission',
      score: { editable: true },
      actorStat: { editable: true },
      mutations: { ...noMutations(), submit: true },
    })
  })

  it('uses the server-owned actor-draft capability instead of inferring editability', () => {
    const presentation = deriveArenaResultPresentation(snapshot({
      actor: actor({ canEditActorDraft: false } as never),
    } as never))

    expect(presentation.actorStat).toMatchObject({ editable: false })
  })

  it.each([
    ['before result submission', snapshot({
      actorDraft: actorDraft({ points: 7, rebounds: 3, note: 'before submit' }),
    } as never), { points: 7, rebounds: 3, note: 'before submit' }],
    ['while awaiting resubmission', snapshot({
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
      actorDraft: actorDraft({ points: 8, rebounds: 4, note: 'edited draft' }),
    } as never), { points: 8, rebounds: 4, note: 'edited draft' }],
    ['after terminal settlement', snapshot({
      matchStatus: 'settled',
      roundStatus: 'settled',
      currentResult: submitted({ stats: [actorStat({ points: 0, rebounds: 0 })] }),
      actorDraft: actorDraft({ points: 9, rebounds: 5, note: 'terminal draft' }),
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
    } as never), { points: 9, rebounds: 5, note: 'terminal draft' }],
  ])('hydrates the authoritative actor draft %s instead of a result-stat fallback', (
    _phase,
    snapshot,
    expected,
  ) => {
    const presentation = deriveArenaResultPresentation(snapshot)

    expect(presentation.actorStat).toMatchObject({
      initial: expect.objectContaining({
        points: expected.points,
        rebounds: expected.rebounds,
      }),
      initialNote: expected.note,
    })
  })

  it('uses the durable settled outcome for final copy, score, personal stats, and rotation', () => {
    const presentation = deriveArenaResultPresentation(snapshot({
      matchStatus: 'settled',
      roundStatus: 'settled',
      currentResult: submitted({
        side0Score: 21,
        side1Score: 18,
        stats: [actorStat({ points: 12, rebounds: 5, assists: 4, blocks: 1, threePointersMade: 2 })],
      }),
      actorDraft: actorDraft({ points: 12, rebounds: 5, assists: 4, blocks: 1, threePointersMade: 2 }),
      actor: actor(),
      outcome: {
        status: 'settled',
        winnerSide: 0,
        actorOutcome: 'win',
        rotation: {
          championStreak: 3,
          winnerRetired: false,
          loserQueuePosition: 2,
          loserRetired: false,
          appliedAt: '2026-08-17T10:00:00.000Z',
        },
      },
    }))

    expect(presentation).toMatchObject({
      kind: 'settled',
      score: { side0: 21, side1: 18, editable: false },
      actorStat: {
        initial: { points: 12, rebounds: 5, assists: 4, blocks: 1, threePointersMade: 2 },
      },
      terminal: {
        celebrates: true,
        title: 'ทีมคุณชนะรอบนี้',
        rotationLabel: 'ชนะต่อเนื่อง 3 รอบ',
      },
      mutations: noMutations(),
      showReturnToArena: true,
    })
  })

  it('keeps a terminal referee view free of a player stat model', () => {
    const presentation = deriveArenaResultPresentation(snapshot({
      matchStatus: 'settled',
      roundStatus: 'settled',
      actor: { ...actor(), role: 'referee', side: null },
      outcome: {
        status: 'settled',
        winnerSide: 0,
        actorOutcome: null,
        rotation: {
          championStreak: 1,
          winnerRetired: false,
          loserQueuePosition: 2,
          loserRetired: false,
          appliedAt: '2026-08-17T10:00:00.000Z',
        },
      },
    }))

    expect(presentation.actorStat).toBeNull()
  })

  it('shows only server-owned cancellation status without a celebration or other-team queue position', () => {
    const presentation = deriveArenaResultPresentation(snapshot({
      matchStatus: 'cancelled',
      roundStatus: 'cancelled',
      actor: actor(),
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

    expect(presentation).toMatchObject({
      kind: 'cancelled',
      terminal: {
        celebrates: false,
        title: 'รอบของคุณยกเลิกแล้ว',
        rotationLabel: 'ทีมคุณอยู่ลำดับคิว 2',
      },
      mutations: noMutations(),
      showReturnToArena: true,
    })
    expect(JSON.stringify(presentation)).not.toContain('otherTeamRequeued')
  })

  it('uses the losing actor durable queue position without presenting the winner rotation as their own', () => {
    const presentation = deriveArenaResultPresentation(snapshot({
      matchStatus: 'settled',
      roundStatus: 'settled',
      outcome: {
        status: 'settled',
        winnerSide: 1,
        actorOutcome: 'loss',
        rotation: {
          championStreak: 4,
          winnerRetired: false,
          loserQueuePosition: 3,
          loserRetired: false,
          appliedAt: '2026-08-17T10:00:00.000Z',
        },
      },
    }))

    expect(presentation.terminal).toMatchObject({
      title: 'ทีมคุณแพ้รอบนี้',
      rotationLabel: 'ทีมคุณอยู่ลำดับคิว 3',
    })
    expect(presentation.terminal?.rotationLabel).not.toContain('ชนะต่อเนื่อง')
  })

  it('uses the cancelled actor durable queue position and keeps a referee terminal copy neutral', () => {
    const playerPresentation = deriveArenaResultPresentation(snapshot({
      matchStatus: 'cancelled',
      roundStatus: 'cancelled',
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
    const refereePresentation = deriveArenaResultPresentation(snapshot({
      matchStatus: 'cancelled',
      roundStatus: 'cancelled',
      actor: { ...actor(), role: 'referee', side: null },
      outcome: {
        status: 'cancelled',
        winnerSide: null,
        actorOutcome: null,
        rotation: {
          actorQueuePosition: null,
          otherTeamRequeued: true,
          appliedAt: '2026-08-17T10:00:00.000Z',
        },
      },
    }))

    expect(playerPresentation.terminal).toMatchObject({
      title: 'รอบของคุณยกเลิกแล้ว',
      rotationLabel: 'ทีมคุณอยู่ลำดับคิว 2',
    })
    expect(refereePresentation.terminal).toMatchObject({
      title: 'รอบนี้ยกเลิกแล้ว',
      rotationLabel: 'Arena อัปเดตคิวหลังยกเลิกแล้ว',
    })
  })

  it('keeps a held result read-only while still exposing the return-to-Arena path', () => {
    const presentation = deriveArenaResultPresentation(snapshot({
      roundStatus: 'disputed',
    }))

    expect(presentation).toMatchObject({
      kind: 'held',
      readOnly: true,
      showReturnToArena: true,
      mutations: noMutations(),
    })
  })

  it('fails closed for disputed or held states even if a malformed snapshot advertises capabilities', () => {
    const presentation = deriveArenaResultPresentation(snapshot({
      roundStatus: 'disputed',
      actor: actor({
        canSubmit: true,
        canApprove: true,
        canRequestCorrection: true,
        canRequestCancel: true,
        canAgreeCancel: true,
      }),
      currentResult: submitted({ approvedCount: 1 }),
    }))

    expect(presentation).toMatchObject({
      kind: 'held',
      readOnly: true,
      mutations: noMutations(),
      consensus: null,
    })
  })

  it('carries the requester withdrawal capability without inferring another cancellation action', () => {
    const presentation = deriveArenaResultPresentation(snapshot({
      currentResult: submitted({ approvedCount: 0 }),
      cancellation: {
        status: 'pending',
        cancelRequestId: '77777777-7777-4777-8777-777777777777',
        requester: 'self',
      },
      actor: actor({
        canSubmit: false,
        canRequestCancel: false,
        canWithdrawCancel: true,
      }),
    }))

    expect(presentation.mutations).toEqual({
      submit: false,
      approve: false,
      requestCorrection: false,
      requestCancel: false,
      agreeCancel: false,
      declineCancel: false,
      withdrawCancel: true,
    })
  })

  it('carries both other-captain cancellation decisions without inference', () => {
    const presentation = deriveArenaResultPresentation(snapshot({
      currentResult: submitted({ approvedCount: 0 }),
      cancellation: {
        status: 'pending',
        cancelRequestId: '77777777-7777-4777-8777-777777777777',
        requester: 'other',
      },
      actor: actor({
        canSubmit: false,
        canRequestCancel: false,
        canAgreeCancel: true,
        canDeclineCancel: true,
      }),
    }))

    expect(presentation.mutations).toEqual({
      submit: false,
      approve: false,
      requestCorrection: false,
      requestCancel: false,
      agreeCancel: true,
      declineCancel: true,
      withdrawCancel: false,
    })
  })

  it('makes cancel_pending override submitted-result approval copy and affordances', () => {
    const presentation = deriveArenaResultPresentation(snapshot({
      phase: 'cancel_pending',
      roundStatus: 'result_pending',
      currentResult: submitted({ approvedCount: 1 }),
      cancellation: {
        status: 'pending',
        cancelRequestId: '77777777-7777-4777-8777-777777777777',
        requester: 'other',
      },
      actor: actor({
        canApprove: true,
        canRequestCorrection: true,
        canAgreeCancel: true,
        canDeclineCancel: true,
      }),
    }))

    expect(presentation).toMatchObject({
      kind: 'awaiting_approvals',
      cancelPending: true,
      status: { label: 'รอการตัดสินใจ' },
      readiness: { label: 'อีกทีมขอยกเลิกรอบ เลือกยืนยันหรือปฏิเสธ' },
      score: { side0: null, side1: null, editable: false, contextLabel: null },
      consensus: null,
      actorStat: null,
      mutations: {
        ...noMutations(),
        agreeCancel: true,
        declineCancel: true,
      },
    })
  })

  it('makes cancel_pending override resubmission copy and expose only requester withdrawal', () => {
    const presentation = deriveArenaResultPresentation(snapshot({
      phase: 'cancel_pending',
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
        requestedByActor: true,
      },
      cancellation: {
        status: 'pending',
        cancelRequestId: '77777777-7777-4777-8777-777777777777',
        requester: 'self',
      },
      actor: actor({ canSubmit: true, canWithdrawCancel: true }),
    }))

    expect(presentation).toMatchObject({
      kind: 'awaiting_approvals',
      cancelPending: true,
      status: { label: 'รออีกทีมตอบ' },
      readiness: { label: 'คุณขอยกเลิกรอบแล้ว รออีกทีมตอบรับหรือปฏิเสธ' },
      score: { side0: null, side1: null, editable: false, contextLabel: null },
      consensus: null,
      actorStat: null,
      mutations: { ...noMutations(), withdrawCancel: true },
    })
  })
})

function noMutations() {
  return {
    submit: false,
    approve: false,
    requestCorrection: false,
    requestCancel: false,
    agreeCancel: false,
    declineCancel: false,
    withdrawCancel: false,
  }
}

function snapshot(overrides: Partial<ArenaRoundResultSnapshot> = {}): ArenaRoundResultSnapshot {
  return {
    arenaEventId: 'arena-1',
    roundId: 'round-1',
    matchId: 'match-1',
    activityType: 'basketball',
    phase: 'active',
    reviewEpoch: 1,
    matchStatus: 'in_progress',
    roundStatus: 'in_progress',
    draftReadiness: { draftCount: 4, requiredCount: 4, complete: true },
    actorDraft: actorDraft(),
    currentResult: null,
    cancellation: { status: 'none', cancelRequestId: null, requester: null },
    actor: actor(),
    outcome: null,
    ...overrides,
  }
}

function actor(capabilities: Partial<ArenaRoundResultSnapshot['actor']['capabilities']> = {}) {
  return {
    role: 'captain' as const,
    side: 0 as const,
    capabilities: {
      canSubmit: false,
      canApprove: false,
      canRequestCorrection: false,
      canRequestCancel: false,
      canAgreeCancel: false,
      canDeclineCancel: false,
      canWithdrawCancel: false,
      canEditActorDraft: true,
      ...capabilities,
    },
  }
}

function submitted({
  approvedCount = 0,
  actorApproved = false,
  side0Score = 11,
  side1Score = 8,
  stats = [actorStat()],
}: {
  approvedCount?: 0 | 1 | 2
  actorApproved?: boolean
  side0Score?: number
  side1Score?: number
  stats?: ArenaRoundResultSnapshot['currentResult'] extends infer T
    ? T extends { kind: 'submitted'; stats: infer S } ? S : never
    : never
} = {}) {
  const side0 = approvedCount >= 1
  const side1 = approvedCount === 2
  return {
    kind: 'submitted' as const,
    resultVersion: 2,
    statsVersion: 3,
    payloadHash: HASH,
    submitterRole: 'captain' as const,
    side0Score,
    side1Score,
    note: null,
    submittedAt: '2026-08-17T10:00:00.000Z',
    stats,
    approvals: {
      side0,
      side1,
      approvedCount,
      requiredCount: 2 as const,
      actorApproved,
    },
  }
}

function actorStat(overrides: Record<string, unknown> = {}) {
  return {
    side: 0 as const,
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
    note: 'my saved note',
    updatedAt: '2026-08-17T10:00:00.000Z',
    draftRevision: 1,
    ...overrides,
  }
}
