import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { useAnalytics } from '@/hooks/useAnalytics'
import {
  countPendingUpload,
  discardSession,
  listFailedSessions,
  resetSessionForRetry,
} from '@/lib/run-tracking/offline/sessionBuffer'
import {
  loadRunSyncStatus,
  type RunSyncStatus,
} from '@/lib/run-tracking/offline/runSyncStatus'
import { subscribeRunSyncChanged } from '@/lib/run-tracking/offline/runSyncEvents'

/**
 * Visible sync-status bridge for the offline buffer. Exposes how many runs are
 * still waiting to upload and which have been dead-lettered, plus the two
 * recovery actions (manual retry / discard).
 *
 * Refreshes on mount, on foreground resume, and on the same 5-minute cadence as
 * the retry queue so a run that dead-letters mid-session appears without a
 * manual reload. All data-access lives in the buffer; this hook only relays.
 */
const REFRESH_INTERVAL_MS = 5 * 60_000

const EMPTY_STATUS: RunSyncStatus = { pendingCount: 0, failedSessions: [] }

export type UseRunSyncStatusResult = RunSyncStatus & {
  refresh: () => Promise<void>
  retry: (sessionId: string, lastErrorCode?: string | null) => Promise<void>
  discard: (sessionId: string) => Promise<void>
}

export function useRunSyncStatus(): UseRunSyncStatusResult {
  const { track } = useAnalytics()
  const [status, setStatus] = useState<RunSyncStatus>(EMPTY_STATUS)

  const refresh = useCallback(async () => {
    try {
      const next = await loadRunSyncStatus({ countPendingUpload, listFailedSessions })
      setStatus(next)
    } catch (error) {
      console.warn('failed to load run sync status', error)
    }
  }, [])

  const retry = useCallback(
    async (sessionId: string, lastErrorCode?: string | null) => {
      track({
        name: 'run_sync_manual_retry',
        properties: lastErrorCode ? { code: lastErrorCode } : undefined,
      })
      await resetSessionForRetry(sessionId)
      await refresh()
    },
    [refresh, track],
  )

  const discard = useCallback(
    async (sessionId: string) => {
      await discardSession(sessionId)
      await refresh()
    },
    [refresh],
  )

  useEffect(() => {
    void refresh()

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh()
    })
    // The retry queue runs in parallel at app root; refresh the moment a pass
    // uploads/dead-letters a run so the pill never shows a stale pending count.
    const unsubscribeSyncChanged = subscribeRunSyncChanged(() => {
      void refresh()
    })
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void refresh()
    }, REFRESH_INTERVAL_MS)

    return () => {
      subscription.remove()
      unsubscribeSyncChanged()
      clearInterval(timer)
    }
  }, [refresh])

  return { ...status, refresh, retry, discard }
}
