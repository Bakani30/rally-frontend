// Pure: proof status → pill descriptor + result-beat tone. Theme-agnostic (toneKey only). No React/RN.
import type { QuestProofSession, QuestProofStatus } from './questProofTypes'

export type ToneKey = 'live' | 'pending' | 'pass' | 'fail' | 'neutral'
export type PillDescriptor = { toneKey: ToneKey; labelTH: string; pulse: boolean }

const PILL: Record<QuestProofStatus | 'none', PillDescriptor> = {
  live_session:   { toneKey: 'live',    labelTH: 'กำลังทำ',    pulse: true },
  analyzing:      { toneKey: 'pending', labelTH: 'กำลังตรวจ', pulse: true },
  needs_review:   { toneKey: 'pending', labelTH: 'รอตรวจ',    pulse: false },
  reward_pending: { toneKey: 'pending', labelTH: 'รอแต้ม',     pulse: false },
  passed:         { toneKey: 'pass',    labelTH: 'ผ่าน',       pulse: false },
  claimed:        { toneKey: 'pass',    labelTH: 'รับแล้ว',    pulse: false },
  failed:         { toneKey: 'fail',    labelTH: 'ไม่ผ่าน',    pulse: false },
  voided:         { toneKey: 'fail',    labelTH: 'เป็นโมฆะ',   pulse: false },
  expired:        { toneKey: 'fail',    labelTH: 'หมดเวลา',    pulse: false },
  none:           { toneKey: 'neutral', labelTH: '',            pulse: false },
}

export function proofStatusPill(status: QuestProofStatus | 'none'): PillDescriptor {
  return PILL[status]
}

export function resultBeatTone(session: QuestProofSession): 'success' | 'capped' | 'fail' | 'pending' {
  const { status, points_granted, trust_decision } = session
  if (status === 'failed' || status === 'voided' || status === 'expired') return 'fail'
  if (status === 'analyzing' || status === 'reward_pending' || trust_decision === 'pending') return 'pending'
  if ((status === 'passed' || status === 'claimed') && (points_granted ?? 0) > 0) return 'success'
  return 'capped'
}
