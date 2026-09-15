import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { useAnalytics } from '@/hooks/useAnalytics'
import {
  markBatteryOptEducated,
  shouldShowBatteryOptModal,
} from '@/lib/run-tracking/batteryOptEducation'
import {
  isBatteryOptimizationEnabled,
  openNoRestrictionsSettings,
} from '@/lib/permissions/batteryOptimization'

export type UseBatteryOptPromptResult = {
  visible: boolean
  /** Open the OS battery-optimization surface so the user can pick "No restrictions". */
  requestNoRestrictions: () => Promise<void>
  /** "เข้าใจแล้ว" — persist the dismissal and hide. */
  dismiss: () => Promise<void>
}

/**
 * Owns the battery "No restrictions" prompt lifecycle for the run screen:
 * decides visibility (real optimization state > OEM heuristic), routes the
 * user to the OS surface, and re-checks on app foreground so the modal closes
 * itself once the user actually granted the exemption in Settings.
 */
export function useBatteryOptPrompt(options: { enabled: boolean }): UseBatteryOptPromptResult {
  const { enabled } = options
  const [visible, setVisible] = useState(false)
  const { track } = useAnalytics()
  // Latches once the user opened the OS surface — the foreground re-check
  // only runs after that, so an unrelated backgrounding doesn't touch state.
  const requestedRef = useRef(false)

  useEffect(() => {
    if (!enabled) return
    let active = true
    shouldShowBatteryOptModal().then((should) => {
      if (active && should) setVisible(true)
    })
    return () => {
      active = false
    }
  }, [enabled])

  const requestNoRestrictions = useCallback(async () => {
    requestedRef.current = true
    track({ name: 'run_battery_opt_open_settings' })
    await openNoRestrictionsSettings()
  }, [track])

  const dismiss = useCallback(async () => {
    await markBatteryOptEducated()
    setVisible(false)
  }, [])

  // Returning from the OS surface: if the exemption is now granted, mark
  // educated and close without another tap.
  useEffect(() => {
    if (!visible) return
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !requestedRef.current) return
      isBatteryOptimizationEnabled().then((stillEnabled) => {
        if (stillEnabled === false) {
          track({ name: 'run_battery_opt_granted' })
          void markBatteryOptEducated()
          setVisible(false)
        }
      })
    })
    return () => subscription.remove()
  }, [visible, track])

  return { visible, requestNoRestrictions, dismiss }
}
