import { supabase } from '@/lib/supabase'
import type { QuestProofSession } from './questProofTypes'

function todayBangkok(): string {
  // Bangkok = UTC+7, no DST. Shift now by +7h then take the date part.
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export async function listTodaySessions(userId: string): Promise<QuestProofSession[]> {
  const { data, error } = await supabase
    .from('quest_proof_sessions')
    .select('id, user_id, template_id, earn_period, status, audit_status, trust_decision, points_granted, nonce, challenge, sensor_summary, media_path, started_at, completed_at')
    .eq('user_id', userId)
    .eq('earn_period', todayBangkok())
    .order('started_at', { ascending: true })
  if (error) throw new Error('โหลดสถานะเควสวันนี้ไม่ได้ ลองใหม่')
  return (data ?? []) as unknown as QuestProofSession[]
}
