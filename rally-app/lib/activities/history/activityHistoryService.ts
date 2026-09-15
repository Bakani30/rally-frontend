import {
  getActivityHistoryRecord,
  listActivityHistoryRecord,
} from './activityHistoryRepository'

export function listActivityHistory(userId: string) {
  return listActivityHistoryRecord(userId)
}

export function getActivityHistory(activitySessionId: string) {
  return getActivityHistoryRecord(activitySessionId)
}
