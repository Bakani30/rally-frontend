import * as Application from 'expo-application'
import * as Crypto from 'expo-crypto'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

import { registerDevice } from './deviceRepository'
import type {
  DevicePlatform,
  DeviceRegistrationResult,
} from './deviceFingerprintTypes'

// We hash the raw OS identifier with a static app salt before sending it
// to the server. Salt prevents trivially correlating fingerprints across
// other Rally-owned services in the future, and means the raw IDFV /
// Android ID never leaves the device.
const FINGERPRINT_SALT = 'rally:v1:device'

function detectPlatform(): DevicePlatform {
  if (Platform.OS === 'ios') return 'ios'
  if (Platform.OS === 'android') return 'android'
  return 'web'
}

async function readRawDeviceId(platform: DevicePlatform): Promise<string | null> {
  if (platform === 'ios') {
    // IDFV is stable across reinstalls of any app from the same vendor,
    // which is the property we want for sybil detection.
    return await Application.getIosIdForVendorAsync()
  }
  if (platform === 'android') {
    // Android ID is stable across factory reset NO, but stable across
    // reinstalls of our app on the same device — good enough for sybil
    // detection at the cost a determined attacker can wipe.
    return Application.getAndroidId()
  }
  return null
}

async function hashFingerprint(rawId: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${FINGERPRINT_SALT}:${rawId}`,
  )
}

function appVersion(): string | undefined {
  return Constants.expoConfig?.version ?? undefined
}

export async function registerDeviceFingerprint(): Promise<DeviceRegistrationResult> {
  if (!Device.isDevice) {
    return { ok: false, error: { kind: 'simulator' } }
  }

  const platform = detectPlatform()
  if (platform === 'web') {
    return { ok: false, error: { kind: 'unsupported_platform' } }
  }

  const rawId = await readRawDeviceId(platform)
  if (!rawId || rawId.length < 8) {
    return { ok: false, error: { kind: 'fingerprint_unavailable' } }
  }

  const fingerprint = await hashFingerprint(rawId)

  try {
    const deviceId = await registerDevice({
      fingerprint,
      platform,
      appVersion: appVersion(),
    })
    return { ok: true, deviceId }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code?: unknown }).code ?? '')
        : undefined
    return {
      ok: false,
      error: { kind: 'register_failed', message, code },
    }
  }
}
