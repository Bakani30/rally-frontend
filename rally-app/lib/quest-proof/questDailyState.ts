// Pure: collapse today's proof sessions into per-template daily state. No React/RN.
import type { QuestProofSession, QuestProofStatus } from './questProofTypes'

export type QuestDailyState = {
  status: QuestProofStatus | 'none'
  doneToday: boolean
  attemptsUsed: number
  /** Sessions that earned points today — the only kind the server counts against attempts_per_day. */
  grantedToday: number
}

const DONE: QuestProofStatus[] = ['passed', 'reward_pending', 'claimed']

export function mapDailyState(sessions: QuestProofSession[]): Record<string, QuestDailyState> {
  const byTemplate: Record<string, QuestProofSession[]> = {}
  for (const s of sessions) (byTemplate[s.template_id] ??= []).push(s)
  const out: Record<string, QuestDailyState> = {}
  for (const [templateId, list] of Object.entries(byTemplate)) {
    const latest = list.reduce((a, b) => ((b.started_at ?? '') > (a.started_at ?? '') ? b : a))
    const granted = list.filter((s) => DONE.includes(s.status)).length
    out[templateId] = {
      status: latest.status,
      // A later free retry (live_session/voided) must not clear the done state
      // once points were granted — mirror the server rule, not just the latest row.
      doneToday: granted > 0,
      attemptsUsed: list.length,
      grantedToday: granted,
    }
  }
  return out
}
