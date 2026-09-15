import type { ArenaActorDraft, ArenaRoundResultSnapshot } from '@/types/arenaResult'
import { longRangePointValueForTeamSize } from '@/lib/match/basketballStatSheetControls'

export type ArenaResultPresentationKind =
  | 'stats_incomplete'
  | 'ready_to_submit'
  | 'awaiting_approvals'
  | 'awaiting_resubmission'
  | 'settled'
  | 'cancelled'
  | 'held'

export type ArenaResultMutations = {
  submit: boolean
  approve: boolean
  requestCorrection: boolean
  requestCancel: boolean
  agreeCancel: boolean
  declineCancel: boolean
  withdrawCancel: boolean
}

export type ArenaResultPresentation = {
  kind: ArenaResultPresentationKind
  status: {
    value: 'in_progress' | 'submitted' | 'disputed' | 'settled' | 'cancelled'
    label: string
  }
  readiness: {
    label: string
    tone: 'pending' | 'ready' | 'risk' | 'confirmed'
    progress: { current: number; total: number }
  }
  score: {
    side0: number | null
    side1: number | null
    editable: boolean
    tieHelper: string | null
    contextLabel: string | null
  }
  consensus: {
    side0Score: number
    side1Score: number
    resultVersion: number
    versionLabel: string
    approvalLabel: string
    actorAlreadyApproved: boolean
    lockedLabel: string | null
    side0Approved: boolean
    side1Approved: boolean
  } | null
  actorStat: {
    initial: ArenaActorStatValues
    initialNote: string
    readinessLabel: string
    ready: boolean
    editable: boolean
    longRangePointValue: 2 | 3
    longShotLabel: '2PT' | '3PM'
  } | null
  terminal: {
    celebrates: boolean
    title: string
    detail: string
    rotationLabel: string
  } | null
  mutations: ArenaResultMutations
  cancelPending: boolean
  readOnly: boolean
  showReturnToArena: boolean
}

type ArenaResultTerminal = NonNullable<ArenaResultPresentation['terminal']>

export type ArenaActorStatValues = {
  points: number
  rebounds: number
  assists: number
  blocks: number
  threePointersMade: number
}

const NO_MUTATIONS: ArenaResultMutations = {
  submit: false,
  approve: false,
  requestCorrection: false,
  requestCancel: false,
  agreeCancel: false,
  declineCancel: false,
  withdrawCancel: false,
}

const EMPTY_ACTOR_STATS: ArenaActorStatValues = {
  points: 0,
  rebounds: 0,
  assists: 0,
  blocks: 0,
  threePointersMade: 0,
}

/**
 * Converts the server-owned Arena snapshot into UI semantics only. It never
 * infers an outcome, a settlement, or a queue position from scores or team data.
 */
export function deriveArenaResultPresentation(
  snapshot: ArenaRoundResultSnapshot,
): ArenaResultPresentation {
  const progress = {
    current: snapshot.draftReadiness.draftCount,
    total: snapshot.draftReadiness.requiredCount,
  }
  const actorStat = actorStatPresentation(snapshot)
  const resubmission = snapshot.currentResult?.kind === 'awaiting_resubmission'
    ? snapshot.currentResult
    : null
  const isHeld = !resubmission
    && (snapshot.matchStatus === 'disputed' || snapshot.roundStatus === 'disputed')

  if (snapshot.outcome?.status === 'settled') {
    return terminalPresentation(snapshot, actorStat, 'settled')
  }
  if (snapshot.outcome?.status === 'cancelled') {
    return terminalPresentation(snapshot, actorStat, 'cancelled')
  }
  if (snapshot.phase === 'cancel_pending') {
    return cancelPendingPresentation(snapshot, progress)
  }
  if (isHeld) {
    return {
      kind: 'held',
      status: { value: 'disputed', label: 'ระงับการตัดสิน' },
      readiness: { label: 'ผลรอบนี้อยู่ระหว่างตรวจสอบ', tone: 'risk', progress },
      score: { side0: null, side1: null, editable: false, tieHelper: null, contextLabel: null },
      consensus: null,
      actorStat: readOnlyActorStat(actorStat),
      terminal: null,
      mutations: NO_MUTATIONS,
      cancelPending: false,
      readOnly: true,
      showReturnToArena: true,
    }
  }

  const submitted = snapshot.currentResult?.kind === 'submitted'
    ? snapshot.currentResult
    : null
  const canSubmit = snapshot.actor.capabilities.canSubmit
    && snapshot.draftReadiness.complete
    && !submitted
  const cancelMutations = cancellationMutations(snapshot)

  if (submitted) {
    const mutations: ArenaResultMutations = {
      ...cancelMutations,
      approve: snapshot.actor.capabilities.canApprove && !submitted.approvals.actorApproved,
      requestCorrection: snapshot.actor.capabilities.canRequestCorrection,
    }
    return {
      kind: 'awaiting_approvals',
      status: { value: 'submitted', label: 'รอยืนยันผล' },
      readiness: { label: 'ส่งผลแล้ว รอกัปตันทั้งสองฝ่ายยืนยัน', tone: 'pending', progress },
      score: {
        side0: submitted.side0Score,
        side1: submitted.side1Score,
        editable: false,
        tieHelper: null,
        contextLabel: null,
      },
      consensus: {
        side0Score: submitted.side0Score,
        side1Score: submitted.side1Score,
        resultVersion: submitted.resultVersion,
        versionLabel: `ผลแข่งเวอร์ชัน ${submitted.resultVersion}`,
        approvalLabel: `ยืนยันแล้ว ${submitted.approvals.approvedCount}/2`,
        actorAlreadyApproved: submitted.approvals.actorApproved,
        lockedLabel: submitted.approvals.actorApproved ? 'คุณยืนยันผลแล้ว' : null,
        side0Approved: submitted.approvals.side0,
        side1Approved: submitted.approvals.side1,
      },
      actorStat: readOnlyActorStat(actorStat),
      terminal: null,
      mutations,
      cancelPending: false,
      readOnly: false,
      showReturnToArena: false,
    }
  }

  if (resubmission) {
    return {
      kind: 'awaiting_resubmission',
      status: { value: 'in_progress', label: 'ส่งผลใหม่' },
      readiness: {
        label: snapshot.draftReadiness.complete
          ? 'แก้ไขผลแล้ว ส่งผลเวอร์ชันใหม่ได้'
          : 'รอสถิติผู้เล่นให้ครบก่อนส่งผลใหม่',
        tone: snapshot.draftReadiness.complete ? 'ready' : 'pending',
        progress,
      },
      score: {
        side0: resubmission.previousSide0Score,
        side1: resubmission.previousSide1Score,
        editable: canSubmit,
        tieHelper: canSubmit ? 'ต้องเล่นแต้มตัดสินก่อนส่งผล' : null,
        contextLabel: 'คะแนนเวอร์ชันก่อนหน้า',
      },
      consensus: null,
      actorStat,
      terminal: null,
      mutations: { ...cancelMutations, submit: canSubmit },
      cancelPending: false,
      readOnly: false,
      showReturnToArena: false,
    }
  }

  if (!snapshot.draftReadiness.complete) {
    return {
      kind: 'stats_incomplete',
      status: { value: 'in_progress', label: 'รอสถิติ' },
      readiness: { label: 'รอสถิติผู้เล่นให้ครบ', tone: 'pending', progress },
      score: { side0: 0, side1: 0, editable: false, tieHelper: null, contextLabel: null },
      consensus: null,
      actorStat,
      terminal: null,
      mutations: cancelMutations,
      cancelPending: false,
      readOnly: false,
      showReturnToArena: false,
    }
  }

  return {
    kind: 'ready_to_submit',
    status: { value: 'in_progress', label: 'พร้อมส่งผล' },
    readiness: { label: 'สถิติผู้เล่นครบแล้ว', tone: 'ready', progress },
    score: {
      side0: 0,
      side1: 0,
      editable: canSubmit,
      tieHelper: 'ต้องเล่นแต้มตัดสินก่อนส่งผล',
      contextLabel: null,
    },
    consensus: null,
    actorStat,
    terminal: null,
    mutations: { ...cancelMutations, submit: canSubmit },
    cancelPending: false,
    readOnly: false,
    showReturnToArena: false,
  }
}

function terminalPresentation(
  snapshot: ArenaRoundResultSnapshot,
  actorStat: ArenaResultPresentation['actorStat'],
  kind: 'settled' | 'cancelled',
): ArenaResultPresentation {
  const submitted = snapshot.currentResult?.kind === 'submitted'
    ? snapshot.currentResult
    : null
  const progress = {
    current: snapshot.draftReadiness.draftCount,
    total: snapshot.draftReadiness.requiredCount,
  }

  if (kind === 'cancelled') {
    const outcome = snapshot.outcome
    if (!outcome || outcome.status !== 'cancelled') {
      throw new Error('Cancelled Arena presentation requires a durable outcome')
    }
    const terminal = cancelledTerminalCopy(outcome)
    return {
      kind,
      status: { value: 'cancelled', label: 'ยกเลิกรอบ' },
      readiness: { label: 'ระบบยืนยันการยกเลิกรอบแล้ว', tone: 'confirmed', progress },
      score: scoreFromSubmitted(submitted),
      consensus: null,
      actorStat: readOnlyActorStat(actorStat),
      terminal,
      mutations: NO_MUTATIONS,
      cancelPending: false,
      readOnly: true,
      showReturnToArena: true,
    }
  }

  const outcome = snapshot.outcome
  if (!outcome || outcome.status !== 'settled') {
    throw new Error('Settled Arena presentation requires a durable outcome')
  }
  return {
    kind,
    status: { value: 'settled', label: 'จบรอบแล้ว' },
    readiness: { label: 'ระบบยืนยันผลและอัปเดต Arena แล้ว', tone: 'confirmed', progress },
    score: scoreFromSubmitted(submitted),
    consensus: null,
    actorStat: readOnlyActorStat(actorStat),
    terminal: settledTerminalCopy(outcome),
    mutations: NO_MUTATIONS,
    cancelPending: false,
    readOnly: true,
    showReturnToArena: true,
  }
}

function cancelPendingPresentation(
  snapshot: ArenaRoundResultSnapshot,
  progress: ArenaResultPresentation['readiness']['progress'],
): ArenaResultPresentation {
  const requesterIsActor = snapshot.cancellation.status === 'pending'
    && snapshot.cancellation.requester === 'self'
  return {
    kind: 'awaiting_approvals',
    status: {
      value: 'in_progress',
      label: requesterIsActor ? 'รออีกทีมตอบ' : 'รอการตัดสินใจ',
    },
    readiness: {
      label: requesterIsActor
        ? 'คุณขอยกเลิกรอบแล้ว รออีกทีมตอบรับหรือปฏิเสธ'
        : 'อีกทีมขอยกเลิกรอบ เลือกยืนยันหรือปฏิเสธ',
      tone: 'pending',
      progress,
    },
    score: { side0: null, side1: null, editable: false, tieHelper: null, contextLabel: null },
    consensus: null,
    actorStat: null,
    terminal: null,
    mutations: cancellationMutations(snapshot),
    cancelPending: true,
    readOnly: false,
    showReturnToArena: false,
  }
}

function scoreFromSubmitted(
  submitted: Extract<NonNullable<ArenaRoundResultSnapshot['currentResult']>, { kind: 'submitted' }> | null,
): ArenaResultPresentation['score'] {
  return {
    side0: submitted?.side0Score ?? null,
    side1: submitted?.side1Score ?? null,
    editable: false,
    tieHelper: null,
    contextLabel: null,
  }
}

function cancellationMutations(snapshot: ArenaRoundResultSnapshot): ArenaResultMutations {
  return {
    ...NO_MUTATIONS,
    requestCancel: snapshot.cancellation.status === 'none'
      && snapshot.actor.capabilities.canRequestCancel,
    agreeCancel: snapshot.cancellation.status === 'pending'
      && snapshot.actor.capabilities.canAgreeCancel,
    declineCancel: snapshot.cancellation.status === 'pending'
      && snapshot.actor.capabilities.canDeclineCancel,
    withdrawCancel: snapshot.cancellation.status === 'pending'
      && snapshot.actor.capabilities.canWithdrawCancel,
  }
}

function actorStatPresentation(snapshot: ArenaRoundResultSnapshot): ArenaResultPresentation['actorStat'] {
  if (snapshot.actor.role === 'referee') return null

  const actorDraft = snapshot.actorDraft
  const teamSizePerSide = Math.max(1, Math.floor(snapshot.draftReadiness.requiredCount / 2))
  const longRangePointValue = longRangePointValueForTeamSize(teamSizePerSide)
  const editable = snapshot.actor.capabilities.canEditActorDraft
  return {
    initial: toActorStatValues(actorDraft),
    initialNote: actorDraft?.note ?? '',
    readinessLabel: snapshot.draftReadiness.complete
      ? 'สถิติผู้เล่นครบแล้ว'
      : 'บันทึกสถิติของคุณเพื่อให้ทุกคนพร้อมส่งผล',
    ready: snapshot.draftReadiness.complete,
    editable,
    longRangePointValue,
    longShotLabel: longRangePointValue === 3 ? '3PM' : '2PT',
  }
}

function readOnlyActorStat(
  actorStat: ArenaResultPresentation['actorStat'],
): ArenaResultPresentation['actorStat'] {
  return actorStat ? { ...actorStat, editable: false } : null
}

function toActorStatValues(draft: ArenaActorDraft | null): ArenaActorStatValues {
  if (!draft) return EMPTY_ACTOR_STATS
  return {
    points: draft.points,
    rebounds: draft.rebounds,
    assists: draft.assists,
    blocks: draft.blocks,
    threePointersMade: draft.threePointersMade,
  }
}

function settledTerminalCopy(
  outcome: Extract<NonNullable<ArenaRoundResultSnapshot['outcome']>, { status: 'settled' }>,
): ArenaResultTerminal {
  if (outcome.actorOutcome === 'win') {
    return {
      celebrates: true,
      title: 'ทีมคุณชนะรอบนี้',
      detail: outcome.rotation.winnerRetired
        ? 'ทีมคุณชนะครบตามกติกาและพักจากสนามแล้ว'
        : 'Arena บันทึกชัยชนะของทีมคุณแล้ว',
      rotationLabel: outcome.rotation.winnerRetired
        ? 'ทีมคุณพักจากสนามตามกติกาแล้ว'
        : outcome.rotation.championStreak > 0
          ? `ชนะต่อเนื่อง ${outcome.rotation.championStreak} รอบ`
          : 'Arena อัปเดตลำดับรอบถัดไปแล้ว',
    }
  }
  if (outcome.actorOutcome === 'loss') {
    return {
      celebrates: false,
      title: 'ทีมคุณแพ้รอบนี้',
      detail: outcome.rotation.loserRetired
        ? 'ทีมคุณพักจากสนามตามกติกาแล้ว'
        : 'Arena บันทึกผลของทีมคุณแล้ว',
      rotationLabel: outcome.rotation.loserRetired
        ? 'ทีมคุณพักจากสนามตามกติกาแล้ว'
        : outcome.rotation.loserQueuePosition !== null
          ? `ทีมคุณอยู่ลำดับคิว ${outcome.rotation.loserQueuePosition}`
          : 'Arena อัปเดตลำดับรอบถัดไปแล้ว',
    }
  }
  return {
    celebrates: false,
    title: 'ผลรอบนี้ยืนยันแล้ว',
    detail: 'Arena บันทึกผลรอบนี้แล้ว',
    rotationLabel: 'Arena อัปเดตลำดับรอบถัดไปแล้ว',
  }
}

function cancelledTerminalCopy(
  outcome: Extract<NonNullable<ArenaRoundResultSnapshot['outcome']>, { status: 'cancelled' }>,
): ArenaResultTerminal {
  const actorCancelled = outcome.actorOutcome === 'cancelled'
  return {
    celebrates: false,
    title: actorCancelled ? 'รอบของคุณยกเลิกแล้ว' : 'รอบนี้ยกเลิกแล้ว',
    detail: actorCancelled
      ? 'ระบบยืนยันการยกเลิกและคืนสิทธิ์ของทีมคุณแล้ว'
      : 'ระบบยืนยันการยกเลิกตามคำตอบของกัปตันทั้งสองฝ่าย',
    rotationLabel: actorCancelled && outcome.rotation.actorQueuePosition !== null
      ? `ทีมคุณอยู่ลำดับคิว ${outcome.rotation.actorQueuePosition}`
      : 'Arena อัปเดตคิวหลังยกเลิกแล้ว',
  }
}
