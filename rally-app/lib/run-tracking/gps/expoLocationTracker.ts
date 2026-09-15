import { Platform } from 'react-native'
import * as Location from 'expo-location'
import { ACCURACY, resolvePlatformAccuracy, type TrackerConfig } from './gpsAccuracyMode'
import {
  BG_LOCATION_TASK,
  ensureBackgroundLocationTaskRegistered,
  stopBackgroundLocationUpdates,
} from './backgroundLocationTask'
import type {
  GpsRawSample,
  GpsTrackerPort,
} from '../session/runSessionPorts'

/**
 * Marker substring of the Android error thrown when an app tries to start
 * a location-typed foreground service while the process is in the
 * background. We swallow this specific error so the run can continue with
 * whatever subscription is already active rather than crashing the session.
 */
const ANDROID_BG_FG_SERVICE_ERROR =
  'Foreground service cannot be started when the application is in the background'

/**
 * Production GpsTrackerPort. Owns the OS-level subscription, switching between
 * three runtime modes per skills/run-tracking/SKILL.md §Battery considerations:
 *
 *   - foreground_active : `watchPositionAsync` Best (Highest) 1Hz
 *   - background        : `startLocationUpdatesAsync(BG_LOCATION_TASK, …)`
 *                         Balanced ~10m, 5s. Foreground service notification on
 *                         Android, iOS background-location entitlement, and
 *                         Significant Location Change wake-ups all flow into
 *                         the same task.
 *   - power_save        : same surface as background but Best accuracy sampled
 *                         by distance (config.distanceIntervalM) to keep stats
 *                         accurate on long runs.
 *
 * Callback delivery:
 *   - Foreground subscription invokes `onSample` directly.
 *   - Background subscription bypasses the in-memory service and writes raw
 *     samples to sqlite via `backgroundLocationTask.ts`. Service drains them
 *     on the next foreground tick.
 *
 * Singleton enforcement: at most one active subscription per process. Calling
 * start twice throws to surface a state-machine bug rather than silently
 * leaking the prior subscription.
 */
export class ExpoLocationTracker implements GpsTrackerPort {
  private foregroundSub: Location.LocationSubscription | null = null
  private currentMode: TrackerConfig['mode'] | null = null
  private currentOnSample: ((sample: GpsRawSample) => void) | null = null
  // Pre-session warm-up subscription. Runs at the same Best accuracy as the
  // foreground_active mode so the hot handoff stays on the same subscription
  // (no OS-level restart) and the chip is already locked when Start is pressed.
  private warmSub: Location.LocationSubscription | null = null
  private warmOnSample: ((sample: GpsRawSample) => void) | null = null
  // Bumped by cancelWarmUp so a warmUp still awaiting watchPositionAsync can
  // tell it was cancelled mid-flight and must remove the subscription it just
  // received. Without this, cancel during the await leaves an orphan watch
  // running at Highest accuracy forever (iOS location arrow stuck on Home).
  private warmEpoch = 0

  async warmUp(onSample: (sample: GpsRawSample) => void): Promise<void> {
    if (this.currentMode || this.warmSub) return  // session active or already warmed
    const epoch = this.warmEpoch
    this.warmOnSample = onSample
    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 1000,
        distanceInterval: 0,
        mayShowUserSettingsDialog: true,
      },
      (loc) => this.warmOnSample?.(toGpsRawSample(loc)),
    )
    if (epoch !== this.warmEpoch || this.currentMode || this.warmSub) {
      sub.remove()  // cancelled or superseded while awaiting the OS
      return
    }
    this.warmSub = sub
  }

  async cancelWarmUp(): Promise<void> {
    this.warmEpoch += 1
    this.warmSub?.remove()
    this.warmSub = null
    this.warmOnSample = null
  }

  async start(
    onSample: (sample: GpsRawSample) => void,
    config: TrackerConfig,
  ): Promise<void> {
    if (this.currentMode) {
      throw new Error('ExpoLocationTracker.start: subscription already active')
    }
    this.currentOnSample = onSample

    if (this.warmSub && config.foregroundOnly) {
      // HOT HANDOFF: GPS chip is already locked. Swap the callback in-place
      // so recording starts instantly with no OS-level subscription restart.
      this.warmOnSample = onSample
      this.foregroundSub = this.warmSub
      this.warmSub = null
      this.currentMode = config.mode
      // Android 14+: foreground services with type "location" can ONLY be
      // started while the process is in the foreground. Pre-arm the bg
      // service NOW (we know we're foreground because the user just hit
      // Start) so a later app-backgrounding doesn't try to start it then
      // and crash. The fg watchPositionAsync above keeps delivering the
      // snappy 1Hz samples while foreground; the bg task drains samples
      // to sqlite the moment Android pauses the fg sub.
      ensureBackgroundLocationTaskRegistered()
      await this.tryStartBackgroundService(config)
      return
    }

    // Cold start: clean up warm sub (handles background mode or no pre-warm).
    await this.cancelWarmUp()
    ensureBackgroundLocationTaskRegistered()
    await this.applyMode(config)

    // Same pre-arm rationale as the hot-handoff branch.
    if (config.foregroundOnly) {
      await this.tryStartBackgroundService(config)
    }
  }

  async setMode(config: TrackerConfig): Promise<void> {
    if (!this.currentOnSample) return
    if (this.currentMode === config.mode) return
    await this.teardownActive()
    await this.applyMode(config)
  }

  /**
   * Wraps startLocationUpdatesAsync with the Android-14 background-state
   * exception handler. If we're racing a backgrounding event, we lose the
   * fg service for this session — analytics will see it but the in-process
   * subscription continues delivering until Android pauses it.
   */
  private async tryStartBackgroundService(config: TrackerConfig): Promise<void> {
    try {
      await this.startBackground(config)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (Platform.OS === 'android' && msg.includes(ANDROID_BG_FG_SERVICE_ERROR)) {
        // Already backgrounded by the time we got here. Skipping is the
        // documented Android 14 behavior — better than crashing the run.
        return
      }
      throw err
    }
  }

  async stop(): Promise<void> {
    await this.teardownActive()
    this.currentOnSample = null
    this.currentMode = null
  }

  // ----- internal -----------------------------------------------------------

  private async applyMode(config: TrackerConfig): Promise<void> {
    if (config.foregroundOnly) {
      await this.startForeground(config)
    } else {
      // setMode → applyMode(background) is the historical crash path on
      // Android 14: an app-state-change observer triggers the switch
      // *as* Android marks the process background. tryStartBackgroundService
      // swallows that specific error so the run keeps going with whatever
      // subscription is still alive.
      await this.tryStartBackgroundService(config)
    }
    this.currentMode = config.mode
  }

  private async startForeground(config: TrackerConfig): Promise<void> {
    this.foregroundSub = await Location.watchPositionAsync(
      {
        accuracy: toExpoAccuracy(config.accuracy),
        timeInterval: config.timeIntervalMs,
        distanceInterval: config.distanceIntervalM,
        mayShowUserSettingsDialog: true,
      },
      (location) => {
        this.currentOnSample?.(toGpsRawSample(location))
      },
    )
  }

  private async startBackground(config: TrackerConfig): Promise<void> {
    await Location.startLocationUpdatesAsync(BG_LOCATION_TASK, {
      accuracy: toExpoAccuracy(resolvePlatformAccuracy(config.accuracy, Platform.OS)),
      timeInterval: config.timeIntervalMs,
      distanceInterval: config.distanceIntervalM,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Fitness,
      // iOS blue status-bar location indicator while tracking in background —
      // the trust signal users know from Strava/Google Maps. Without it a
      // backgrounded run looks like the app stopped tracking (and a
      // When-In-Use grant may not deliver background fixes at all).
      showsBackgroundLocationIndicator: true,
      // Significant Location Change wake-ups: iOS will resume the task when
      // the user moves a meaningful distance even after process suspension.
      deferredUpdatesInterval: 30_000,
      foregroundService: {
        notificationTitle: 'กำลังบันทึกการวิ่ง',
        notificationBody: 'Rally กำลังบันทึก GPS เพื่อ track การวิ่งของคุณ',
        notificationColor: '#10B981',
      },
    })
  }

  private async teardownActive(): Promise<void> {
    if (this.foregroundSub) {
      this.foregroundSub.remove()
      this.foregroundSub = null
    }
    await stopBackgroundLocationUpdates()
  }
}

function toExpoAccuracy(value: number): Location.LocationAccuracy {
  switch (value) {
    case ACCURACY.Balanced:
      return Location.Accuracy.Balanced
    case ACCURACY.High:
      return Location.Accuracy.High
    case ACCURACY.Best:
      return Location.Accuracy.Highest
    case ACCURACY.BestForNavigation:
    default:
      return Location.Accuracy.BestForNavigation
  }
}

/** Module-level singleton. Use this from runSessionServiceFactory in app code. */
export const expoLocationTracker: GpsTrackerPort = new ExpoLocationTracker()

/**
 * Map expo-location's LocationObject → our wire-level GpsRawSample.
 * Pure helper; exported for unit tests in case the mapping is non-trivial.
 */
export function toGpsRawSample(location: Location.LocationObject): GpsRawSample {
  const coords = location.coords
  return {
    lat: coords.latitude,
    lng: coords.longitude,
    accuracy: coords.accuracy ?? null,
    altitude: coords.altitude ?? null,
    speed: coords.speed ?? null,
    heading: coords.heading ?? null,
    timestamp: location.timestamp,
    mocked: typeof (coords as { mocked?: boolean }).mocked === 'boolean'
      ? (coords as { mocked?: boolean }).mocked!
      : null,
  }
}
