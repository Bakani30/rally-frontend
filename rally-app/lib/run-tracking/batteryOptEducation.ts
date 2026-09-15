import { Platform } from 'react-native'
import * as Device from 'expo-device'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { isBatteryOptimizationEnabled } from '@/lib/permissions/batteryOptimization'
import { resolveBatteryOptPromptDecision } from './batteryOptPromptRules'

const STORAGE_KEY = 'battery_opt_educated'

// Manufacturers known to aggressively kill background location tracking.
const AFFECTED_MANUFACTURERS = [
  'xiaomi',
  'redmi',
  'poco',
  'oppo',
  'realme',
  'vivo',
  'oneplus',
  'huawei',
  'honor',
  'bbk', // parent company of Oppo/Vivo on some devices
]

/** True if this Android device's manufacturer aggressively kills background apps. */
export function isAffectedManufacturer(): boolean {
  if (Platform.OS !== 'android') return false
  const mfr = (Device.manufacturer ?? '').toLowerCase()
  return AFFECTED_MANUFACTURERS.some((m) => mfr.includes(m))
}

/** True if the one-time "No restrictions" prompt should be shown. */
export async function shouldShowBatteryOptModal(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  const [optimizationEnabled, dismissed] = await Promise.all([
    isBatteryOptimizationEnabled(),
    AsyncStorage.getItem(STORAGE_KEY),
  ])
  return resolveBatteryOptPromptDecision({
    isAndroid: true,
    optimizationEnabled,
    affectedManufacturer: isAffectedManufacturer(),
    dismissed: dismissed !== null,
  })
}

/** Persist that the user has seen the modal (prevents re-showing). */
export async function markBatteryOptEducated(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, '1')
}
