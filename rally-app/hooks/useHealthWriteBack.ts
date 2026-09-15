import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ActivityHistoryItem } from '@/lib/activities/history/activityHistoryTypes'
import { saveRunToHealth } from '@/lib/run-tracking/health-writeback/healthWriteBackService'
import { asyncStorageHealthWriteBackStore } from '@/lib/run-tracking/health-writeback/healthWriteBackStore'
import {
  getNativeHealthWriteBackPlatform,
  nativeHealthWriteBackWriter,
} from '@/lib/run-tracking/health-writeback/healthWriteBackNative'
import type { HealthWriteBackRecord } from '@/lib/run-tracking/health-writeback/healthWriteBackTypes'
import { buildSaveRunToHealthInputFromActivity } from '@/lib/run-tracking/health-writeback/healthWriteBackMapper'
import { requestHealthWritePermissions } from '@/lib/run-tracking/permissions/healthPermissions'

export function useHealthWriteBack(activity: ActivityHistoryItem | null | undefined) {
  const platform = getNativeHealthWriteBackPlatform()
  const input = useMemo(() => buildSaveRunToHealthInputFromActivity(activity), [activity])
  const [status, setStatus] = useState<HealthWriteBackRecord | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let alive = true
    if (!input) {
      setStatus(null)
      setIsLoadingStatus(false)
      return () => {
        alive = false
      }
    }

    setIsLoadingStatus(true)
    asyncStorageHealthWriteBackStore.getStatus(input.activitySessionId)
      .then((record) => {
        if (alive) setStatus(record)
      })
      .catch(() => {
        if (alive) setStatus(null)
      })
      .finally(() => {
        if (alive) setIsLoadingStatus(false)
      })

    return () => {
      alive = false
    }
  }, [input])

  const save = useCallback(async () => {
    if (!input || !platform) return null
    const pending: HealthWriteBackRecord = {
      activitySessionId: input.activitySessionId,
      status: 'pending',
      platform,
      recordId: status?.recordId ?? null,
      errorMessage: null,
      updatedAt: new Date().toISOString(),
    }
    setStatus(pending)
    setIsSaving(true)
    try {
      const result = await saveRunToHealth(input, {
        platform,
        store: asyncStorageHealthWriteBackStore,
        requestPermission: requestHealthWritePermissions,
        writer: nativeHealthWriteBackWriter,
      })
      setStatus(result)
      return result
    } finally {
      setIsSaving(false)
    }
  }, [input, platform, status?.recordId])

  return {
    canWriteBack: Boolean(input && platform),
    targetName: platform === 'ios' ? 'Apple Health' : platform === 'android' ? 'Health Connect' : 'health store',
    status,
    isLoadingStatus,
    isSaving,
    save,
  }
}
