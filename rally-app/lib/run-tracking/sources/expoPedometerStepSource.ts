import { Platform } from 'react-native'
import type { StepSourcePort } from '../session/stepSourcePort'
import { accumulateWatchSteps } from './stepAccumulator'

/**
 * Native pedometer adapter backed by expo-sensors. Imported ONLY by
 * runSessionServiceFactory (productionDeps) — the service and its tests never
 * touch this module directly, mirroring the tracker/buffer adapter pattern.
 *
 * `expo-sensors` is lazy-imported inside each method (never at module top
 * level) so a missing/unlinked native module never crashes the app — any
 * import failure, permission denial, or `isAvailableAsync() === false` simply
 * resolves `read()` to `null`, and the caller falls back to the cadence
 * estimate (see runResultMetrics.ts).
 */

let accumulator: { total: number; lastRaw: number } | null = null
let androidSubscription: { remove: () => void } | null = null
let iosStartedAtMs: number | null = null

async function startAndroid(): Promise<void> {
  try {
    const Pedometer = (await import('expo-sensors')).Pedometer
    const available = await Pedometer.isAvailableAsync()
    if (!available) return
    accumulator = { total: 0, lastRaw: 0 }
    androidSubscription = Pedometer.watchStepCount(({ steps }) => {
      if (!accumulator) return
      accumulator = accumulateWatchSteps(accumulator, { raw: steps })
    })
  } catch {
    accumulator = null
    androidSubscription = null
  }
}

async function stopAndroid(): Promise<void> {
  try {
    androidSubscription?.remove()
  } catch {
    // no-op — best-effort teardown
  }
  androidSubscription = null
}

export const expoPedometerStepSource: StepSourcePort = {
  async start(startedAt: number): Promise<void> {
    if (Platform.OS === 'android') {
      await startAndroid()
      return
    }
    if (Platform.OS === 'ios') {
      iosStartedAtMs = startedAt
      return
    }
  },

  async stop(): Promise<void> {
    if (Platform.OS === 'android') {
      await stopAndroid()
    }
  },

  async read(endedAt: number): Promise<number | null> {
    if (Platform.OS === 'android') {
      const total = accumulator?.total ?? null
      accumulator = null
      return total
    }
    if (Platform.OS === 'ios') {
      const startedAt = iosStartedAtMs
      iosStartedAtMs = null
      if (startedAt == null) return null
      try {
        const Pedometer = (await import('expo-sensors')).Pedometer
        const available = await Pedometer.isAvailableAsync()
        if (!available) return null
        const result = await Pedometer.getStepCountAsync(new Date(startedAt), new Date(endedAt))
        return result?.steps ?? null
      } catch {
        return null
      }
    }
    return null
  },
}
