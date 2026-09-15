import { useQuery } from '@tanstack/react-query'
import {
  getActivityHistory,
  listActivityHistory,
} from '@/lib/activities/history/activityHistoryService'

export function useActivityHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['activity-history', userId],
    queryFn: () => listActivityHistory(userId!),
    enabled: Boolean(userId),
  })
}

export function useActivityHistoryItem(activitySessionId: string | undefined) {
  return useQuery({
    queryKey: ['activity-history-item', activitySessionId],
    queryFn: () => getActivityHistory(activitySessionId!),
    enabled: Boolean(activitySessionId),
  })
}
