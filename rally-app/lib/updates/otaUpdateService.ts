/**
 * Adapter around expo-updates for user-initiated OTA checks (pull-to-refresh
 * on Home). Launch-time checking stays on the expo-updates defaults (check on
 * load, apply next cold start) — this path exists so a user can pull a fix
 * without force-closing the app.
 *
 * expo-updates is loaded lazily inside each call: this module sits in Home's
 * startup import graph, and a module-scope failure there would crash the
 * bundle on launch — which expo-updates answers by silently rolling back to
 * the previous update, bricking OTA delivery for the device.
 *
 * `reloadAsync` restarts the JS bundle immediately, so callers must gate it
 * on app state (never during an active run — see useOtaRefresh).
 */

declare const __DEV__: boolean

export type OtaCheckResult = 'update_ready' | 'up_to_date' | 'unavailable' | 'failed'

/**
 * Check the update server and download any pending update for this runtime.
 * Returns 'update_ready' once the new bundle is on disk and can be applied
 * with {@link applyDownloadedOtaUpdate}. 'unavailable' in dev / Expo Go
 * builds where expo-updates is disabled.
 */
export async function fetchOtaUpdateIfAvailable(): Promise<OtaCheckResult> {
  if (__DEV__) return 'unavailable'
  try {
    const Updates = await import('expo-updates')
    if (!Updates.isEnabled) return 'unavailable'
    const check = await Updates.checkForUpdateAsync()
    if (!check.isAvailable) return 'up_to_date'
    const fetched = await Updates.fetchUpdateAsync()
    return fetched.isNew ? 'update_ready' : 'up_to_date'
  } catch {
    // Offline / update server unreachable — the regular launch-time check
    // will retry; a failed manual check must never break the refresh UX.
    return 'failed'
  }
}

/** Apply a downloaded update now — restarts the JS bundle in place. */
export async function applyDownloadedOtaUpdate(): Promise<void> {
  const Updates = await import('expo-updates')
  await Updates.reloadAsync()
}
