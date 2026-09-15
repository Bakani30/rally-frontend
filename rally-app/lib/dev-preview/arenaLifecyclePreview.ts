import type { ArenaSessionSnapshot } from '@/types/arenaSession'

import { buildArenaLifecycleSnapshot } from './arenaLifecycleFixtures'

export const ARENA_LIFECYCLE_STATES = [
  'settled_winner',
  'settled_loser',
  'champion',
  'captain_decision_required',
  'captain_continued',
  'teammate_waiting',
  'paired_stake',
  'ready_to_start',
  'in_progress',
  'retired',
  'draining',
  'closed',
] as const

export type ArenaLifecycleState = (typeof ARENA_LIFECYCLE_STATES)[number]

export type ArenaLifecycleFixture = {
  state: ArenaLifecycleState
  label: string
  detail: string
  snapshot: ArenaSessionSnapshot
}

export const ARENA_LIFECYCLE_PREVIEW_ACTIONS = [
  'continue',
  'retire',
  'update_stake_proposal',
  'confirm_final_stake',
  'start_round',
] as const

export type ArenaLifecyclePreviewAction = (typeof ARENA_LIFECYCLE_PREVIEW_ACTIONS)[number]

export type ArenaLifecyclePreviewState = {
  state: ArenaLifecycleState
  actionLog: string[]
}

const NEXT_STATE: Record<ArenaLifecycleState, ArenaLifecycleState> = {
  settled_winner: 'champion',
  settled_loser: 'retired',
  champion: 'settled_winner',
  captain_decision_required: 'captain_continued',
  captain_continued: 'paired_stake',
  teammate_waiting: 'paired_stake',
  paired_stake: 'retired',
  ready_to_start: 'in_progress',
  in_progress: 'settled_winner',
  retired: 'settled_loser',
  draining: 'closed',
  closed: 'settled_loser',
}

const STATE_COPY: Record<ArenaLifecycleState, Pick<ArenaLifecycleFixture, 'label' | 'detail'>> = {
  settled_winner: { label: 'SETTLED WINNER', detail: 'รอบล่าสุดปิดผลแล้ว และทีมของคุณเป็นผู้ชนะ' },
  settled_loser: { label: 'SETTLED LOSER', detail: 'รอบล่าสุดปิดผลแล้ว และทีมของคุณเป็นผู้แพ้' },
  champion: { label: 'CHAMPION', detail: 'ทีมของคุณครองสนามต่อในรอบถัดไป' },
  captain_decision_required: { label: 'CAPTAIN DECISION REQUIRED', detail: 'กัปตันต้องเลือกว่าจะเล่นต่อหรือถอนทีมจากรอบถัดไป' },
  captain_continued: { label: 'CAPTAIN CONTINUED', detail: 'กัปตันเลือกเล่นต่อแล้ว ทีมกำลังรอจับคู่รอบถัดไป' },
  teammate_waiting: { label: 'TEAMMATE WAITING', detail: 'สมาชิกเห็นสถานะได้อย่างเดียว และกำลังรอกัปตันตัดสินใจ' },
  paired_stake: { label: 'PAIRED · STAKE', detail: 'จับคู่แล้ว แสดงเฉพาะข้อเสนอเดิมพันของบัญชีคุณ' },
  ready_to_start: { label: 'READY TO START', detail: 'ผู้เล่นยืนยัน stake ครบแล้ว กัปตันเริ่มรอบได้' },
  in_progress: { label: 'IN PROGRESS', detail: 'รอบกำลังแข่ง และเปิดเข้าแมตช์ปัจจุบันผ่าน deep link ได้' },
  retired: { label: 'RETIRED', detail: 'ทีมของคุณพักจากสนามหลังจบรอบ' },
  draining: { label: 'DRAINING', detail: 'Arena หยุดรับทีมใหม่และกำลังรอปิดตามเวลาที่กำหนด' },
  closed: { label: 'CLOSED', detail: 'Arena ปิดแล้วและไม่รับการกระทำเพิ่มเติม' },
}

const AVAILABLE_ACTIONS: Record<ArenaLifecycleState, readonly ArenaLifecyclePreviewAction[]> = {
  settled_winner: [], settled_loser: [], champion: [],
  captain_decision_required: ['continue', 'retire'],
  captain_continued: ['retire'], teammate_waiting: [],
  paired_stake: ['update_stake_proposal', 'confirm_final_stake', 'start_round'],
  ready_to_start: ['start_round'],
  in_progress: [],
  retired: [],
  draining: [],
  closed: [],
}

export function canUseArenaLifecyclePreview(isDev: boolean | undefined): boolean {
  return isDev === true
}

export function parseArenaLifecycleState(value: unknown): ArenaLifecycleState {
  const candidate = Array.isArray(value) ? value[0] : value
  return isArenaLifecycleState(candidate) ? candidate : 'settled_winner'
}

export function nextArenaLifecycleState(state: ArenaLifecycleState): ArenaLifecycleState {
  return NEXT_STATE[state]
}

export function getArenaLifecyclePreviewActions(state: ArenaLifecycleState): readonly ArenaLifecyclePreviewAction[] {
  return AVAILABLE_ACTIONS[state]
}

export function transitionArenaLifecyclePreview(
  current: ArenaLifecyclePreviewState,
  action: ArenaLifecyclePreviewAction,
): ArenaLifecyclePreviewState {
  if (!getArenaLifecyclePreviewActions(current.state).includes(action)) return current

  const nextState = action === 'continue' ? 'captain_continued' : action === 'retire' ? 'retired' : current.state
  const copy: Record<ArenaLifecyclePreviewAction, string> = {
    continue: 'Captain chose to continue locally',
    retire: 'Captain confirmed team retirement locally',
    update_stake_proposal: 'Updated own stake proposal locally',
    confirm_final_stake: 'Confirmed own stake locally',
    start_round: 'Requested round start locally',
  }

  return { state: nextState, actionLog: [...current.actionLog, copy[action]] }
}

export function getArenaLifecycleFixture(state: ArenaLifecycleState): ArenaLifecycleFixture {
  return { state, ...STATE_COPY[state], snapshot: buildArenaLifecycleSnapshot(state) }
}

function isArenaLifecycleState(value: unknown): value is ArenaLifecycleState {
  return typeof value === 'string' && (ARENA_LIFECYCLE_STATES as readonly string[]).includes(value)
}
