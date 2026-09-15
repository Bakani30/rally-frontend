import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import * as Device from 'expo-device'
import {
  appendBgRawSample,
  getActiveSessionId,
} from '../offline/sessionBuffer'
import { isIgnorableSimulatorBackgroundLocationError } from './backgroundLocationError'

/**
 * Background location task wired to expo-task-manager. The task fires whenever
 * `Location.startLocationUpdatesAsync(BG_LOCATION_TASK, …)` delivers samples
 * — including iOS Significant Location Change wake-ups when the app has been
 * suspended.
 *
 * Why bypass the singleton service:
 *   The task runs in a headless JS context. By the time it fires after a
 *   suspend, the in-memory service/store may be torn down. Reaching across
 *   contexts to a Zustand singleton is brittle — instead the task writes raw
 *   samples to its own sqlite table and the foreground service drains them
 *   through the full hygiene pipeline on resume / before stop().
 *
 * Permissions / config / lifecycle are owned by the foreground tracker
 * (`expoLocationTracker.ts`). This module only owns the task registration.
 *
 * Module-level side effect: calling `defineTask` at import time so the task
 * is registered before any call to `startLocationUpdatesAsync`. Import this
 * module from `app/_layout.tsx` so it runs at app boot.
 */

export const BG_LOCATION_TASK = 'rally.run-tracking.background-location'

type LocationTaskBody = {
  data?: {
    locations?: Array<{
      coords: {
        latitude: number
        longitude: number
        accuracy: number | null
        altitude: number | null
        speed: number | null
        mocked?: boolean | null
      }
      timestamp: number
    }>
  }
  error?: TaskManager.TaskManagerError | null
}

let registered = false

export function ensureBackgroundLocationTaskRegistered(): void {
  if (registered) return
  registered = true

  TaskManager.defineTask(BG_LOCATION_TASK, async (body: LocationTaskBody) => {
    if (body.error) {
      if (isIgnorableSimulatorBackgroundLocationError(body.error, Device.isDevice)) return
      console.warn('[bg-location] task error', body.error)
      return
    }
    const locations = body.data?.locations ?? []
    if (locations.length === 0) return

    try {
      const sessionId = await getActiveSessionId()
      if (!sessionId) return

      for (const loc of locations) {
        await appendBgRawSample({
          sessionId,
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? null,
          altitude: loc.coords.altitude ?? null,
          speed: loc.coords.speed ?? null,
          timestamp: loc.timestamp,
          mocked:
            typeof loc.coords.mocked === 'boolean'
              ? loc.coords.mocked
              : null,
        })
      }
    } catch (err) {
      console.warn('[bg-location] persist failed', err)
    }
  })
}

/**
 * Hardening: TaskManager.isTaskRegisteredAsync is async, so callers waiting
 * for confirmation can `await` this. Returns true if our task is registered.
 */
export async function isBackgroundLocationTaskRegistered(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(BG_LOCATION_TASK)
}

/**
 * Stop the background location subscription. Safe to call when not running.
 * Errors are swallowed — Android 14 occasionally rejects fg-service stop
 * calls when the app has already been killed/backgrounded; the OS reaps
 * the service shortly after either way, so a noisy crash here would only
 * confuse the user.
 */
export async function stopBackgroundLocationUpdates(): Promise<void> {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BG_LOCATION_TASK).catch(
      () => false,
    )
    if (!isRunning) return
    await Location.stopLocationUpdatesAsync(BG_LOCATION_TASK)
  } catch (err) {
    console.warn('[bg-location] stop failed', err)
  }
}
