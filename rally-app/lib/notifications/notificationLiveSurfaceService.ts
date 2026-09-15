type NotificationLiveSurfaceKind = 'match_invited' | 'friend_request'
type NotificationLiveSurfaceRecord = {
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
type NotificationBannerInput = {
  kind: NotificationLiveSurfaceKind
  title: string
  body: string
  headline?: string | null
  actorName?: string | null
  subtitle?: string | null
  route: string
  matchId?: string | null
  inviteId?: string | null
  requesterId?: string | null
  avatarUrl?: string | null
  activityType?: string | null
}

export async function getLatestNotificationBanner(
  kind?: NotificationLiveSurfaceKind,
): Promise<NotificationBannerInput | null> {
  const { getNotificationLiveSurfaces } = await import('./notificationLiveSurfaceRepository')
  const surfaces = await getNotificationLiveSurfaces(kind ? 5 : 1)
  const surface = kind
    ? surfaces.find((candidate) => candidate.kind === kind)
    : surfaces[0]
  return surface ? notificationLiveSurfaceToBanner(surface) : null
}

export function notificationLiveSurfaceToBanner(
  surface: NotificationLiveSurfaceRecord,
): NotificationBannerInput {
  const actorName = surface.actor_display_name || surface.body
  return {
    kind: surface.kind,
    title: surface.title,
    body: actorName,
    headline: surface.kind === 'friend_request' ? `${actorName} added you` : actorName,
    actorName,
    subtitle: surface.body || surface.title,
    route: surface.route,
    matchId: surface.match_id,
    inviteId: surface.invite_id,
    requesterId: surface.kind === 'friend_request' ? surface.actor_user_id : null,
    avatarUrl: surface.actor_avatar_url,
    activityType: surface.activity_type,
  }
}
