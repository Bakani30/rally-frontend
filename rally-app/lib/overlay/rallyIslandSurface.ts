export type RallyIslandSurfaceType = 'match_invite' | 'friend_request' | 'live_run'

export type RallyIslandPresentation = 'compact' | 'expanded'

export type RallyIslandActionType =
  | 'open'
  | 'expand_in_app'
  | 'accept_invite'
  | 'decline_invite'
  | 'accept_friend_request'
  | 'dismiss_friend_request'
  | 'dismiss'
  | 'pause_run'
  | 'resume_run'
  | 'end_run'

export type RallyIslandActionStyle = 'primary' | 'secondary' | 'destructive'

export type RallyIslandAction = {
  type: RallyIslandActionType
  label: string
  style?: RallyIslandActionStyle
  route?: string
  url?: string
  matchId?: string | null
  inviteId?: string | null
  requesterId?: string | null
  stake?: number | null
}

export type RallyIslandMetric = {
  label: string
  value: string
}

export type RallyIslandSurface = {
  key: string
  surfaceType: RallyIslandSurfaceType
  presentation?: RallyIslandPresentation
  eyebrow: string
  title: string
  headline?: string | null
  actorName?: string | null
  subtitle?: string | null
  body: string
  compactTitle?: string
  compactBody?: string
  expandedTitle?: string
  expandedSubtitle?: string
  accentColor: string
  iconName: string
  activityType?: string | null
  avatarUrl?: string | null
  route: string
  statusLabel?: string | null
  primaryMetric?: RallyIslandMetric | null
  secondaryMetric?: RallyIslandMetric | null
  progress?: number | null
  /**
   * Run-surface extras consumed by the iOS Live Activity card and Dynamic
   * Island (docs/design/2026-07-21-run-live-activity-redesign.md). Optional so
   * non-run surfaces are unaffected.
   */
  runState?: 'active' | 'paused' | 'finished' | null
  /** Distance hero, split so the unit can be de-emphasised: "8.34" + "km". */
  distanceValue?: string | null
  distanceUnit?: string | null
  /** Event/route name, or the free-run stand-in for that row. */
  contextLabel?: string | null
  /**
   * A progress bar needs a denominator, so both stay null for a free run and
   * the surface renders no bar rather than an empty one.
   */
  progressLabel?: string | null
  progressFraction?: number | null
  expiresAt?: string | null
  autoDismissMs?: number
  primaryAction?: RallyIslandAction | null
  secondaryAction?: RallyIslandAction | null
  accessibilityLabel: string
}

export type RallyIslandHost =
  | 'system_live_activity'
  | 'system_notification'
  | 'system_capsule_app_expand'
  | 'react_fallback'
  | 'none'

export type RallyIslandPlatform = 'ios' | 'android' | 'web' | 'unknown'

export type AndroidSystemSurfaceCapabilityTier =
  | 'capsule_capable'
  | 'display_only_capsule'
  | 'standard_notification'
  | 'react_fallback'

export type RallyIslandHostDecisionReason =
  | 'no_surface'
  | 'ios_activitykit'
  | 'ios_actionable_notification'
  | 'android_system_notification'
  | 'android_system_capsule_app_expand'
  | 'foreground_react_fallback'
  | 'background_without_system_surface'

export type RallyIslandHostDecision = {
  host: RallyIslandHost
  reason: RallyIslandHostDecisionReason
  usesSystemSurface: boolean
  shouldRenderReactFallback: boolean
}

export type RallyIslandHostInput = {
  hasSurface: boolean
  surfaceType?: RallyIslandSurfaceType | null
  appState: 'active' | 'inactive' | 'background' | 'unknown' | string
  platform: RallyIslandPlatform | string
  systemLiveActivityAvailable: boolean
  systemNotificationAvailable: boolean
  systemSurfaceInteractionAvailable: boolean
  androidSystemSurfaceCapabilityTier?: AndroidSystemSurfaceCapabilityTier | null
  notificationPermissionGranted: boolean
  androidOverlayPermissionGranted?: boolean
  reactFallbackEnabled?: boolean
}

export type AndroidOverlayActionPayload = {
  type: RallyIslandActionType
  label: string
  style: RallyIslandActionStyle
  url?: string
}

export type AndroidOverlaySurface = {
  kind: 'notification' | 'run'
  surfaceType: RallyIslandSurfaceType
  surfaceKey: string
  matchId?: string | null
  inviteId?: string | null
  requesterId?: string | null
  presentation: RallyIslandPresentation
  eyebrow: string
  title: string
  headline?: string | null
  actorName?: string | null
  subtitle?: string | null
  body: string
  compactTitle: string
  compactBody: string
  expandedTitle: string
  expandedSubtitle: string
  accentColor: string
  route: string
  iconName: string
  activityType?: string | null
  avatarUrl?: string | null
  statusLabel?: string | null
  primaryMetricLabel?: string
  primaryMetricValue?: string
  secondaryMetricLabel?: string
  secondaryMetricValue?: string
  progress?: number | null
  expiresAt?: string | null
  autoDismissMs?: number
  primaryAction?: AndroidOverlayActionPayload | null
  secondaryAction?: AndroidOverlayActionPayload | null
}

export type OverlayActionRouteParams = {
  action?: string | string[]
  surfaceType?: string | string[]
  route?: string | string[]
  surfaceKey?: string | string[]
  title?: string | string[]
  body?: string | string[]
  headline?: string | string[]
  actorName?: string | string[]
  subtitle?: string | string[]
  activityType?: string | string[]
  avatarUrl?: string | string[]
  matchId?: string | string[]
  inviteId?: string | string[]
  requesterId?: string | string[]
  stake?: string | string[]
}

export const OVERLAY_ACTION_PATH = '/overlay-action'
export const OVERLAY_ACTION_URL = 'rallyapp:///overlay-action'

export function selectRallyIslandHost(input: RallyIslandHostInput): RallyIslandHost {
  return selectRallyIslandHostDecision(input).host
}

export function selectRallyIslandHostDecision(
  input: RallyIslandHostInput,
): RallyIslandHostDecision {
  if (!input.hasSurface) {
    return {
      host: 'none',
      reason: 'no_surface',
      usesSystemSurface: false,
      shouldRenderReactFallback: false,
    }
  }
  const surfaceType = input.surfaceType ?? null
  const platform = normalizePlatform(input.platform)
  const canUseNotification =
    input.systemNotificationAvailable && input.notificationPermissionGranted
  const foregroundish = isForegroundish(input.appState)

  if (
    platform === 'ios' &&
    input.systemLiveActivityAvailable &&
    (surfaceType === 'match_invite' || surfaceType === 'live_run')
  ) {
    return systemDecision('system_live_activity', 'ios_activitykit')
  }

  if (
    platform === 'ios' &&
    surfaceType === 'friend_request' &&
    canUseNotification
  ) {
    return systemDecision('system_notification', 'ios_actionable_notification')
  }

  if (
    platform === 'android' &&
    canUseNotification
  ) {
    const tier = normalizeAndroidCapabilityTier(input)
    if (tier === 'capsule_capable') {
      return systemDecision('system_notification', 'android_system_notification')
    }
    if (tier === 'display_only_capsule') {
      return systemDecision(
        'system_capsule_app_expand',
        'android_system_capsule_app_expand',
      )
    }
    if (tier === 'standard_notification' && !foregroundish) {
      return systemDecision('system_notification', 'android_system_notification')
    }
  }

  if (foregroundish && input.reactFallbackEnabled !== false) {
    return {
      host: 'react_fallback',
      reason: 'foreground_react_fallback',
      usesSystemSurface: false,
      shouldRenderReactFallback: true,
    }
  }

  return {
    host: 'none',
    reason: 'background_without_system_surface',
    usesSystemSurface: false,
    shouldRenderReactFallback: false,
  }
}

export function toAndroidOverlaySurface(surface: RallyIslandSurface): AndroidOverlaySurface {
  return {
    kind: surface.surfaceType === 'live_run' ? 'run' : 'notification',
    surfaceType: surface.surfaceType,
    surfaceKey: surface.key,
    matchId: surface.primaryAction?.matchId ?? surface.secondaryAction?.matchId ?? null,
    inviteId: surface.primaryAction?.inviteId ?? surface.secondaryAction?.inviteId ?? null,
    requesterId: surface.primaryAction?.requesterId ?? surface.secondaryAction?.requesterId ?? null,
    presentation: 'compact',
    eyebrow: surface.eyebrow,
    title: surface.title,
    headline: surface.headline ?? surface.expandedTitle ?? surface.title,
    actorName: surface.actorName ?? surface.title,
    subtitle: surface.subtitle ?? surface.expandedSubtitle ?? surface.body,
    body: surface.body,
    compactTitle: surface.compactTitle ?? surface.title,
    compactBody: surface.compactBody ?? surface.body,
    expandedTitle: surface.expandedTitle ?? surface.title,
    expandedSubtitle: surface.expandedSubtitle ?? surface.subtitle ?? surface.body,
    accentColor: surface.accentColor,
    route: surface.route,
    iconName: surface.iconName,
    activityType: surface.activityType ?? null,
    avatarUrl: surface.avatarUrl ?? null,
    statusLabel: surface.statusLabel ?? null,
    primaryMetricLabel: surface.primaryMetric?.label,
    primaryMetricValue: surface.primaryMetric?.value,
    secondaryMetricLabel: surface.secondaryMetric?.label,
    secondaryMetricValue: surface.secondaryMetric?.value,
    progress: surface.progress ?? null,
    expiresAt: surface.expiresAt ?? null,
    autoDismissMs: surface.autoDismissMs,
    primaryAction: toAndroidOverlayAction(surface.primaryAction, surface),
    secondaryAction: toAndroidOverlayAction(surface.secondaryAction, surface),
  }
}

function normalizePlatform(platform: RallyIslandHostInput['platform']): RallyIslandPlatform {
  if (platform === 'ios' || platform === 'android' || platform === 'web') return platform
  return 'unknown'
}

function normalizeAndroidCapabilityTier(
  input: RallyIslandHostInput,
): AndroidSystemSurfaceCapabilityTier {
  const tier = input.androidSystemSurfaceCapabilityTier
  if (
    tier === 'capsule_capable' ||
    tier === 'display_only_capsule' ||
    tier === 'standard_notification' ||
    tier === 'react_fallback'
  ) {
    return tier
  }
  return input.systemSurfaceInteractionAvailable
    ? 'capsule_capable'
    : 'display_only_capsule'
}

function isForegroundish(appState: RallyIslandHostInput['appState']): boolean {
  return appState === 'active' || appState === 'inactive'
}

function systemDecision(
  host: Extract<
    RallyIslandHost,
    'system_live_activity' | 'system_notification' | 'system_capsule_app_expand'
  >,
  reason: RallyIslandHostDecisionReason,
): RallyIslandHostDecision {
  return {
    host,
    reason,
    usesSystemSurface: true,
    shouldRenderReactFallback: false,
  }
}

export function normalizeOverlayAction(value: unknown): RallyIslandActionType | null {
  if (
    value === 'open' ||
    value === 'expand_in_app' ||
    value === 'accept_invite' ||
    value === 'decline_invite' ||
    value === 'accept_friend_request' ||
    value === 'dismiss_friend_request' ||
    value === 'dismiss' ||
    value === 'pause_run' ||
    value === 'resume_run' ||
    value === 'end_run'
  ) {
    return value
  }
  return null
}

export function getFirstRouteParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0]?.trim() || null
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

export function routeToNativeUrl(route: string): string {
  if (route.startsWith('rallyapp://')) return route
  return `rallyapp:///${route.replace(/^\/+/, '')}`
}

export function nativeUrlToRoute(url: string): string {
  if (!url.startsWith('rallyapp://')) return url.startsWith('/') ? url : `/${url}`
  const parsed = new URL(url)
  const path = parsed.hostname
    ? `/${parsed.hostname}${parsed.pathname}`
    : parsed.pathname || '/'
  return `${path}${parsed.search}`
}

export function createOverlayActionUrl(
  action: RallyIslandAction,
  surface: RallyIslandSurface,
): string | undefined {
  if (action.type === 'dismiss' || action.type === 'dismiss_friend_request') return undefined

  const params = new URLSearchParams()
  params.set('action', action.type)
  params.set('surfaceType', surface.surfaceType)
  params.set('surfaceKey', surface.key)
  params.set('route', action.route ?? surface.route)
  const headline = surface.headline ?? surface.expandedTitle ?? surface.title
  const actorName = surface.actorName ?? surface.title
  const subtitle = surface.subtitle ?? surface.expandedSubtitle ?? surface.body
  params.set('title', surface.title)
  params.set('body', subtitle)
  params.set('headline', headline)
  params.set('actorName', actorName)
  params.set('subtitle', subtitle)
  if (surface.avatarUrl) params.set('avatarUrl', surface.avatarUrl)
  const activityType = surface.activityType ?? null
  if (activityType) params.set('activityType', activityType)

  const matchId = action.matchId ?? null
  if (matchId) params.set('matchId', matchId)
  const inviteId = action.inviteId ?? null
  if (inviteId) params.set('inviteId', inviteId)
  const requesterId = action.requesterId ?? null
  if (requesterId) params.set('requesterId', requesterId)
  if (typeof action.stake === 'number' && Number.isFinite(action.stake)) {
    params.set('stake', String(action.stake))
  }

  return `${OVERLAY_ACTION_URL}?${params.toString()}`
}

function toAndroidOverlayAction(
  action: RallyIslandAction | null | undefined,
  surface: RallyIslandSurface,
): AndroidOverlayActionPayload | null {
  if (!action) return null
  return {
    type: action.type,
    label: action.label,
    style: action.style ?? (action.type === 'decline_invite' ? 'destructive' : 'secondary'),
    url: action.url ?? createOverlayActionUrl(action, surface),
  }
}
