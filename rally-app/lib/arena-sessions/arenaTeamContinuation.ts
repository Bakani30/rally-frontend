import type {
  ArenaTeamParticipationDecisionInput,
  ArenaTeamParticipationDetailedSnapshot,
  ArenaTeamParticipationSnapshot,
} from '@/types/arenaSession'

export type ArenaTeamContinuationPresentation =
  | { kind: 'hidden' }
  | { kind: 'captain_decision'; canContinue: boolean; canRetire: boolean }
  | { kind: 'teammate_decision' }
  | { kind: 'captain_waiting'; canRetire: boolean }
  | { kind: 'teammate_waiting' }

export type ArenaTeamContinuationActionScope = Pick<
  ArenaTeamParticipationDecisionInput,
  'arenaId' | 'participationCycleId' | 'expectedRevision'
> & {
  /** Local stale-alert guard only. Never included in the Edge request body. */
  actorId: string
}

export type ArenaTeamContinuationCurrentAction = {
  scope: ArenaTeamContinuationActionScope | null
  active: boolean
  canRetire: boolean
  actionPending: boolean
  onDecision?: (input: ArenaTeamParticipationDecisionInput) => void
}

/**
 * Continuation authority is deliberately a direct projection of the
 * actor-scoped server snapshot. Never infer it from an Arena, Party, or team
 * role: those states do not authorize an action in this participation cycle.
 */
export function getArenaTeamContinuationPresentation(
  participation: ArenaTeamParticipationSnapshot,
): ArenaTeamContinuationPresentation {
  if (!isDetailedParticipation(participation)) return { kind: 'hidden' }

  if (participation.state === 'decision_required') {
    if (!participation.capabilities.canContinue && !participation.capabilities.canRetire) {
      return { kind: 'teammate_decision' }
    }
    return {
      kind: 'captain_decision',
      canContinue: participation.capabilities.canContinue,
      canRetire: participation.capabilities.canRetire,
    }
  }

  if (participation.state === 'ready_to_pair') {
    return participation.capabilities.canRetire
      ? { kind: 'captain_waiting', canRetire: true }
      : { kind: 'teammate_waiting' }
  }

  return { kind: 'hidden' }
}

export function getArenaTeamContinuationErrorCopy(error: unknown): string {
  const code = getErrorCode(error)
  if (code === 'arena_team_participation_cycle_conflict') {
    return 'สถานะทีมเปลี่ยนแล้ว กรุณาลองใหม่อีกครั้ง'
  }
  if (code === 'arena_team_decision_captain_required') {
    return 'กัปตันทีมเท่านั้นที่ตัดสินใจรอบนี้ได้'
  }
  return 'บันทึกการตัดสินใจไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
}

export function getArenaTeamContinuationActionScope(
  arenaId: string,
  actorId: string | undefined,
  participation: ArenaTeamParticipationSnapshot,
): ArenaTeamContinuationActionScope | null {
  if (!actorId || !isDetailedParticipation(participation)) return null
  return {
    arenaId,
    actorId,
    participationCycleId: participation.participationCycleId,
    expectedRevision: participation.revision,
  }
}

/**
 * Native alerts can remain open after their React tree has refreshed. Bind the
 * originally displayed target, then re-check the latest actor snapshot before
 * dispatching the destructive choice. A confirmation is one-shot by design.
 */
export function createArenaTeamRetireConfirmation(
  target: ArenaTeamContinuationActionScope,
  getCurrent: () => ArenaTeamContinuationCurrentAction,
): () => void {
  let dispatched = false

  return () => {
    if (dispatched) return
    const current = getCurrent()
    if (
      !current.scope
      || !current.active
      || !current.canRetire
      || current.actionPending
      || !current.onDecision
      || !isSameActionScope(target, current.scope)
    ) return

    dispatched = true
    current.onDecision({
      arenaId: target.arenaId,
      participationCycleId: target.participationCycleId,
      expectedRevision: target.expectedRevision,
      decision: 'retire',
    })
  }
}

export function isDetailedParticipation(
  participation: ArenaTeamParticipationSnapshot,
): participation is ArenaTeamParticipationDetailedSnapshot {
  return 'participationCycleId' in participation
}

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null
  const value = error as { code?: unknown }
  return typeof value.code === 'string' ? value.code : null
}

function isSameActionScope(
  left: ArenaTeamContinuationActionScope,
  right: ArenaTeamContinuationActionScope,
): boolean {
  return left.arenaId === right.arenaId
    && left.actorId === right.actorId
    && left.participationCycleId === right.participationCycleId
    && left.expectedRevision === right.expectedRevision
}
