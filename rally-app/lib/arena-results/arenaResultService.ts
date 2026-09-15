import {
  approveArenaResult,
  fetchArenaResultSnapshot,
  mutualCancelArenaResult,
  requestArenaResultCorrection,
  submitArenaResult,
} from './arenaResultRepository'
import type {
  ApproveArenaResultInput,
  ArenaActorDraft,
  ArenaResultActionOutput,
  ArenaResultStat,
  ArenaRoundResultSnapshot,
  MutualCancelArenaResultInput,
  RequestArenaResultCorrectionInput,
  SubmitArenaResultInput,
} from '@/types/arenaResult'

const PAYLOAD_HASH = /^[0-9a-f]{64}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type UnknownRecord = Record<string, unknown>

export class ArenaResultInvalidSnapshotError extends Error {
  readonly code = 'arena_result_invalid_snapshot'

  constructor() {
    super('Arena result snapshot is invalid')
    this.name = 'ArenaResultInvalidSnapshotError'
  }
}

export async function getArenaResultSnapshot(matchId: string): Promise<ArenaRoundResultSnapshot> {
  return parseArenaResultSnapshot(await fetchArenaResultSnapshot(matchId))
}

export const arenaResultService = {
  submit(input: SubmitArenaResultInput): Promise<ArenaResultActionOutput> {
    return submitArenaResult(input)
  },
  approve(input: ApproveArenaResultInput): Promise<ArenaResultActionOutput> {
    return approveArenaResult(input)
  },
  requestCorrection(input: RequestArenaResultCorrectionInput): Promise<ArenaResultActionOutput> {
    return requestArenaResultCorrection(input)
  },
  mutualCancel(input: MutualCancelArenaResultInput): Promise<ArenaResultActionOutput> {
    return mutualCancelArenaResult(input)
  },
}

function parseArenaResultSnapshot(value: unknown): ArenaRoundResultSnapshot {
  const snapshot = record(value, [
    'arenaEventId', 'roundId', 'matchId', 'activityType', 'matchStatus', 'roundStatus',
    'phase', 'reviewEpoch', 'draftReadiness', 'actorDraft', 'currentResult', 'cancellation', 'actor', 'outcome',
  ])
  const phase = enumeration(snapshot.phase, [
    'awaiting_start', 'active', 'awaiting_review', 'awaiting_resubmission',
    'cancel_pending', 'held', 'settled', 'cancelled', 'closed_before_start',
  ] as const)
  const matchStatus = enumeration(snapshot.matchStatus, [
    'pending', 'in_progress', 'disputed', 'settled', 'cancelled',
  ] as const)
  const roundStatus = enumeration(snapshot.roundStatus, [
    'stake_acceptance', 'in_progress', 'result_pending', 'disputed', 'settled', 'cancelled',
  ] as const)
  const draftReadiness = parseDraftReadiness(snapshot.draftReadiness)
  const actorDraft = parseActorDraft(snapshot.actorDraft)
  const currentResult = parseCurrentResult(snapshot.currentResult)
  const cancellation = parseCancellation(snapshot.cancellation)
  const actor = parseActor(snapshot.actor)
  const outcome = parseOutcome(snapshot.outcome)

  if (actor.role === 'referee' && actorDraft !== null) invalid()
  if (
    draftReadiness.complete !== (
      draftReadiness.requiredCount > 0
      && draftReadiness.draftCount === draftReadiness.requiredCount
    )
  ) invalid()

  validateSnapshotPhase({
    phase,
    matchStatus,
    roundStatus,
    draftReadiness,
    actorDraft,
    currentResult,
    cancellation,
    actor,
    outcome,
  })

  return {
    arenaEventId: text(snapshot.arenaEventId),
    roundId: text(snapshot.roundId),
    matchId: text(snapshot.matchId),
    activityType: literal(snapshot.activityType, 'basketball'),
    phase,
    reviewEpoch: positiveInteger(snapshot.reviewEpoch),
    matchStatus,
    roundStatus,
    draftReadiness,
    actorDraft,
    currentResult,
    cancellation,
    actor,
    outcome,
  } as ArenaRoundResultSnapshot
}

function parseDraftReadiness(value: unknown) {
  const readiness = record(value, ['draftCount', 'requiredCount', 'complete'])
  return {
    draftCount: nonNegativeInteger(readiness.draftCount),
    requiredCount: nonNegativeInteger(readiness.requiredCount),
    complete: boolean(readiness.complete),
  }
}

function validateSnapshotPhase(input: {
  phase: ArenaRoundResultSnapshot['phase']
  matchStatus: ArenaRoundResultSnapshot['matchStatus']
  roundStatus: ArenaRoundResultSnapshot['roundStatus']
  draftReadiness: ArenaRoundResultSnapshot['draftReadiness']
  actorDraft: ArenaRoundResultSnapshot['actorDraft']
  currentResult: ArenaRoundResultSnapshot['currentResult']
  cancellation: ArenaRoundResultSnapshot['cancellation']
  actor: ArenaRoundResultSnapshot['actor']
  outcome: ArenaRoundResultSnapshot['outcome']
}) {
  const { phase, matchStatus, roundStatus, draftReadiness, actorDraft, currentResult, cancellation, actor, outcome } = input
  const caps = actor.capabilities
  const allDisabled = !hasEnabledCapability(caps)
  const hasAwaitingResubmission = currentResult?.kind === 'awaiting_resubmission'

  // Snapshot roles are a strict projection of the immutable Round roster:
  // only an assigned referee has no team side; every player/captain has one.
  if (
    (actor.role === 'referee' && actor.side !== null)
    || (actor.role !== 'referee' && actor.side === null)
  ) invalid()

  if (phase === 'awaiting_start' || phase === 'closed_before_start') {
    const expectedStart = phase === 'awaiting_start'
      ? matchStatus === 'pending' && roundStatus === 'stake_acceptance'
      : matchStatus === 'cancelled' && roundStatus === 'cancelled'
    if (
      !expectedStart
      || draftReadiness.draftCount !== 0
      || draftReadiness.requiredCount !== 0
      || draftReadiness.complete
      || actorDraft !== null
      || currentResult !== null
      || cancellation.status !== 'none'
      || outcome !== null
      || !allDisabled
    ) invalid()
    return
  }

  if (phase === 'active') {
    if (
      matchStatus !== 'in_progress'
      || roundStatus !== 'in_progress'
      || currentResult !== null
      || cancellation.status !== 'none'
      || outcome !== null
      || caps.canApprove
      || caps.canRequestCorrection
      || caps.canRequestCancel
      || caps.canAgreeCancel
      || caps.canDeclineCancel
      || caps.canWithdrawCancel
    ) invalid()
    if (caps.canSubmit && actor.role !== 'captain' && actor.role !== 'referee') invalid()
    ensureDraftEditActor(actor, actorDraft)
    return
  }

  if (phase === 'awaiting_review') {
    if (
      matchStatus !== 'in_progress'
      || roundStatus !== 'result_pending'
      || currentResult?.kind !== 'submitted'
      || cancellation.status !== 'none'
      || outcome !== null
      || caps.canSubmit
      || caps.canAgreeCancel
      || caps.canDeclineCancel
      || caps.canWithdrawCancel
    ) invalid()
    if (
      (caps.canApprove || caps.canRequestCorrection || caps.canRequestCancel)
      && actor.role !== 'captain'
    ) invalid()
    if (caps.canApprove && currentResult.approvals.actorApproved) invalid()
    ensureDraftEditActor(actor, actorDraft)
    return
  }

  if (phase === 'awaiting_resubmission') {
    if (
      matchStatus !== 'in_progress'
      || roundStatus !== 'disputed'
      || !hasAwaitingResubmission
      || cancellation.status !== 'none'
      || outcome !== null
      || caps.canApprove
      || caps.canRequestCorrection
      || caps.canAgreeCancel
      || caps.canDeclineCancel
      || caps.canWithdrawCancel
    ) invalid()
    if (caps.canSubmit && actor.role !== 'captain' && actor.role !== 'referee') invalid()
    if (caps.canRequestCancel && actor.role !== 'captain') invalid()
    ensureDraftEditActor(actor, actorDraft)
    return
  }

  if (phase === 'cancel_pending') {
    const isReview = roundStatus === 'result_pending' && currentResult?.kind === 'submitted'
    const isResubmission = roundStatus === 'disputed' && hasAwaitingResubmission
    const normalActionsEnabled = caps.canSubmit
      || caps.canApprove
      || caps.canRequestCorrection
      || caps.canRequestCancel
      || caps.canEditActorDraft
    const cancellationCapabilities = actor.role === 'captain' && actor.side !== null
      ? cancellation.requester === 'self'
        ? caps.canWithdrawCancel && !caps.canAgreeCancel && !caps.canDeclineCancel
        : caps.canAgreeCancel && caps.canDeclineCancel && !caps.canWithdrawCancel
      : cancellation.requester === 'other'
        && !caps.canAgreeCancel
        && !caps.canDeclineCancel
        && !caps.canWithdrawCancel
    if (
      matchStatus !== 'in_progress'
      || cancellation.status !== 'pending'
      || outcome !== null
      || (!isReview && !isResubmission)
      || normalActionsEnabled
      || !cancellationCapabilities
    ) invalid()
    return
  }

  if (phase === 'held') {
    if (
      (matchStatus !== 'disputed' && roundStatus !== 'disputed')
      || hasAwaitingResubmission
      || cancellation.status !== 'none'
      || outcome !== null
      || !allDisabled
    ) invalid()
    return
  }

  if (phase === 'settled' || phase === 'cancelled') {
    const isSettled = phase === 'settled'
    if (
      matchStatus !== (isSettled ? 'settled' : 'cancelled')
      || roundStatus !== (isSettled ? 'settled' : 'cancelled')
      || cancellation.status !== 'none'
      || hasAwaitingResubmission
      || outcome?.status !== phase
      || !allDisabled
    ) invalid()
    return
  }

  invalid()
}

function ensureDraftEditActor(
  actor: ArenaRoundResultSnapshot['actor'],
  actorDraft: ArenaRoundResultSnapshot['actorDraft'],
) {
  if (
    actor.capabilities.canEditActorDraft
    && (actor.role === 'referee' || actor.side === null)
  ) invalid()
  if (actor.role === 'referee' && actorDraft !== null) invalid()
}

function parseCurrentResult(value: unknown): ArenaRoundResultSnapshot['currentResult'] {
  if (value === null) return null
  const candidate = record(value)
  if (candidate.kind === 'submitted') return parseSubmittedResult(candidate)
  if (candidate.kind === 'awaiting_resubmission') return parseAwaitingResubmission(candidate)
  invalid()
}

function parseSubmittedResult(value: UnknownRecord) {
  const result = record(value, [
    'kind', 'resultVersion', 'statsVersion', 'payloadHash', 'submitterRole', 'side0Score', 'side1Score',
    'note', 'submittedAt', 'stats', 'approvals',
  ])
  return {
    kind: literal(result.kind, 'submitted'),
    resultVersion: positiveInteger(result.resultVersion),
    statsVersion: positiveInteger(result.statsVersion),
    payloadHash: hash(result.payloadHash),
    submitterRole: enumeration(result.submitterRole, ['captain', 'referee'] as const),
    side0Score: score(result.side0Score),
    side1Score: score(result.side1Score),
    note: nullableText(result.note),
    submittedAt: text(result.submittedAt),
    stats: array(result.stats).map(parseStat),
    approvals: parseApprovals(result.approvals),
  }
}

function parseAwaitingResubmission(value: UnknownRecord) {
  const result = record(value, [
    'kind', 'reason', 'resultVersion', 'statsVersion', 'payloadHash', 'previousSide0Score',
    'previousSide1Score', 'note', 'requestedByActor',
  ])
  return {
    kind: literal(result.kind, 'awaiting_resubmission'),
    reason: enumeration(result.reason, ['correction_requested', 'stat_edit'] as const),
    resultVersion: positiveInteger(result.resultVersion),
    statsVersion: positiveInteger(result.statsVersion),
    payloadHash: hash(result.payloadHash),
    previousSide0Score: score(result.previousSide0Score),
    previousSide1Score: score(result.previousSide1Score),
    note: nullableText(result.note),
    requestedByActor: boolean(result.requestedByActor),
  }
}

function parseStat(value: unknown): ArenaResultStat {
  const stat = record(value, [
    'side', 'isActor', 'displayName', 'handle', 'avatarUrl', 'points', 'rebounds', 'assists', 'blocks',
    'threePointersMade',
  ])
  return {
    side: enumeration(stat.side, [0, 1] as const),
    isActor: boolean(stat.isActor),
    displayName: nullableText(stat.displayName),
    handle: nullableText(stat.handle),
    avatarUrl: nullableText(stat.avatarUrl),
    points: nonNegativeInteger(stat.points),
    rebounds: nonNegativeInteger(stat.rebounds),
    assists: nonNegativeInteger(stat.assists),
    blocks: nonNegativeInteger(stat.blocks),
    threePointersMade: nonNegativeInteger(stat.threePointersMade),
  }
}

function parseActorDraft(value: unknown): ArenaActorDraft | null {
  if (value === null) return null
  const draft = record(value, [
    'points', 'rebounds', 'assists', 'blocks', 'threePointersMade', 'note', 'updatedAt', 'draftRevision',
  ])
  return {
    points: nonNegativeInteger(draft.points),
    rebounds: nonNegativeInteger(draft.rebounds),
    assists: nonNegativeInteger(draft.assists),
    blocks: nonNegativeInteger(draft.blocks),
    threePointersMade: nonNegativeInteger(draft.threePointersMade),
    note: nullableText(draft.note),
    updatedAt: text(draft.updatedAt),
    draftRevision: positiveInteger(draft.draftRevision),
  }
}

function parseApprovals(value: unknown) {
  const approvals = record(value, ['side0', 'side1', 'approvedCount', 'requiredCount', 'actorApproved'])
  const side0 = boolean(approvals.side0)
  const side1 = boolean(approvals.side1)
  const approvedCount = enumeration(approvals.approvedCount, [0, 1, 2] as const)
  if (approvedCount !== Number(side0) + Number(side1) || approvals.requiredCount !== 2) invalid()
  return {
    side0,
    side1,
    approvedCount,
    requiredCount: 2 as const,
    actorApproved: boolean(approvals.actorApproved),
  }
}

function parseCancellation(value: unknown) {
  const cancellation = record(value, ['status', 'cancelRequestId', 'requester'])
  if (cancellation.status === 'none') {
    if (cancellation.cancelRequestId !== null || cancellation.requester !== null) invalid()
    return { status: 'none' as const, cancelRequestId: null, requester: null }
  }
  if (cancellation.status === 'pending') {
    return {
      status: 'pending' as const,
      cancelRequestId: uuid(cancellation.cancelRequestId),
      requester: enumeration(cancellation.requester, ['self', 'other'] as const),
    }
  }
  invalid()
}

function parseActor(value: unknown) {
  const actor = record(value, ['role', 'side', 'capabilities'])
  const capabilities = record(actor.capabilities, [
    'canSubmit', 'canApprove', 'canRequestCorrection', 'canRequestCancel', 'canAgreeCancel',
    'canDeclineCancel', 'canWithdrawCancel', 'canEditActorDraft',
  ])
  return {
    role: enumeration(actor.role, ['captain', 'player', 'referee'] as const),
    side: actor.side === null ? null : enumeration(actor.side, [0, 1] as const),
    capabilities: {
      canSubmit: boolean(capabilities.canSubmit),
      canApprove: boolean(capabilities.canApprove),
      canRequestCorrection: boolean(capabilities.canRequestCorrection),
      canRequestCancel: boolean(capabilities.canRequestCancel),
      canAgreeCancel: boolean(capabilities.canAgreeCancel),
      canDeclineCancel: boolean(capabilities.canDeclineCancel),
      canWithdrawCancel: boolean(capabilities.canWithdrawCancel),
      canEditActorDraft: boolean(capabilities.canEditActorDraft),
    },
  }
}

function hasEnabledCapability(capabilities: ArenaRoundResultSnapshot['actor']['capabilities']): boolean {
  return Object.values(capabilities).some(Boolean)
}

function parseOutcome(value: unknown): ArenaRoundResultSnapshot['outcome'] {
  if (value === null) return null
  const outcome = record(value)
  if (outcome.status === 'settled') {
    const settled = record(outcome, ['status', 'winnerSide', 'actorOutcome', 'rotation'])
    const rotation = record(settled.rotation, [
      'championStreak', 'winnerRetired', 'loserQueuePosition', 'loserRetired', 'appliedAt',
    ])
    return {
      status: 'settled',
      winnerSide: enumeration(settled.winnerSide, [0, 1] as const),
      actorOutcome: nullableEnumeration(settled.actorOutcome, ['win', 'loss'] as const),
      rotation: {
        championStreak: nonNegativeInteger(rotation.championStreak),
        winnerRetired: boolean(rotation.winnerRetired),
        loserQueuePosition: nullableNonNegativeInteger(rotation.loserQueuePosition),
        loserRetired: boolean(rotation.loserRetired),
        appliedAt: text(rotation.appliedAt),
      },
    }
  }
  if (outcome.status === 'cancelled') {
    const cancelled = record(outcome, ['status', 'winnerSide', 'actorOutcome', 'rotation'])
    const rotation = record(cancelled.rotation, [
      'actorQueuePosition', 'otherTeamRequeued', 'appliedAt',
    ])
    if (cancelled.winnerSide !== null) invalid()
    return {
      status: 'cancelled',
      winnerSide: null,
      actorOutcome: nullableLiteral(cancelled.actorOutcome, 'cancelled'),
      rotation: {
        actorQueuePosition: nullableNonNegativeInteger(rotation.actorQueuePosition),
        otherTeamRequeued: boolean(rotation.otherTeamRequeued),
        appliedAt: text(rotation.appliedAt),
      },
    }
  }
  invalid()
}

function record(value: unknown, keys?: string[]): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid()
  const output = value as UnknownRecord
  if (keys && (Object.keys(output).length !== keys.length || keys.some((key) => !(key in output)))) invalid()
  return output
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) invalid()
  return value
}

function text(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) invalid()
  return value
}

function nullableText(value: unknown): string | null {
  return value === null ? null : text(value)
}

function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') invalid()
  return value
}

function positiveInteger(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 2_147_483_647) invalid()
  return value as number
}

function nonNegativeInteger(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 2_147_483_647) invalid()
  return value as number
}

function nullableNonNegativeInteger(value: unknown): number | null {
  return value === null ? null : nonNegativeInteger(value)
}

function score(value: unknown): number {
  const output = nonNegativeInteger(value)
  if (output > 10_000) invalid()
  return output
}

function hash(value: unknown): string {
  const output = text(value)
  if (!PAYLOAD_HASH.test(output)) invalid()
  return output
}

function uuid(value: unknown): string {
  const output = text(value)
  if (!UUID.test(output)) invalid()
  return output
}

function literal<T extends string>(value: unknown, expected: T): T {
  if (value !== expected) invalid()
  return expected
}

function nullableLiteral<T extends string>(value: unknown, expected: T): T | null {
  return value === null ? null : literal(value, expected)
}

function enumeration<T extends string | number>(value: unknown, allowed: readonly T[]): T {
  if (!allowed.includes(value as T)) invalid()
  return value as T
}

function nullableEnumeration<T extends string | number>(value: unknown, allowed: readonly T[]): T | null {
  return value === null ? null : enumeration(value, allowed)
}

function invalid(): never {
  throw new ArenaResultInvalidSnapshotError()
}
