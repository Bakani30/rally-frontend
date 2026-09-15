import { supabase } from '@/lib/supabase'
import { activitySessionSelect } from '@/lib/activities/shared/activitySessionSelect'
import type { ActivityHistoryItem } from '@/lib/activities/history/activityHistoryTypes'

export type ActivityLinkedMatch = {
  match_id: string
  status: string
  activity_type: string
  rule_text: string | null
}

export async function getActivitySessionDetail(id: string): Promise<ActivityHistoryItem | null> {
  const { data, error } = await supabase
    .from('activity_sessions')
    .select(activitySessionSelect)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as unknown as ActivityHistoryItem | null
}

export async function getLinkedMatchForActivity(
  activitySessionId: string,
): Promise<ActivityLinkedMatch | null> {
  const { data, error } = await supabase
    .from('activity_session_links')
    .select(`
      match_id,
      matches:match_id ( status, activity_type, rule_text )
    `)
    .eq('activity_session_id', activitySessionId)
    .eq('link_type', 'match')
    .not('match_id', 'is', null)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data || !data.match_id) return null

  type Row = {
    match_id: string
    matches: { status: string; activity_type: string; rule_text: string | null } | null
  }
  const row = data as unknown as Row
  if (!row.matches) return null
  return {
    match_id: row.match_id,
    status: row.matches.status,
    activity_type: row.matches.activity_type,
    rule_text: row.matches.rule_text,
  }
}
