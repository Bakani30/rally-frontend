import { supabase } from '@/lib/supabase'
import type { MatchHistoryImpactRpcRow } from './matchHistoryImpactTypes'

export async function fetchMatchHistoryImpactRows(
  matchIds: readonly string[],
): Promise<MatchHistoryImpactRpcRow[]> {
  const { data, error } = await supabase.rpc('get_my_match_history_impacts', {
    p_match_ids: [...matchIds],
  })

  if (error) throw new Error(error.message)
  return (data ?? []) satisfies MatchHistoryImpactRpcRow[]
}
