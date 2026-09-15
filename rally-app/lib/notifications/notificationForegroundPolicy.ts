export type NotificationForegroundPresentation = {
  shouldShowBanner: boolean
  shouldShowList: boolean
  shouldPlaySound: boolean
  shouldSetBadge: boolean
}

export const BACKGROUND_ONLY_NOTIFICATION_TYPES = new Set([
  'match_invited',
  'friend_request',
  'match_reminder',
  'match_submitted',
  'match_disputed',
  'challenge_published',
  'team_result_ready',
])

export const SUPPRESSED_NOTIFICATION_TYPES = new Set([
  'match_accepted',
  'match_confirmed',
  'match_declined',
  'team_result_revised',
  'match_cancelled',
  'match_cancel_requested',
])

const QUIET_LIST_PRESENTATION: NotificationForegroundPresentation = {
  shouldShowBanner: false,
  shouldShowList: true,
  shouldPlaySound: false,
  shouldSetBadge: false,
}

const SUPPRESSED_PRESENTATION: NotificationForegroundPresentation = {
  shouldShowBanner: false,
  shouldShowList: false,
  shouldPlaySound: false,
  shouldSetBadge: false,
}

const DEFAULT_PRESENTATION: NotificationForegroundPresentation = {
  shouldShowBanner: true,
  shouldShowList: true,
  shouldPlaySound: true,
  shouldSetBadge: false,
}

export function resolveForegroundNotificationPresentation(
  notificationType: unknown,
): NotificationForegroundPresentation {
  if (typeof notificationType !== 'string') return DEFAULT_PRESENTATION
  if (SUPPRESSED_NOTIFICATION_TYPES.has(notificationType)) return SUPPRESSED_PRESENTATION
  if (BACKGROUND_ONLY_NOTIFICATION_TYPES.has(notificationType)) return QUIET_LIST_PRESENTATION
  return DEFAULT_PRESENTATION
}
