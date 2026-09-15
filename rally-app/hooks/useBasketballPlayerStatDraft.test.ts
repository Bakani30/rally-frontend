import { describe, expect, it } from 'vitest'

import type { ArenaRoundResultSnapshot } from '@/types/arenaResult'
import {
  arenaStatDraftCasFromSnapshot,
  ArenaStatDraftSnapshotRequiredError,
} from '@/lib/match/arenaStatDraftCas'

describe('Arena stat draft transport tokens', () => {
  it('derives review epoch and actor-draft revision from the exact cached Arena snapshot', () => {
    expect(arenaStatDraftCasFromSnapshot(snapshot(), 'match-1')).toEqual({
      expectedReviewEpoch: 4,
      expectedDraftRevision: 7,
    })
  })

  it('uses null revision for an Arena actor without a draft and never borrows another match token', () => {
    expect(arenaStatDraftCasFromSnapshot({ ...snapshot(), actorDraft: null }, 'match-1')).toEqual({
      expectedReviewEpoch: 4,
      expectedDraftRevision: null,
    })
    expect(arenaStatDraftCasFromSnapshot(snapshot(), 'other-match')).toBeUndefined()
    expect(new ArenaStatDraftSnapshotRequiredError()).toMatchObject({
      code: 'arena_result_review_epoch_required',
    })
  })
})

function snapshot(): ArenaRoundResultSnapshot {
  return {
    arenaEventId: 'arena-1',
    roundId: 'round-1',
    matchId: 'match-1',
    activityType: 'basketball',
    phase: 'active',
    reviewEpoch: 4,
    matchStatus: 'in_progress',
    roundStatus: 'in_progress',
    draftReadiness: { draftCount: 1, requiredCount: 2, complete: false },
    actorDraft: {
      points: 7,
      rebounds: 2,
      assists: 1,
      blocks: 0,
      threePointersMade: 1,
      note: null,
      updatedAt: '2026-08-22T00:00:00.000Z',
      draftRevision: 7,
    },
    currentResult: null,
    cancellation: { status: 'none', cancelRequestId: null, requester: null },
    actor: {
      role: 'player',
      side: 0,
      capabilities: {
        canSubmit: false,
        canApprove: false,
        canRequestCorrection: false,
        canRequestCancel: false,
        canAgreeCancel: false,
        canDeclineCancel: false,
        canWithdrawCancel: false,
        canEditActorDraft: true,
      },
    },
    outcome: null,
  }
}
