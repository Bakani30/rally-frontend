import { supabase } from '@/lib/supabase'
import { activitySessionSelect } from '@/lib/activities/shared/activitySessionSelect'
import { isVisibleActivity } from '@/lib/match/matchConfig'
import type { ActivityHistoryItem } from './activityHistoryTypes'

export async function listActivityHistoryRecord(userId: string): Promise<ActivityHistoryItem[]> {
  const { data, error } = await supabase
    .from('activity_sessions')
    .select(activitySessionSelect)
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return ((data ?? []) as unknown as ActivityHistoryItem[]).filter((item) =>
    isVisibleActivity(item.activity_type),
  )
}

export async function getActivityHistoryRecord(
  activitySessionId: string
): Promise<ActivityHistoryItem | null> {
  const { data, error } = await supabase
    .from('activity_sessions')
    .select(activitySessionSelect)
    .eq('id', activitySessionId)
    .maybeSingle()
  if (error) throw error
  const item = (data ?? null) as unknown as ActivityHistoryItem | null
  return item && isVisibleActivity(item.activity_type) ? item : null
}
