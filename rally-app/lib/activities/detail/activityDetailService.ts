import {
  getActivitySessionDetail,
  getLinkedMatchForActivity,
  type ActivityLinkedMatch,
} from './activityDetailRepository'
import type { ActivityHistoryItem } from '@/lib/activities/history/activityHistoryTypes'

export type { ActivityLinkedMatch }

export function getActivityDetail(id: string): Promise<ActivityHistoryItem | null> {
  return getActivitySessionDetail(id)
}

export function getLinkedMatch(id: string): Promise<ActivityLinkedMatch | null> {
  return getLinkedMatchForActivity(id)
}
