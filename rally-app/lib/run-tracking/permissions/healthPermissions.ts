import { Platform } from 'react-native'
import {
  HEALTH_CONNECT_WRITE_PERMISSIONS,
  HEALTHKIT_WRITE_TYPES,
  hasAllHealthConnectWritePermissions,
} from '../health-writeback/healthWriteBackPermissions'

/**
 * Cross-platform health permission helpers. iOS routes to HealthKit,
 * Android routes to Health Connect. Each call returns the simplified
 * Rally-side authorization status; use it to decide whether to show the
 * picker or the "grant access" CTA.
 *
 * Why we keep this thin and lazy-load the SDKs:
 *
 *   The HealthKit + Health Connect modules each pull native bindings.
 *   Importing them at module load on the wrong platform throws on
 *   import. Lazy `require()` inside the platform-gated branches keeps
 *   the module safe to import from cross-platform code.
 *
 * iOS read scope:
 *   - workout sessions (running)
 *   - distanceWalkingRunning (summary distance)
 *   - heartRate (avg)
 *
 * Android read scope:
 *   - ExerciseSession (running type)
 *   - TotalCaloriesBurned (optional)
 *   - HeartRate (avg)
 *
 * Write scope is requested only by the Health Write-Back flow after explicit
 * user intent. Imported health workouts remain read-only and are never written
 * back to avoid duplicate records.
 */

export type HealthAuthorizationStatus =
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'unknown'

export const HEALTHKIT_READ_TYPES = [
  'HKWorkoutTypeIdentifier',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
] as const

export const HEALTH_CONNECT_READ_PERMISSIONS = [
  { accessType: 'read' as const, recordType: 'ExerciseSession' as const },
  { accessType: 'read' as const, recordType: 'Distance' as const },
  { accessType: 'read' as const, recordType: 'HeartRate' as const },
] as const

export async function requestHealthPermissions(): Promise<HealthAuthorizationStatus> {
  if (Platform.OS === 'ios') {
    return requestHealthKit()
  }
  if (Platform.OS === 'android') {
    return requestHealthConnect()
  }
  return 'unavailable'
}

export async function requestHealthWritePermissions(
  platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android',
): Promise<HealthAuthorizationStatus> {
  if (platform === 'ios') return requestHealthKitWrite()
  if (platform === 'android') return requestHealthConnectWrite()
  return 'unavailable'
}

async function requestHealthKit(): Promise<HealthAuthorizationStatus> {
  try {
    const HealthKit = require('@kingstinct/react-native-healthkit') as {
      requestAuthorization: (types: {
        toRead?: readonly string[]
        toShare?: readonly string[]
      }) => Promise<boolean>
    }
    const ok = await HealthKit.requestAuthorization({ toRead: HEALTHKIT_READ_TYPES })
    return ok ? 'granted' : 'denied'
  } catch (err) {
    console.warn('[health] HealthKit auth failed', err)
    return 'unavailable'
  }
}

async function requestHealthConnect(): Promise<HealthAuthorizationStatus> {
  try {
    const HC = require('react-native-health-connect') as {
      initialize: () => Promise<boolean>
      requestPermission: (
        permissions: readonly HealthConnectPermission[],
      ) => Promise<HealthConnectPermission[]>
    }
    const initialized = await HC.initialize()
    if (!initialized) return 'unavailable'
    const granted = await HC.requestPermission(HEALTH_CONNECT_READ_PERMISSIONS)
    return granted.length === HEALTH_CONNECT_READ_PERMISSIONS.length
      ? 'granted'
      : 'denied'
  } catch (err) {
    console.warn('[health] Health Connect auth failed', err)
    return 'unavailable'
  }
}

async function requestHealthKitWrite(): Promise<HealthAuthorizationStatus> {
  try {
    const HealthKit = require('@kingstinct/react-native-healthkit') as {
      requestAuthorization: (types: {
        toRead?: readonly string[]
        toShare?: readonly string[]
      }) => Promise<boolean>
    }
    const ok = await HealthKit.requestAuthorization({
      toRead: HEALTHKIT_READ_TYPES,
      toShare: HEALTHKIT_WRITE_TYPES,
    })
    return ok ? 'granted' : 'denied'
  } catch (err) {
    console.warn('[health] HealthKit write auth failed', err)
    return 'unavailable'
  }
}

async function requestHealthConnectWrite(): Promise<HealthAuthorizationStatus> {
  try {
    const HC = require('react-native-health-connect') as {
      initialize: () => Promise<boolean>
      requestPermission: (
        permissions: readonly HealthConnectPermission[],
      ) => Promise<HealthConnectPermission[]>
    }
    const initialized = await HC.initialize()
    if (!initialized) return 'unavailable'
    const granted = await HC.requestPermission(HEALTH_CONNECT_WRITE_PERMISSIONS)
    return hasAllHealthConnectWritePermissions(granted) ? 'granted' : 'denied'
  } catch (err) {
    console.warn('[health] Health Connect write auth failed', err)
    return 'unavailable'
  }
}

type HealthConnectPermission = {
  accessType: 'read' | 'write'
  recordType: string
}
