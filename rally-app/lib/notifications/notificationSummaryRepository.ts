import { supabase } from '@/lib/supabase'

import {
  normalizeNotificationActionSummary,
  type NotificationActionSummary,
  type NotificationActionSummaryRpcRow,
} from './notificationSummary'

export async function getNotificationActionSummaryRecord(): Promise<NotificationActionSummary> {
  const { data, error } = await supabase.rpc('get_notification_action_summary')
  if (error) throw error

  const row = Array.isArray(data)
    ? data[0]
    : data
  return normalizeNotificationActionSummary(row as NotificationActionSummaryRpcRow | null | undefined)
}
