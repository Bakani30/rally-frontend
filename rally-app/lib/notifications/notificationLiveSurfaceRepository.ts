import { supabase } from '@/lib/supabase'

export type NotificationLiveSurfaceKind = 'match_invited' | 'friend_request'

export type NotificationLiveSurfaceRecord = {
  surface_id: string
  kind: NotificationLiveSurfaceKind
  title: string
  body: string
  actor_user_id: string
  actor_display_name: string
  actor_handle: string | null
  actor_avatar_url: string | null
  route: string
  match_id: string | null
  invite_id: string | null
  activity_type: string | null
  created_at: string
  expires_at: string | null
}

export async function getNotificationLiveSurfaces(
  limit = 10,
): Promise<NotificationLiveSurfaceRecord[]> {
  const { data, error } = await supabase.rpc('get_notification_live_surfaces', {
    p_limit: limit,
  })
  if (error) throw error
  return (data ?? []) as NotificationLiveSurfaceRecord[]
}
