import AsyncStorage from '@react-native-async-storage/async-storage'
import type { HealthWriteBackRecord, HealthWriteBackStore } from './healthWriteBackTypes'

const STORAGE_PREFIX = '@rally/run-tracking/health-write-back'

export const asyncStorageHealthWriteBackStore: HealthWriteBackStore = {
  async getStatus(activitySessionId) {
    const raw = await AsyncStorage.getItem(storageKey(activitySessionId))
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as Partial<HealthWriteBackRecord>
      return isHealthWriteBackRecord(parsed) ? parsed : null
    } catch {
      return null
    }
  },
  async setStatus(record) {
    await AsyncStorage.setItem(storageKey(record.activitySessionId), JSON.stringify(record))
  },
}

function storageKey(activitySessionId: string): string {
  return `${STORAGE_PREFIX}:${activitySessionId}`
}

function isHealthWriteBackRecord(value: Partial<HealthWriteBackRecord>): value is HealthWriteBackRecord {
  return (
    typeof value.activitySessionId === 'string' &&
    (
      value.status === 'not_requested' ||
      value.status === 'pending' ||
      value.status === 'saved' ||
      value.status === 'skipped' ||
      value.status === 'failed'
    ) &&
    (value.platform === 'ios' || value.platform === 'android' || value.platform === null) &&
    (typeof value.recordId === 'string' || value.recordId === null) &&
    (typeof value.errorMessage === 'string' || value.errorMessage === null) &&
    typeof value.updatedAt === 'string'
  )
}
