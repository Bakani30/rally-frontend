import type { Side } from '@/types/match'

export type RefereeRunningMarkType = 'start' | 'checkpoint' | 'finish'

export type RefereeRunningDraftMark = {
  id: string
  type: RefereeRunningMarkType
  sideIndex: Side
  participantUserId: string | null
  checkpointIndex: number | null
  elapsedMs: number
  note: string | null
}

export type RefereeRunningDraftState = {
  marks: RefereeRunningDraftMark[]
  nextCheckpointIndex: number
}

export type RefereeRunningDraftAction =
  | { type: 'record_mark'; mark: Omit<RefereeRunningDraftMark, 'id'> & { id?: string } }
  | { type: 'reset' }

export type RefereeRunningDraftDerivedResult = {
  winnerSide: Side | null
  isTie: boolean
  side0ElapsedMs: number
  side1ElapsedMs: number
} | null

export const EMPTY_REFEREE_RUNNING_DRAFT: RefereeRunningDraftState = {
  marks: [],
  nextCheckpointIndex: 1,
}

export function refereeRunningDraftReducer(
  state: RefereeRunningDraftState,
  action: RefereeRunningDraftAction,
): RefereeRunningDraftState {
  if (action.type === 'reset') return EMPTY_REFEREE_RUNNING_DRAFT

  const mark: RefereeRunningDraftMark = {
    id: action.mark.id ?? localMarkId(action.mark),
    type: action.mark.type,
    sideIndex: action.mark.sideIndex,
    participantUserId: action.mark.participantUserId ?? null,
    checkpointIndex: action.mark.type === 'checkpoint'
      ? action.mark.checkpointIndex ?? state.nextCheckpointIndex
      : null,
    elapsedMs: Math.max(0, Math.round(action.mark.elapsedMs)),
    note: action.mark.note?.trim() || null,
  }

  const nextMarks = [
    ...state.marks.filter((current) => !sameMarkSlot(current, mark)),
    mark,
  ].sort(sortMarks)

  return {
    marks: nextMarks,
    nextCheckpointIndex: nextCheckpointIndex(nextMarks),
  }
}

export function deriveRefereeRunningDraftResult(
  state: RefereeRunningDraftState,
): RefereeRunningDraftDerivedResult {
  const side0 = finishElapsedMs(state, 0)
  const side1 = finishElapsedMs(state, 1)
  if (side0 == null || side1 == null) return null

  if (side0 === side1) {
    return {
      winnerSide: null,
      isTie: true,
      side0ElapsedMs: side0,
      side1ElapsedMs: side1,
    }
  }

  return {
    winnerSide: side0 < side1 ? 0 : 1,
    isTie: false,
    side0ElapsedMs: side0,
    side1ElapsedMs: side1,
  }
}

function sameMarkSlot(a: RefereeRunningDraftMark, b: RefereeRunningDraftMark): boolean {
  if (a.type !== b.type || a.sideIndex !== b.sideIndex) return false
  if (a.type !== 'checkpoint') return true
  return a.checkpointIndex === b.checkpointIndex
}

function nextCheckpointIndex(marks: RefereeRunningDraftMark[]): number {
  const indexes = marks
    .filter((mark) => mark.type === 'checkpoint' && mark.checkpointIndex != null)
    .map((mark) => mark.checkpointIndex ?? 0)
  return Math.max(0, ...indexes) + 1
}

function finishElapsedMs(state: RefereeRunningDraftState, sideIndex: Side): number | null {
  return state.marks.find((mark) => mark.type === 'finish' && mark.sideIndex === sideIndex)?.elapsedMs ?? null
}

function sortMarks(a: RefereeRunningDraftMark, b: RefereeRunningDraftMark): number {
  return a.elapsedMs - b.elapsedMs || a.sideIndex - b.sideIndex || markRank(a.type) - markRank(b.type)
}

function markRank(type: RefereeRunningMarkType): number {
  if (type === 'start') return 0
  if (type === 'checkpoint') return 1
  return 2
}

function localMarkId(mark: Omit<RefereeRunningDraftMark, 'id'>): string {
  return `${mark.type}:${mark.sideIndex}:${mark.checkpointIndex ?? 'x'}`
}
