import { supabase } from '@/lib/supabase'

export type DisputeHistory = {
  total_settled: number
  total_disputed: number
  disputes_filed: number
  disputes_against: number
}

export async function getDisputeHistoryRecord(userId: string): Promise<DisputeHistory | null> {
  const { data, error } = await supabase
    .rpc('get_dispute_history', { p_user_id: userId })
    .maybeSingle()
  if (error) throw error
  return (data ?? null) as DisputeHistory | null
}
