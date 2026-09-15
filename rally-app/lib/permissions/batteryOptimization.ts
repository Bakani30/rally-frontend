import { Linking, Platform } from 'react-native'
import { openAppSettings } from './appSettings'

/**
 * Android battery-optimization (Doze / OEM "restricted") adapter.
 *
 * When battery optimization is on, Android (and OEM skins like MIUI far more
 * aggressively) throttles or kills the GPS foreground service mid-run. The run
 * flow asks the user to grant "No restrictions" so fixes keep flowing.
 *
 * expo-battery is lazy-required (same rationale as gps/batteryPort.ts): the
 * module may be absent from an older installed binary, and the app must keep
 * booting on OTA-updated JS. Callers treat `null` as "cannot check".
 */

type BatteryModule = typeof import('expo-battery')
type IntentLauncherModule = typeof import('expo-intent-launcher')
type ApplicationModule = typeof import('expo-application')

function loadBatteryModule(): BatteryModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-battery') as BatteryModule
  } catch {
    return null
  }
}

function loadIntentLauncherModule(): IntentLauncherModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-intent-launcher') as IntentLauncherModule
  } catch {
    return null
  }
}

function loadApplicationModule(): ApplicationModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-application') as ApplicationModule
  } catch {
    return null
  }
}

/**
 * True when Android battery optimization currently applies to Rally, false
 * when the user already granted "No restrictions" / "Don't optimize", null
 * when the state can't be read (iOS, or binary without expo-battery).
 */
export async function isBatteryOptimizationEnabled(): Promise<boolean | null> {
  if (Platform.OS !== 'android') return null
  const mod = loadBatteryModule()
  if (!mod?.isBatteryOptimizationEnabledAsync) return null
  try {
    return await mod.isBatteryOptimizationEnabledAsync()
  } catch {
    return null
  }
}

/**
 * Route the user to the closest OS surface that can lift the restriction:
 *   1. The direct REQUEST_IGNORE_BATTERY_OPTIMIZATIONS system dialog
 *      ("อนุญาตให้ Rally ทำงานเบื้องหลัง?") — one tap, no Settings trip.
 *      Needs the manifest permission + expo-intent-launcher, both only
 *      present from the next native Android build onward.
 *   2. The system "Battery optimization" list (user picks Rally → Don't
 *      optimize / ไม่จำกัด). OTA-safe on every installed binary.
 *   3. Fallback: Rally's own App-info Settings page.
 */
export async function openNoRestrictionsSettings(): Promise<void> {
  if (Platform.OS !== 'android') {
    await openAppSettings()
    return
  }
  if (await tryDirectNoRestrictionsDialog()) return
  try {
    await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS')
  } catch {
    await openAppSettings()
  }
}

/**
 * True when the direct dialog was shown and dismissed (granted or not — the
 * caller re-reads `isBatteryOptimizationEnabled` for the outcome). False when
 * this binary can't show it, so the caller falls through to the list screen.
 */
async function tryDirectNoRestrictionsDialog(): Promise<boolean> {
  const intentLauncher = loadIntentLauncherModule()
  const applicationId = loadApplicationModule()?.applicationId
  if (!intentLauncher?.startActivityAsync || !applicationId) return false
  try {
    await intentLauncher.startActivityAsync(
      'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
      { data: `package:${applicationId}` },
    )
    return true
  } catch {
    // Manifest permission missing (pre-rebuild binary) or OEM blocked the
    // action — the settings-list route still works.
    return false
  }
}
