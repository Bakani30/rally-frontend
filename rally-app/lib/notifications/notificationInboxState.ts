import storage from '@/lib/storage'

export {
  hasUnreadNotificationAction,
  latestNotificationActionAt,
} from './notificationInboxRules'

const KEY_PREFIX = 'rally.notifications.openedAt'

function openedAtKey(userId: string) {
  return `${KEY_PREFIX}.${userId}`
}

export async function getNotificationsOpenedAt(userId: string): Promise<string | null> {
  const value = await storage.getItem(openedAtKey(userId))
  return isValidIsoDate(value) ? value : null
}

export async function markNotificationsOpened(
  userId: string,
  openedAt = new Date(),
): Promise<string> {
  const value = openedAt.toISOString()
  await storage.setItem(openedAtKey(userId), value)
  return value
}

function isValidIsoDate(value: string | null): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}
