import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { resolveForegroundNotificationPresentation } from './notificationForegroundPolicy'
import { resolveNotificationRoute } from './notificationPayload'
import type { NotificationResponse } from 'expo-notifications'

type ExpoNotifications = typeof import('expo-notifications')

export function shouldLoadExpoNotifications(
  platformOS: string,
  appOwnership: string | null | undefined,
): boolean {
  if (platformOS === 'web') return false
  if (platformOS === 'android' && appOwnership === 'expo') return false
  return true
}

async function loadNotifications(): Promise<ExpoNotifications | null> {
  if (!shouldLoadExpoNotifications(Platform.OS, Constants.appOwnership)) return null
  return import('expo-notifications')
}

// Foreground behaviour: keep Rally's own live surfaces unobstructed.
// (Setting this once is sufficient; calling multiple times overrides.)
export async function configureForegroundBehavior(): Promise<void> {
  const Notifications = await loadNotifications()
  if (!Notifications) return

  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = (notification.request.content.data ?? {}) as NotificationData
      return resolveForegroundNotificationPresentation(data.type)
    },
  })
}

type NotificationData = {
  type?: string
  matchId?: string | null
  match_id?: string | null
  inviteId?: string | null
  invite_id?: string | null
  rally_surface_match_id?: string | null
  rally_surface_invite_id?: string | null
  challengeId?: string | null
  challenge_id?: string | null
  eventId?: string
  url?: string
  route?: string
}

const handledResponseIds = new Set<string>()

function responseId(response: NotificationResponse) {
  return response.notification.request.identifier
}

function navigateFromData(data: NotificationData) {
  if (data.type === 'friend_request') {
    guardedRouter.push('/friends', { actionKey: 'notification:friends' })
    return
  }

  const route = resolveNotificationRoute(data)
  if (route.kind === 'match') {
    guardedRouter.push(`/match/${route.matchId}`, { actionKey: `notification:match:${route.matchId}` })
  } else if (route.kind === 'challenge') {
    guardedRouter.push(`/challenges/${route.challengeId}`, { actionKey: `notification:challenge:${route.challengeId}` })
  } else if (route.kind === 'notifications') {
    guardedRouter.push('/notifications', { actionKey: 'notification:inbox' })
  } else if (route.kind === 'referee') {
    guardedRouter.push('/referee', { actionKey: 'notification:referee' })
  }
}

function handleNotificationResponse(
  response: NotificationResponse | null,
) {
  if (!response) return
  const id = responseId(response)
  if (handledResponseIds.has(id)) return
  handledResponseIds.add(id)

  const data = (response.notification.request.content.data ?? {}) as NotificationData
  navigateFromData(data)
}

// Tap handler: route the user straight to the relevant detail screen.
// Returns the unsubscribe function so callers can clean up on unmount.
export async function attachNotificationTapHandler(): Promise<() => void> {
  const Notifications = await loadNotifications()
  if (!Notifications) return () => {}

  handleNotificationResponse(await Notifications.getLastNotificationResponseAsync())
  const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse)
  return () => sub.remove()
}
