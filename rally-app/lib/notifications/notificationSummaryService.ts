import { getNotificationActionSummaryRecord } from './notificationSummaryRepository'
import type { NotificationActionSummary } from './notificationSummary'

export function getNotificationActionSummary(): Promise<NotificationActionSummary> {
  return getNotificationActionSummaryRecord()
}
