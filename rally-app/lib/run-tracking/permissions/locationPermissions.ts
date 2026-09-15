import * as Location from 'expo-location'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import {
  isMockRunLocationProvider,
  requestedRunLocationProviderKind,
} from '../session/runLocationProvider'

export type RunLocationPermissionStatus = 'unknown' | 'granted' | 'denied' | 'requesting'

export type RunLocationPermissionResult = {
  foreground: RunLocationPermissionStatus
  background: RunLocationPermissionStatus
  /**
   * Whether the OS will still show the system permission dialog for foreground
   * location. False means the user denied permanently (iOS after the first
   * prompt, Android "Don't ask again") — the only recovery is the Settings app.
   */
  canAskAgain: boolean
}

type ExpoPermissionResult = {
  granted: boolean
  status?: string
  canAskAgain?: boolean
}

function mapPermission(result: ExpoPermissionResult): RunLocationPermissionStatus {
  if (result.granted) return 'granted'
  if (result.status === 'denied' || result.canAskAgain === false) return 'denied'
  return 'unknown'
}

function canAskAgainFrom(result: ExpoPermissionResult): boolean {
  return result.canAskAgain !== false
}

export async function getRunLocationPermissionState(): Promise<RunLocationPermissionResult> {
  if (usesMockLocationProvider()) {
    return {
      foreground: 'granted',
      background: 'granted',
      canAskAgain: true,
    }
  }

  const foreground = await Location.getForegroundPermissionsAsync()

  // Android records locked-screen runs through the location foreground
  // service, so ACCESS_BACKGROUND_LOCATION is not in the manifest — querying
  // it there throws NoPermissionInManifestException. Foreground grant is the
  // whole story on Android.
  const background =
    Platform.OS === 'android' ? foreground : await Location.getBackgroundPermissionsAsync()

  return {
    foreground: mapPermission(foreground),
    background: mapPermission(background),
    canAskAgain: canAskAgainFrom(foreground),
  }
}

export async function requestRunLocationPermissions(): Promise<RunLocationPermissionResult> {
  if (usesMockLocationProvider()) {
    return {
      foreground: 'granted',
      background: 'granted',
      canAskAgain: true,
    }
  }

  const foreground = await Location.requestForegroundPermissionsAsync()
  if (!foreground.granted) {
    return {
      foreground: mapPermission(foreground),
      background: 'unknown',
      canAskAgain: canAskAgainFrom(foreground),
    }
  }

  if (Platform.OS === 'android') {
    return {
      foreground: 'granted',
      background: 'granted',
      canAskAgain: canAskAgainFrom(foreground),
    }
  }

  const background = await Location.requestBackgroundPermissionsAsync()
  return {
    foreground: 'granted',
    background: mapPermission(background),
    canAskAgain: canAskAgainFrom(foreground),
  }
}

function usesMockLocationProvider(): boolean {
  return isMockRunLocationProvider({
    requested: requestedRunLocationProviderKind(),
    isDevice: Device.isDevice,
  })
}
