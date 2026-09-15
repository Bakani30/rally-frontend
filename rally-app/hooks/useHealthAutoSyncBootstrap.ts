import { useCallback, useEffect, useRef } from 'react'
import { AppState, Platform } from 'react-native'
import { runHealthAutoSyncBootstrap } from '@/lib/run-tracking/sources/healthAutoSyncService'

export function useHealthAutoSyncBootstrap(input: {
  userId: string | undefined
  enabled?: boolean
}): void {
  const userId = input.userId
  const enabled = input.enabled !== false
  const inFlightRef = useRef(false)

  const runOnce = useCallback(async () => {
    if (!enabled || !userId) return
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      await runHealthAutoSyncBootstrap(userId)
    } catch (error) {
      console.warn('[health] auto sync bootstrap failed', error)
    } finally {
      inFlightRef.current = false
    }
  }, [enabled, userId])

  useEffect(() => {
    void runOnce()

    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void runOnce()
    })

    return () => {
      subscription.remove()
    }
  }, [runOnce])
}
