export type NotificationRoute =
  | { kind: 'match'; matchId: string }
  | { kind: 'challenge'; challengeId: string }
  | { kind: 'notifications' }
  | { kind: 'referee' }
  | { kind: 'none' }

export type MatchInviteNotificationIntent = {
  kind: 'match_invite'
  matchId: string
  inviteId: string | null
}

type NotificationPayload = {
  type?: unknown
  matchId?: unknown
  match_id?: unknown
  rally_surface_match_id?: unknown
  inviteId?: unknown
  invite_id?: unknown
  rally_surface_invite_id?: unknown
  challengeId?: unknown
  challenge_id?: unknown
  url?: unknown
  route?: unknown
  screen?: unknown
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function resolveNotificationRoute(data: NotificationPayload): NotificationRoute {
  if (data.type === 'match_invited' || data.type === 'match_invite') {
    return { kind: 'notifications' }
  }
  if (data.type === 'referee_assigned') {
    return { kind: 'referee' }
  }

  const directMatchId = firstString(data.matchId, data.match_id, data.rally_surface_match_id)
  if (directMatchId && UUID_RE.test(directMatchId)) {
    return { kind: 'match', matchId: directMatchId }
  }
  const directChallengeId = firstString(data.challengeId, data.challenge_id)
  if (directChallengeId && UUID_RE.test(directChallengeId)) {
    return { kind: 'challenge', challengeId: directChallengeId }
  }

  const route = firstString(data.route, data.url, data.screen)
  if (route) {
    const path = normalizeRoute(route)
    const matchId = path.match(/^\/match\/([^/?#]+)/)?.[1]
    if (matchId && UUID_RE.test(matchId)) {
      return { kind: 'match', matchId }
    }

    const challengeId = path.match(/^\/challenges\/([^/?#]+)/)?.[1]
    if (challengeId && UUID_RE.test(challengeId)) return { kind: 'challenge', challengeId }

    if (path === '/notifications') return { kind: 'notifications' }
    if (path === '/referee') return { kind: 'referee' }
  }
  return { kind: 'none' }
}

export function resolveMatchInviteNotificationIntent(
  data: NotificationPayload,
): MatchInviteNotificationIntent | null {
  void data
  return null
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }
  return null
}

function normalizeRoute(route: string): string {
  if (route.startsWith('rallyapp://')) {
    const parsed = new URL(route)
    return `/${parsed.hostname}${parsed.pathname}${parsed.search}`
  }
  if (route.startsWith('/')) return route
  return `/${route}`
}
