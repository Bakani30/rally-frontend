import type { ArenaResultPresentationKind } from '@/lib/arena-results/arenaResultPresentation'
import type { ArenaResultCapabilities, ArenaResultStat, ArenaRoundResultSnapshot } from '@/types/arenaResult'

import type { ArenaMatchCancelableState, ArenaMatchLifecycleState, ArenaMatchPreviewCaptain, ArenaMatchPreviewSide, ArenaMatchPreviewState } from './arenaMatchLifecyclePreview'

export type ArenaMatchScore = { sideA: number; sideB: number }
export type ArenaMatchLifecycleFixture = { state: ArenaMatchLifecycleState; presentationKind: ArenaResultPresentationKind; score: ArenaMatchScore; teamSizePerSide: number; snapshot: ArenaRoundResultSnapshot }

const BASE_TIME = '2026-08-13T08:00:00.000Z'
const RESULT_HASH_V2 = 'a'.repeat(64)
const RESULT_HASH_V3 = 'b'.repeat(64)
const CANCEL_REQUEST_ID = '00000000-0000-4000-8000-000000000001'

export function buildArenaMatchLifecycleFixture(
  preview: ArenaMatchPreviewState,
  matchId: string,
): ArenaMatchLifecycleFixture {
  return { state: preview.state, presentationKind: presentationKindFor(preview.state), score: preview.score, teamSizePerSide: 3, snapshot: buildSnapshot(preview, matchId) }
}

function buildSnapshot(
  preview: ArenaMatchPreviewState,
  matchId: string,
): ArenaRoundResultSnapshot {
  const side = captainSide(preview.captain)
  const source = cancellationSource(preview)
  const terminal = terminalOutcome(preview, side)
  const phase = phaseFor(preview.state)
  const currentResult = currentResultFor(preview, side, source)

  return {
    arenaEventId: `preview-arena-${matchId}`,
    roundId: `preview-round-${matchId}`,
    matchId,
    activityType: 'basketball',
    phase,
    reviewEpoch: preview.reviewEpoch,
    matchStatus: matchStatusFor(preview.state),
    roundStatus: roundStatusFor(preview.state, source),
    draftReadiness: { draftCount: 6, requiredCount: 6, complete: true },
    actorDraft: actorDraftFor(side),
    currentResult,
    cancellation: cancellationFor(preview.state, side),
    actor: { role: 'captain', side, capabilities: capabilitiesFor(preview.state, side, source) },
    outcome: terminal,
  }
}

function phaseFor(state: ArenaMatchLifecycleState): ArenaRoundResultSnapshot['phase'] {
  if (state === 'ready_to_submit') return 'active'
  if (state === 'held') return 'held'
  if (state === 'cancelled_refunded') return 'cancelled'
  if (state.startsWith('settled_')) return 'settled'
  if (state.startsWith('cancel_requested_')) return 'cancel_pending'
  if (isCorrection(state)) return 'awaiting_resubmission'
  return 'awaiting_review'
}

function matchStatusFor(state: ArenaMatchLifecycleState): ArenaRoundResultSnapshot['matchStatus'] {
  if (state === 'held') return 'disputed'
  if (state === 'cancelled_refunded') return 'cancelled'
  if (state.startsWith('settled_')) return 'settled'
  return 'in_progress'
}

function roundStatusFor(
  state: ArenaMatchLifecycleState,
  source: ArenaMatchCancelableState | null,
): ArenaRoundResultSnapshot['roundStatus'] {
  if (state === 'held') return 'disputed'
  if (state === 'cancelled_refunded') return 'cancelled'
  if (state.startsWith('settled_')) return 'settled'
  if (isCorrection(state) || (source && isCorrection(source))) return 'disputed'
  if (state === 'ready_to_submit') return 'in_progress'
  return 'result_pending'
}

function currentResultFor(
  preview: ArenaMatchPreviewState,
  side: ArenaMatchPreviewSide,
  source: ArenaMatchCancelableState | null,
): ArenaRoundResultSnapshot['currentResult'] {
  if (preview.state === 'ready_to_submit' || preview.state === 'held' || preview.state === 'cancelled_refunded') return null
  if (preview.state.startsWith('settled_')) return submittedResult(preview.score, side, resultVersion(preview.state), 2, null)
  const factState = source ?? preview.state
  if (isCorrection(factState)) return awaitingResubmission(preview.score, side, factState)
  return submittedResult(
    preview.score,
    side,
    resultVersion(factState),
    approvalCount(factState),
    approvalSide(factState),
  )
}

function submittedResult(
  score: ArenaMatchScore,
  actorSide: ArenaMatchPreviewSide,
  version: 2 | 3,
  approvedCount: 0 | 1 | 2,
  approvedSide: ArenaMatchPreviewSide | null,
): Extract<NonNullable<ArenaRoundResultSnapshot['currentResult']>, { kind: 'submitted' }> {
  const side0Approved = approvedCount === 2 || approvedSide === 0
  const side1Approved = approvedCount === 2 || approvedSide === 1
  return {
    kind: 'submitted',
    resultVersion: version,
    statsVersion: version,
    payloadHash: version === 2 ? RESULT_HASH_V2 : RESULT_HASH_V3,
    submitterRole: 'captain',
    side0Score: score.sideA,
    side1Score: score.sideB,
    note: null,
    submittedAt: BASE_TIME,
    stats: buildStats(actorSide),
    approvals: {
      side0: side0Approved,
      side1: side1Approved,
      approvedCount,
      requiredCount: 2,
      actorApproved: actorSide === 0 ? side0Approved : side1Approved,
    },
  }
}

function awaitingResubmission(
  score: ArenaMatchScore,
  side: ArenaMatchPreviewSide,
  state: ArenaMatchLifecycleState,
): Extract<NonNullable<ArenaRoundResultSnapshot['currentResult']>, { kind: 'awaiting_resubmission' }> {
  return {
    kind: 'awaiting_resubmission',
    reason: 'correction_requested',
    resultVersion: 2,
    statsVersion: 3,
    payloadHash: RESULT_HASH_V2,
    previousSide0Score: score.sideA,
    previousSide1Score: score.sideB,
    note: null,
    requestedByActor: correctionRequesterSide(state) === side,
  }
}

function capabilitiesFor(
  state: ArenaMatchLifecycleState,
  side: ArenaMatchPreviewSide,
  source: ArenaMatchCancelableState | null,
): ArenaResultCapabilities {
  const disabled = noCapabilities()
  if (state === 'ready_to_submit') return {
    ...disabled,
    canSubmit: true,
    canEditActorDraft: true,
  }
  if (state === 'held' || state === 'cancelled_refunded' || state.startsWith('settled_')) return disabled
  if (state.startsWith('cancel_requested_')) {
    return cancellationRequesterSide(state) === side
      ? { ...disabled, canWithdrawCancel: true }
      : { ...disabled, canAgreeCancel: true, canDeclineCancel: true }
  }
  if (isCorrection(state)) {
    return { ...disabled, canSubmit: true, canRequestCancel: true, canEditActorDraft: true }
  }
  const factState = source ?? state
  const approvedSide = approvalSide(factState)
  return {
    ...disabled,
    canApprove: approvedSide !== side,
    canRequestCorrection: resultVersion(factState) === 2,
    canRequestCancel: true,
    canEditActorDraft: true,
  }
}

function cancellationFor(
  state: ArenaMatchLifecycleState,
  side: ArenaMatchPreviewSide,
): ArenaRoundResultSnapshot['cancellation'] {
  if (!state.startsWith('cancel_requested_')) return { status: 'none', cancelRequestId: null, requester: null }
  return {
    status: 'pending',
    cancelRequestId: CANCEL_REQUEST_ID,
    requester: cancellationRequesterSide(state) === side ? 'self' : 'other',
  }
}

function terminalOutcome(
  preview: ArenaMatchPreviewState,
  side: ArenaMatchPreviewSide,
): ArenaRoundResultSnapshot['outcome'] {
  if (preview.state === 'cancelled_refunded') {
    return {
      status: 'cancelled',
      winnerSide: null,
      actorOutcome: 'cancelled',
      rotation: {
        actorQueuePosition: side === 0 ? 1 : 2,
        otherTeamRequeued: true,
        appliedAt: BASE_TIME,
      },
    }
  }
  if (preview.state.startsWith('settled_')) {
    const winnerSide = winnerSideFor(preview.state)
    return {
      status: 'settled',
      winnerSide,
      actorOutcome: side === winnerSide ? 'win' : 'loss',
      rotation: {
        championStreak: 1,
        winnerRetired: false,
        loserQueuePosition: 2,
        loserRetired: false,
        appliedAt: BASE_TIME,
      },
    }
  }
  return null
}

function actorDraftFor(side: ArenaMatchPreviewSide) {
  const stat = buildStats(side).find((candidate) => candidate.isActor)
  if (!stat) throw new Error('Arena preview actor draft requires a captain stat')
  return {
    points: stat.points,
    rebounds: stat.rebounds,
    assists: stat.assists,
    blocks: stat.blocks,
    threePointersMade: stat.threePointersMade,
    note: 'local Arena preview draft',
    updatedAt: BASE_TIME,
    draftRevision: 1,
  }
}

function buildStats(actorSide: ArenaMatchPreviewSide): ArenaResultStat[] {
  return [
    stat(0, actorSide, 'Captain A', 'captain-a', 8, 2, 1, 0, 1),
    stat(0, actorSide, 'Mina', 'mina', 7, 1, 2, 0, 1),
    stat(0, actorSide, 'Ton', 'ton', 6, 3, 1, 1, 0),
    stat(1, actorSide, 'Captain B', 'captain-b', 7, 2, 2, 0, 1),
    stat(1, actorSide, 'Ploy', 'ploy', 6, 1, 1, 0, 0),
    stat(1, actorSide, 'Korn', 'korn', 4, 2, 0, 1, 0),
  ]
}

function stat(
  side: ArenaMatchPreviewSide,
  actorSide: ArenaMatchPreviewSide,
  displayName: string,
  handle: string,
  points: number,
  rebounds: number,
  assists: number,
  blocks: number,
  threePointersMade: number,
): ArenaResultStat {
  return { side, isActor: side === actorSide && displayName.startsWith('Captain'), displayName, handle, avatarUrl: null, points, rebounds, assists, blocks, threePointersMade }
}

function presentationKindFor(state: ArenaMatchLifecycleState): ArenaResultPresentationKind {
  if (state === 'ready_to_submit') return 'ready_to_submit'
  if (isCorrection(state)) return 'awaiting_resubmission'
  if (state === 'held') return 'held'
  if (state === 'cancelled_refunded') return 'cancelled'
  if (state.startsWith('settled_')) return 'settled'
  return 'awaiting_approvals'
}

function noCapabilities(): ArenaResultCapabilities {
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

function captainSide(captain: ArenaMatchPreviewCaptain): ArenaMatchPreviewSide {
  return captain === 'a' ? 0 : 1
}

function isCorrection(state: ArenaMatchLifecycleState): boolean {
  return state.startsWith('correction_requested_')
}

function cancellationSource(preview: ArenaMatchPreviewState): ArenaMatchCancelableState | null {
  if (!preview.state.startsWith('cancel_requested_')) return null
  if (!preview.cancelledFrom) throw new Error('Cancellation preview requires cancelledFrom')
  return preview.cancelledFrom
}

function resultVersion(state: ArenaMatchLifecycleState): 2 | 3 {
  return state.includes('_v3_') ? 3 : 2
}

function approvalCount(state: ArenaMatchLifecycleState): 0 | 1 | 2 {
  if (state.endsWith('zero_approvals')) return 0
  if (state.endsWith('side0_approved') || state.endsWith('side1_approved')) return 1
  return 2
}

function approvalSide(state: ArenaMatchLifecycleState): ArenaMatchPreviewSide | null {
  if (state.endsWith('side0_approved')) return 0
  if (state.endsWith('side1_approved')) return 1
  return null
}

function correctionRequesterSide(state: ArenaMatchLifecycleState): ArenaMatchPreviewSide {
  return state.endsWith('side0') ? 0 : 1
}

function cancellationRequesterSide(state: ArenaMatchLifecycleState): ArenaMatchPreviewSide {
  return state.endsWith('side0') ? 0 : 1
}

function winnerSideFor(state: ArenaMatchLifecycleState): ArenaMatchPreviewSide {
  return state.includes('_side0_') ? 0 : 1
}
