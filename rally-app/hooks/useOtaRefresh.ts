import { useCallback, useRef, useState } from 'react'

import {
  applyDownloadedOtaUpdate,
  fetchOtaUpdateIfAvailable,
} from '@/lib/updates/otaUpdateService'
import { useRunSessionStore } from '@/lib/run-tracking/session/runSessionStore'

/**
 * User-initiated OTA update flow for pull-to-refresh surfaces.
 *
 * checkForOtaUpdate() is meant to ride along with the screen's regular
 * refetches; when it finds and downloads a new bundle, `updateReady` flips
 * and the screen shows an apply banner. Applying reloads the JS bundle
 * immediately, so it is blocked while a run session is live — losing an
 * in-progress GPS run to an update prompt is never acceptable.
 */
export function useOtaRefresh() {
  const [updateReady, setUpdateReady] = useState(false)
  const [applying, setApplying] = useState(false)
  const runStatus = useRunSessionStore((state) => state.status)
  const checkingRef = useRef(false)

  const checkForOtaUpdate = useCallback(async (): Promise<void> => {
    if (checkingRef.current) return
    checkingRef.current = true
    try {
      const result = await fetchOtaUpdateIfAvailable()
      if (result === 'update_ready') setUpdateReady(true)
    } finally {
      checkingRef.current = false
    }
  }, [])

  const runSessionLive = runStatus !== 'idle'

  const applyUpdate = useCallback(async (): Promise<void> => {
    if (runSessionLive) return
    setApplying(true)
    try {
      await applyDownloadedOtaUpdate()
    } catch {
      // Reload failed (rare) — next cold start still applies the update.
      setApplying(false)
    }
  }, [runSessionLive])

  return { updateReady, applying, runSessionLive, checkForOtaUpdate, applyUpdate }
}
