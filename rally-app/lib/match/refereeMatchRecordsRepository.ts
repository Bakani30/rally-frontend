import { supabase } from '@/lib/supabase'

// Match context for a refereed record (score + who played each side).
export type RefereeMatchRecordDetail = {
  sideAScore: number | null
  sideBScore: number | null
  sideANames: string[]
  sideBNames: string[]
}

export type RefereeMatchHistoryItem = {
  id: string
  matchId: string
  activityType: 'basketball' | 'badminton'
  finalStatus: 'accepted' | 'corrected' | 'disputed'
  qualityDelta: number
  hadDispute: boolean
  settledAt: string
  detail: RefereeMatchRecordDetail
}

type HistoryRpcRow = {
  id: string
  matchId: string
  activityType: 'basketball' | 'badminton'
  finalStatus: 'accepted' | 'corrected' | 'disputed'
  qualityDelta: number
  hadDispute: boolean
  settledAt: string
  sideAScore: number | null
  sideBScore: number | null
  sideANames: string[] | null
  sideBNames: string[] | null
}

// A referee's officiating history. Works for self AND for any visitor viewing a
// public referee profile — the list_referee_match_history_atomic RPC returns a
// curated, public-safe projection (the underlying tables stay RLS-protected).
export async function listRefereeMatchHistory(
  refereeUserId: string,
  limit = 50,
): Promise<RefereeMatchHistoryItem[]> {
  const { data, error } = await supabase.rpc('list_referee_match_history_atomic', {
    p_referee_id: refereeUserId,
    p_limit: limit,
  })

  if (error) {
    // Function may not exist yet in older environments — treat as empty history.
    if (error.code === '42883' || error.message.includes('does not exist')) return []
    throw error
  }

  return ((data ?? []) as HistoryRpcRow[]).map((row) => ({
    id: row.id,
    matchId: row.matchId,
    activityType: row.activityType,
    finalStatus: row.finalStatus,
    qualityDelta: row.qualityDelta,
    hadDispute: row.hadDispute,
    settledAt: row.settledAt,
    detail: {
      sideAScore: row.sideAScore ?? null,
      sideBScore: row.sideBScore ?? null,
      sideANames: row.sideANames ?? [],
      sideBNames: row.sideBNames ?? [],
    },
  }))
}
