import { buildArenaMatchLifecycleFixture, type ArenaMatchLifecycleFixture, type ArenaMatchScore } from './arenaMatchLifecycleFixtures'

export const ARENA_MATCH_LIFECYCLE_STATES = ['ready_to_submit', 'submitted_v2_zero_approvals', 'submitted_v2_side0_approved', 'submitted_v2_side1_approved', 'correction_requested_by_side0', 'correction_requested_by_side1', 'resubmitted_v3_zero_approvals', 'resubmitted_v3_side0_approved', 'resubmitted_v3_side1_approved', 'cancel_requested_by_side0', 'cancel_requested_by_side1', 'held', 'settled_v2_side0_winner', 'settled_v2_side1_winner', 'settled_v3_side0_winner', 'settled_v3_side1_winner', 'cancelled_refunded'] as const

export const ARENA_MATCH_CANCELABLE_STATES = ['submitted_v2_zero_approvals', 'submitted_v2_side0_approved', 'submitted_v2_side1_approved', 'correction_requested_by_side0', 'correction_requested_by_side1', 'resubmitted_v3_zero_approvals', 'resubmitted_v3_side0_approved', 'resubmitted_v3_side1_approved'] as const

export type ArenaMatchLifecycleState = (typeof ARENA_MATCH_LIFECYCLE_STATES)[number]
export type ArenaMatchCancelableState = (typeof ARENA_MATCH_CANCELABLE_STATES)[number]
export type ArenaMatchPreviewCaptain = 'a' | 'b'
export type ArenaMatchPreviewSide = 0 | 1
export type ArenaMatchPreviewAction = 'submit_result' | 'approve_result' | 'request_correction' | 'request_cancel' | 'agree_cancel' | 'decline_cancel' | 'withdraw_cancel'

export type ArenaMatchPreviewState = {
  state: ArenaMatchLifecycleState
  captain: ArenaMatchPreviewCaptain
  score: ArenaMatchScore
  reviewEpoch: number
  cancelledFrom?: ArenaMatchCancelableState
  actionLog: string[]
}

export type ArenaMatchPreviewRoute =
  | { kind: 'preview'; matchId: string; preview: ArenaMatchPreviewState }
  | { kind: 'read_only'; reason: 'missing' | 'invalid' | 'duplicate' | 'missing_cancelled_from' }

type RouteParams = { state?: unknown; matchId?: unknown; captain?: unknown; side0Score?: unknown; side1Score?: unknown; reviewEpoch?: unknown; cancelledFrom?: unknown }

const STATE_COPY: Record<ArenaMatchLifecycleState, { label: string; detail: string }> = {
  ready_to_submit: { label: 'READY TO SUBMIT', detail: 'สถิติครบแล้ว กัปตันส่งผลได้' },
  submitted_v2_zero_approvals: { label: 'RESULT V2 · 0/2', detail: 'ส่งผลเวอร์ชัน 2 แล้ว รอการยืนยัน' },
  submitted_v2_side0_approved: { label: 'RESULT V2 · SIDE 0 APPROVED', detail: 'ฝั่ง 0 ยืนยันแล้ว รอฝั่ง 1' },
  submitted_v2_side1_approved: { label: 'RESULT V2 · SIDE 1 APPROVED', detail: 'ฝั่ง 1 ยืนยันแล้ว รอฝั่ง 0' },
  correction_requested_by_side0: { label: 'CORRECTION · SIDE 0', detail: 'ฝั่ง 0 ขอแก้ผลแล้ว' },
  correction_requested_by_side1: { label: 'CORRECTION · SIDE 1', detail: 'ฝั่ง 1 ขอแก้ผลแล้ว' },
  resubmitted_v3_zero_approvals: { label: 'RESULT V3 · 0/2', detail: 'ส่งผลเวอร์ชัน 3 แล้ว รอการยืนยันใหม่' },
  resubmitted_v3_side0_approved: { label: 'RESULT V3 · SIDE 0 APPROVED', detail: 'ฝั่ง 0 ยืนยันผลเวอร์ชัน 3 แล้ว' },
  resubmitted_v3_side1_approved: { label: 'RESULT V3 · SIDE 1 APPROVED', detail: 'ฝั่ง 1 ยืนยันผลเวอร์ชัน 3 แล้ว' },
  cancel_requested_by_side0: { label: 'CANCEL · SIDE 0 REQUESTED', detail: 'ฝั่ง 0 ขอยกเลิกรอบ' },
  cancel_requested_by_side1: { label: 'CANCEL · SIDE 1 REQUESTED', detail: 'ฝั่ง 1 ขอยกเลิกรอบ' },
  held: { label: 'HELD', detail: 'ผลอยู่ระหว่างตรวจสอบ' },
  settled_v2_side0_winner: { label: 'SETTLED V2 · SIDE 0 WON', detail: 'ระบบยืนยันผลเวอร์ชัน 2 แล้ว' },
  settled_v2_side1_winner: { label: 'SETTLED V2 · SIDE 1 WON', detail: 'ระบบยืนยันผลเวอร์ชัน 2 แล้ว' },
  settled_v3_side0_winner: { label: 'SETTLED V3 · SIDE 0 WON', detail: 'ระบบยืนยันผลเวอร์ชัน 3 แล้ว' },
  settled_v3_side1_winner: { label: 'SETTLED V3 · SIDE 1 WON', detail: 'ระบบยืนยันผลเวอร์ชัน 3 แล้ว' },
  cancelled_refunded: { label: 'CANCELLED · REFUNDED', detail: 'ระบบยืนยันการยกเลิกและคืนสิทธิ์แล้ว' },
}

export function canUseArenaMatchLifecyclePreview(isDev: boolean | undefined): boolean { return isDev === true }
export function getArenaSessionSettlementPreviewRoute(): string { return '/dev/arena-session-preview?state=settled_winner' }
export function getArenaSessionCancelledPreviewRoute(): string { return '/dev/arena-session-preview?state=cancelled_decision_required' }
export function getArenaMatchLifecycleCopy(state: ArenaMatchLifecycleState) { return STATE_COPY[state] }

export function createArenaMatchPreviewState(state: ArenaMatchLifecycleState, captain: ArenaMatchPreviewCaptain, score: ArenaMatchScore, cancelledFrom?: ArenaMatchCancelableState, reviewEpoch = baselineReviewEpoch(state, cancelledFrom)): ArenaMatchPreviewState {
  return { state, captain, score, reviewEpoch, ...(cancelledFrom ? { cancelledFrom } : {}), actionLog: [] }
}

export function serializeArenaMatchPreviewRoute(input: { matchId: string; preview: ArenaMatchPreviewState; captain: ArenaMatchPreviewCaptain }): string | null {
  const { matchId, preview, captain } = input
  if (!isMatchId(matchId) || !isCaptain(captain) || !isScoreNumber(preview.score.sideA) || !isScoreNumber(preview.score.sideB) || !isPositiveInteger(preview.reviewEpoch)) return null
  if (isCancellation(preview.state) && !preview.cancelledFrom) return null
  const query = new URLSearchParams({ state: preview.state, matchId, captain, side0Score: String(preview.score.sideA), side1Score: String(preview.score.sideB), reviewEpoch: String(preview.reviewEpoch) })
  if (isCancellation(preview.state)) query.set('cancelledFrom', preview.cancelledFrom!)
  return `/dev/arena-match-preview?${query.toString().replace(/\+/g, '%20')}`
}

export function parseArenaMatchPreviewRoute(params: RouteParams): ArenaMatchPreviewRoute {
  const values = [params.state, params.matchId, params.captain, params.side0Score, params.side1Score, params.reviewEpoch, params.cancelledFrom].map(readParam)
  if (values.some((value) => value === 'duplicate')) return { kind: 'read_only', reason: 'duplicate' }
  const [state, matchId, captain, side0Score, side1Score, reviewEpoch, cancelledFrom] = values as (string | null)[]
  if (!state || !matchId || !captain || !side0Score || !side1Score || !reviewEpoch) return { kind: 'read_only', reason: 'missing' }
  if (!isState(state) || !isMatchId(matchId) || !isCaptain(captain) || !isScore(side0Score) || !isScore(side1Score) || !isPositiveIntegerString(reviewEpoch)) return { kind: 'read_only', reason: 'invalid' }
  if (isCancellation(state)) {
    if (!cancelledFrom) return { kind: 'read_only', reason: 'missing_cancelled_from' }
    if (!isArenaMatchCancelableState(cancelledFrom)) return { kind: 'read_only', reason: 'invalid' }
  } else if (cancelledFrom) return { kind: 'read_only', reason: 'invalid' }
  return { kind: 'preview', matchId, preview: createArenaMatchPreviewState(state, captain, { sideA: Number(side0Score), sideB: Number(side1Score) }, isCancellation(state) ? cancelledFrom as ArenaMatchCancelableState : undefined, Number(reviewEpoch)) }
}

export function getArenaMatchPreviewActions(state: ArenaMatchLifecycleState, captain: ArenaMatchPreviewCaptain): readonly ArenaMatchPreviewAction[] {
  const side = captainSide(captain)
  if (state === 'ready_to_submit') return ['submit_result']
  if (state === 'held' || isTerminal(state)) return []
  if (isCancellation(state)) return cancellationRequesterSide(state) === side ? ['withdraw_cancel'] : ['agree_cancel', 'decline_cancel']
  if (isCorrection(state)) return ['submit_result', 'request_cancel']
  const approved = approvalSide(state)
  const reviewActions: ArenaMatchPreviewAction[] = []
  if (approved !== side) reviewActions.push('approve_result')
  if (resultVersion(state) === 2) reviewActions.push('request_correction')
  reviewActions.push('request_cancel')
  return reviewActions
}

export function transitionArenaMatchPreview(current: ArenaMatchPreviewState, action: ArenaMatchPreviewAction, options: { canSubmit?: boolean } = {}): ArenaMatchPreviewState {
  if (!getArenaMatchPreviewActions(current.state, current.captain).includes(action)) return current
  const side = captainSide(current.captain)
  if (action === 'submit_result' && options.canSubmit !== false) {
    if (current.state === 'ready_to_submit') return next(current, submittedState(2, side), 'Captain submitted Arena result', undefined, true)
    if (isCorrection(current.state)) return next(current, submittedState(3, side), 'Captain resubmitted Arena result', undefined, true)
  }
  if (action === 'approve_result' && isSubmitted(current.state)) {
    if (approvalSide(current.state) === null) return next(current, submittedState(resultVersion(current.state), side), 'Captain approved Arena result')
    const winner = winnerFromScore(current.score)
    return winner === null ? current : next(current, settledState(resultVersion(current.state), winner), 'Captain approved Arena result')
  }
  if (action === 'request_correction' && isSubmitted(current.state) && resultVersion(current.state) === 2) return next(current, correctionState(side), 'Captain requested result correction', undefined, true)
  if (action === 'request_cancel' && isArenaMatchCancelableState(current.state)) return next(current, cancellationState(side), 'Captain requested round cancellation', current.state, true)
  if (action === 'agree_cancel' && isCancellation(current.state)) return next(current, 'cancelled_refunded', 'Captain agreed to cancel and refund', current.cancelledFrom)
  if ((action === 'decline_cancel' || action === 'withdraw_cancel') && isCancellation(current.state) && current.cancelledFrom) return next(current, current.cancelledFrom, action === 'decline_cancel' ? 'Captain declined round cancellation' : 'Captain withdrew round cancellation', undefined, true)
  return current
}

export function getArenaMatchLifecycleFixture(preview: ArenaMatchPreviewState, matchId: string): ArenaMatchLifecycleFixture { return buildArenaMatchLifecycleFixture(preview, matchId) }

function next(current: ArenaMatchPreviewState, state: ArenaMatchLifecycleState, logEntry: string, cancelledFrom?: ArenaMatchCancelableState, incrementReviewEpoch = false): ArenaMatchPreviewState {
  return { state, captain: current.captain, score: current.score, reviewEpoch: current.reviewEpoch + (incrementReviewEpoch ? 1 : 0), ...(isCancellation(state) || state === 'cancelled_refunded' ? { cancelledFrom: cancelledFrom ?? current.cancelledFrom } : {}), actionLog: [...current.actionLog, logEntry] }
}
function readParam(value: unknown): string | null | 'duplicate' { if (Array.isArray(value)) return 'duplicate'; return typeof value === 'string' && value.length > 0 ? value : null }
function isState(value: string): value is ArenaMatchLifecycleState { return (ARENA_MATCH_LIFECYCLE_STATES as readonly string[]).includes(value) }
function isCaptain(value: string): value is ArenaMatchPreviewCaptain { return value === 'a' || value === 'b' }
function isMatchId(value: string): boolean { return value.trim().length > 0 }
function isScore(value: string): boolean { return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) <= 10_000 && String(Number(value)) === value }
function isScoreNumber(value: number): boolean { return Number.isSafeInteger(value) && value >= 0 && value <= 10_000 }
function isPositiveInteger(value: number): boolean { return Number.isSafeInteger(value) && value > 0 }
function isPositiveIntegerString(value: string): boolean { return /^\d+$/.test(value) && isPositiveInteger(Number(value)) && String(Number(value)) === value }
function baselineReviewEpoch(state: ArenaMatchLifecycleState, cancelledFrom?: ArenaMatchCancelableState): number {
  if (isCancellation(state)) return baselineReviewEpoch(cancelledFrom ?? 'ready_to_submit' as ArenaMatchLifecycleState) + 1
  if (state.startsWith('resubmitted_v3_') || state.startsWith('settled_v3_')) return 4
  if (isCorrection(state)) return 3
  if (state.startsWith('submitted_v2_') || state.startsWith('settled_v2_')) return 2
  return 1
}
export function isArenaMatchCancelableState(value: string): value is ArenaMatchCancelableState { return (ARENA_MATCH_CANCELABLE_STATES as readonly string[]).includes(value) }
function isSubmitted(state: ArenaMatchLifecycleState): boolean { return state.startsWith('submitted_') || state.startsWith('resubmitted_') }
function isCorrection(state: ArenaMatchLifecycleState): boolean { return state.startsWith('correction_requested_') }
function isCancellation(state: ArenaMatchLifecycleState): boolean { return state.startsWith('cancel_requested_') }
function isTerminal(state: ArenaMatchLifecycleState): boolean { return state.startsWith('settled_') || state === 'cancelled_refunded' }
function captainSide(captain: ArenaMatchPreviewCaptain): ArenaMatchPreviewSide { return captain === 'a' ? 0 : 1 }
function approvalSide(state: ArenaMatchLifecycleState): ArenaMatchPreviewSide | null { return state.endsWith('side0_approved') ? 0 : state.endsWith('side1_approved') ? 1 : null }
function resultVersion(state: ArenaMatchLifecycleState): 2 | 3 { return state.includes('_v3_') ? 3 : 2 }
function submittedState(version: 2 | 3, side: ArenaMatchPreviewSide): ArenaMatchLifecycleState { return `${version === 2 ? 'submitted_v2' : 'resubmitted_v3'}_side${side}_approved` as ArenaMatchLifecycleState }
function correctionState(side: ArenaMatchPreviewSide): ArenaMatchLifecycleState { return `correction_requested_by_side${side}` as ArenaMatchLifecycleState }
function cancellationState(side: ArenaMatchPreviewSide): ArenaMatchLifecycleState { return `cancel_requested_by_side${side}` as ArenaMatchLifecycleState }
function cancellationRequesterSide(state: ArenaMatchLifecycleState): ArenaMatchPreviewSide { return state.endsWith('side0') ? 0 : 1 }
function settledState(version: 2 | 3, side: ArenaMatchPreviewSide): ArenaMatchLifecycleState { return `settled_v${version}_side${side}_winner` as ArenaMatchLifecycleState }
function winnerFromScore(score: ArenaMatchScore): ArenaMatchPreviewSide | null { return score.sideA === score.sideB ? null : score.sideA > score.sideB ? 0 : 1 }
