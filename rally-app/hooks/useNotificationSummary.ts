import { useQuery } from '@tanstack/react-query'

import {
  getNotificationsOpenedAt,
  hasUnreadNotificationAction,
} from '@/lib/notifications/notificationInboxState'
import { getNotificationActionSummary } from '@/lib/notifications/notificationSummaryService'
import {
  emptyNotificationActionSummary,
  notificationSummaryQueryKey,
} from '@/lib/notifications/notificationSummary'

function openedAtQueryKey(userId: string | undefined) {
  return ['notifications', 'opened-at', userId] as const
}

export function useNotificationSummary(userId: string | undefined) {
  const summaryQuery = useQuery({
    queryKey: notificationSummaryQueryKey(userId),
    queryFn: getNotificationActionSummary,
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  const openedAtQuery = useQuery({
    queryKey: openedAtQueryKey(userId),
    queryFn: () => getNotificationsOpenedAt(userId!),
    enabled: !!userId,
    staleTime: Infinity,
  })

  const summary = summaryQuery.data ?? emptyNotificationActionSummary
  return {
    ...summary,
    hasUnread: hasUnreadNotificationAction(summary.latestActionAt, openedAtQuery.data ?? null),
    isPending: summaryQuery.isPending || openedAtQuery.isPending,
  }
}
