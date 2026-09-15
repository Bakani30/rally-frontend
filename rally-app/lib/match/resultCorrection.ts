import type { ProposedResultPayload } from '@/types/match'

const TEAM_SCORE_ACTIVITIES = new Set(['basketball', 'badminton', 'football'])

export function deriveWinnerSideFromScore(
  side0: number,
  side1: number,
): { winnerSide: 0 | 1 | null; isTie: boolean } {
  if (side0 === side1) return { winnerSide: null, isTie: true }
  return { winnerSide: side0 > side1 ? 0 : 1, isTie: false }
}

export function validateProposedResult(
  input: ProposedResultPayload,
  activityType: string,
): { ok: true; payload: ProposedResultPayload } | { ok: false; reason: string } {
  if (TEAM_SCORE_ACTIVITIES.has(activityType)) {
    const { side0Score, side1Score } = input
    if (side0Score == null || side1Score == null) return { ok: false, reason: 'กรอกคะแนนทั้งสองฝั่ง' }
    if (!Number.isInteger(side0Score) || !Number.isInteger(side1Score)) return { ok: false, reason: 'คะแนนต้องเป็นจำนวนเต็ม' }
    if (side0Score < 0 || side1Score < 0) return { ok: false, reason: 'คะแนนต้องไม่ติดลบ' }
    const derived = deriveWinnerSideFromScore(side0Score, side1Score)
    return {
      ok: true,
      payload: {
        side0Score,
        side1Score,
        winnerSide: derived.winnerSide,
        isTie: derived.isTie,
        scoreLog: input.scoreLog ?? null,
      },
    }
  }
  // Non-score (running / head-to-head): winner side or tie.
  if (input.isTie) return { ok: true, payload: { isTie: true, winnerSide: null } }
  if (input.winnerSide === 0 || input.winnerSide === 1) {
    return { ok: true, payload: { isTie: false, winnerSide: input.winnerSide } }
  }
  return { ok: false, reason: 'เลือกผู้ชนะหรือเสมอ' }
}

export function summarizeProposedResult(req: {
  proposed_side_0_score: number | null
  proposed_side_1_score: number | null
  proposed_winner_side: 0 | 1 | null
  proposed_is_tie: boolean
}): string {
  if (req.proposed_side_0_score != null && req.proposed_side_1_score != null) {
    return `${req.proposed_side_0_score} – ${req.proposed_side_1_score}`
  }
  if (req.proposed_is_tie) return 'เสมอ'
  return req.proposed_winner_side === 0 ? 'ฝั่ง A ชนะ' : 'ฝั่ง B ชนะ'
}
