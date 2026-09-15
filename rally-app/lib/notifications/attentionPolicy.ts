export type AttentionLevel = 'blocking' | 'urgent' | 'ambient' | 'inline' | 'silent'

export type AttentionSurface =
  | 'rally_island'
  | 'system_notification'
  | 'inbox'
  | 'inline'
  | 'alert'
  | 'none'

export type NotificationAttentionEvent = {
  type: string
  route?: string | null
  matchId?: string | null
  inviteId?: string | null
  requesterId?: string | null
}

export type AttentionContext = {
  appState?: string | null
  currentRoute?: string | null
}

export type AttentionDecision = {
  level: AttentionLevel
  surface: AttentionSurface
  priority: number
  dedupeKey: string
  ttlMs: number | null
  targetRoute: string | null
  suppressReason?: 'target_route_active' | 'lifecycle_noise'
}

type AttentionProfile = {
  level: Exclude<AttentionLevel, 'inline' | 'silent'>
  priority: number
  ttlMs: number | null
  foregroundSurface: AttentionSurface
  backgroundSurface: AttentionSurface
  defaultRoute: string | null
}

const ACTIONABLE_PROFILES: Record<string, AttentionProfile> = {
  match_invited: {
    level: 'urgent',
    priority: 90,
    ttlMs: 45_000,
    foregroundSurface: 'rally_island',
    backgroundSurface: 'system_notification',
    defaultRoute: '/notifications',
  },
  team_result_ready: {
    level: 'urgent',
    priority: 80,
    ttlMs: 30_000,
    foregroundSurface: 'rally_island',
    backgroundSurface: 'system_notification',
    defaultRoute: '/notifications',
  },
  match_submitted: {
    level: 'urgent',
    priority: 75,
    ttlMs: 30_000,
    foregroundSurface: 'rally_island',
    backgroundSurface: 'system_notification',
    defaultRoute: '/notifications',
  },
  match_disputed: {
    level: 'urgent',
    priority: 75,
    ttlMs: 30_000,
    foregroundSurface: 'rally_island',
    backgroundSurface: 'system_notification',
    defaultRoute: '/notifications',
  },
  friend_request: {
    level: 'urgent',
    priority: 60,
    ttlMs: 30_000,
    foregroundSurface: 'rally_island',
    backgroundSurface: 'system_notification',
    defaultRoute: '/friends',
  },
  match_reminder: {
    level: 'ambient',
    priority: 45,
    ttlMs: null,
    foregroundSurface: 'inbox',
    backgroundSurface: 'system_notification',
    defaultRoute: '/notifications',
  },
  challenge_published: {
    level: 'ambient',
    priority: 30,
    ttlMs: null,
    foregroundSurface: 'inbox',
    backgroundSurface: 'system_notification',
    defaultRoute: '/quests',
  },
}

const SUPPRESSED_TYPES = new Set([
  'match_accepted',
  'match_confirmed',
  'match_declined',
  'team_result_revised',
  'match_cancelled',
  'match_cancel_requested',
])

export function resolveAttentionDecision(
  event: NotificationAttentionEvent,
  context: AttentionContext = {},
): AttentionDecision {
  const targetRoute = event.route ?? ACTIONABLE_PROFILES[event.type]?.defaultRoute ?? null
  const dedupeKey = notificationDedupeKey(event)

  if (SUPPRESSED_TYPES.has(event.type)) {
    return {
      level: 'silent',
      surface: 'none',
      priority: 0,
      dedupeKey,
      ttlMs: null,
      targetRoute,
      suppressReason: 'lifecycle_noise',
    }
  }

  const profile = ACTIONABLE_PROFILES[event.type] ?? {
    level: 'ambient',
    priority: 20,
    ttlMs: null,
    foregroundSurface: 'inbox',
    backgroundSurface: 'system_notification',
    defaultRoute: null,
  }

  if (isForegroundish(context.appState) && routeMatchesTarget(context.currentRoute, targetRoute)) {
    return {
      level: 'inline',
      surface: 'inline',
      priority: profile.priority,
      dedupeKey,
      ttlMs: profile.ttlMs,
      targetRoute,
      suppressReason: 'target_route_active',
    }
  }

  return {
    level: profile.level,
    surface: isForegroundish(context.appState) ? profile.foregroundSurface : profile.backgroundSurface,
    priority: profile.priority,
    dedupeKey,
    ttlMs: profile.ttlMs,
    targetRoute,
  }
}

export function routeFromSegments(segments: readonly string[]): string {
  const visibleSegments = segments.filter((segment) => segment.length > 0)
  if (visibleSegments.length === 0) return '/'
  return `/${visibleSegments.join('/')}`
}

function notificationDedupeKey(event: NotificationAttentionEvent): string {
  if (event.inviteId) return `${event.type}:${event.inviteId}`
  if (event.requesterId) return `${event.type}:${event.requesterId}`
  if (event.matchId) return `${event.type}:${event.matchId}`
  if (event.route) return `${event.type}:${event.route}`
  return event.type
}

function isForegroundish(appState: string | null | undefined): boolean {
  return appState === undefined || appState === null || appState === 'active' || appState === 'inactive'
}

function routeMatchesTarget(currentRoute: string | null | undefined, targetRoute: string | null): boolean {
  if (!currentRoute || !targetRoute) return false
  const current = normalizeRoute(currentRoute)
  const target = normalizeRoute(targetRoute)
  if (current === target) return true
  if (target !== '/' && current.startsWith(`${target}/`)) return true
  return false
}

function normalizeRoute(route: string): string {
  const path = route.split('?')[0]?.replace(/\/+$/, '') ?? '/'
  return path.length === 0 ? '/' : path
}
