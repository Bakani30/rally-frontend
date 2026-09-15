export type LiveSurfaceKind = 'match_invite' | 'friend_request'

export type LiveSurfaceSnapshot = {
  kind: LiveSurfaceKind
  title: string
  headline: string
  subtitle: string
  actorUserId: string | null
  actorName: string
  actorAvatarUrl: string | null
  activityType: string | null
  matchId: string | null
  inviteId: string | null
  route: string
  expiresAt: string | null
}

export type LiveSurfaceInput = Partial<LiveSurfaceSnapshot> & {
  kind: LiveSurfaceKind
  actorName: string
}

export const LIVE_SURFACE_DATA_KEYS = {
  kind: 'rally_surface_kind',
  title: 'rally_surface_title',
  headline: 'rally_surface_headline',
  subtitle: 'rally_surface_subtitle',
  actorUserId: 'rally_surface_actor_user_id',
  actorName: 'rally_surface_actor_name',
  actorAvatarUrl: 'rally_surface_actor_avatar_url',
  activityType: 'rally_surface_activity_type',
  matchId: 'rally_surface_match_id',
  inviteId: 'rally_surface_invite_id',
  route: 'rally_surface_route',
  expiresAt: 'rally_surface_expires_at',
} as const

const DEFAULT_INVITE_TTL_MS = 10 * 60 * 1000

export function createLiveSurfaceSnapshot(input: LiveSurfaceInput): LiveSurfaceSnapshot {
  const matchId = cleanString(input.matchId)
  const inviteId = cleanString(input.inviteId)
  const activityType = cleanString(input.activityType)
  const actorName = input.actorName.trim() || 'เพื่อน'
  const defaultRoute = input.kind === 'match_invite'
    ? '/notifications'
    : input.kind === 'friend_request'
      ? '/friends'
      : '/notifications'

  return {
    kind: input.kind,
    title: cleanString(input.title) ?? defaultTitle(input.kind),
    headline: cleanString(input.headline) ?? defaultHeadline(input.kind, actorName),
    subtitle: cleanString(input.subtitle) ?? defaultSubtitle(input.kind, actorName, activityType),
    actorUserId: cleanString(input.actorUserId),
    actorName,
    actorAvatarUrl: cleanString(input.actorAvatarUrl),
    activityType,
    matchId,
    inviteId,
    route: cleanString(input.route) ?? defaultRoute,
    expiresAt: cleanString(input.expiresAt) ?? defaultExpiresAt(input.kind),
  }
}

export function liveSurfaceToNotificationData(
  snapshot: LiveSurfaceSnapshot,
): Record<string, string> {
  const entries: Record<string, string | null> = {
    [LIVE_SURFACE_DATA_KEYS.kind]: snapshot.kind,
    [LIVE_SURFACE_DATA_KEYS.title]: snapshot.title,
    [LIVE_SURFACE_DATA_KEYS.headline]: snapshot.headline,
    [LIVE_SURFACE_DATA_KEYS.subtitle]: snapshot.subtitle,
    [LIVE_SURFACE_DATA_KEYS.actorUserId]: snapshot.actorUserId,
    [LIVE_SURFACE_DATA_KEYS.actorName]: snapshot.actorName,
    [LIVE_SURFACE_DATA_KEYS.actorAvatarUrl]: snapshot.actorAvatarUrl,
    [LIVE_SURFACE_DATA_KEYS.activityType]: snapshot.activityType,
    [LIVE_SURFACE_DATA_KEYS.matchId]: snapshot.matchId,
    [LIVE_SURFACE_DATA_KEYS.inviteId]: snapshot.inviteId,
    [LIVE_SURFACE_DATA_KEYS.route]: snapshot.route,
    [LIVE_SURFACE_DATA_KEYS.expiresAt]: snapshot.expiresAt,
  }

  return Object.fromEntries(
    Object.entries(entries).filter((entry): entry is [string, string] => {
      const value = entry[1]
      return typeof value === 'string' && value.length > 0
    }),
  )
}

export function liveSurfaceFromNotificationData(
  data: Record<string, unknown>,
): LiveSurfaceSnapshot | null {
  const kind = parseKind(data[LIVE_SURFACE_DATA_KEYS.kind])
  if (!kind) return null

  const actorName = cleanString(data[LIVE_SURFACE_DATA_KEYS.actorName])
  if (!actorName) return null

  return createLiveSurfaceSnapshot({
    kind,
    title: cleanString(data[LIVE_SURFACE_DATA_KEYS.title]) ?? undefined,
    headline: cleanString(data[LIVE_SURFACE_DATA_KEYS.headline]) ?? undefined,
    subtitle: cleanString(data[LIVE_SURFACE_DATA_KEYS.subtitle]) ?? undefined,
    actorUserId: cleanString(data[LIVE_SURFACE_DATA_KEYS.actorUserId]),
    actorName,
    actorAvatarUrl: cleanString(data[LIVE_SURFACE_DATA_KEYS.actorAvatarUrl]),
    activityType: cleanString(data[LIVE_SURFACE_DATA_KEYS.activityType]),
    matchId: cleanString(data[LIVE_SURFACE_DATA_KEYS.matchId]),
    inviteId: cleanString(data[LIVE_SURFACE_DATA_KEYS.inviteId]),
    route: cleanString(data[LIVE_SURFACE_DATA_KEYS.route]) ?? undefined,
    expiresAt: cleanString(data[LIVE_SURFACE_DATA_KEYS.expiresAt]),
  })
}

function parseKind(value: unknown): LiveSurfaceKind | null {
  if (value === 'match_invite' || value === 'match_invited') return 'match_invite'
  if (value === 'friend_request') return 'friend_request'
  return null
}

function defaultTitle(kind: LiveSurfaceKind): string {
  return kind === 'match_invite' ? 'คำเชิญเข้า match' : 'คำขอเป็นเพื่อน'
}

function defaultHeadline(kind: LiveSurfaceKind, actorName: string): string {
  return kind === 'friend_request' ? `${actorName} added you` : actorName
}

function defaultSubtitle(
  kind: LiveSurfaceKind,
  actorName: string,
  activityType: string | null,
): string {
  if (kind === 'friend_request') return 'Open Rally to review the request'
  return `${actorName} invited you to ${formatActivity(activityType)}`
}

function formatActivity(activityType: string | null): string {
  switch (activityType) {
    case 'basketball':
      return 'Basketball'
    case 'badminton':
      return 'Badminton'
    case 'running':
      return 'Running'
    default:
      return 'Match'
  }
}

function defaultExpiresAt(kind: LiveSurfaceKind): string | null {
  if (kind !== 'match_invite') return null
  return new Date(Date.now() + DEFAULT_INVITE_TTL_MS).toISOString()
}

function cleanString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}
