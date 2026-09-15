/**
 * Pure mapping from {appState, batteryLevel, powerSaveRequested} → tracker mode
 * + GPS config.
 *
 * Three modes per skills/run-tracking/SKILL.md §Battery considerations:
 *   - foreground_active : Best 1Hz (BestForNavigation is a car-nav mode whose
 *                         marginal accuracy gain is absorbed by the Kalman
 *                         smoother; Best saves ~25% GPS power.)
 *   - background        : Balanced ~10m, 5s interval (foreground service / SLC)
 *   - power_save        : Best accuracy, sampled by DISTANCE (~6m) not a long
 *                         time interval. Triggered by a manual toggle OR by
 *                         low battery. Designed for long marathons: it keeps
 *                         distance/pace/time stats ACCURATE (a coarse 10s time
 *                         interval cuts corners and inflates pace error) and
 *                         saves power in the UI layer instead — the run screen
 *                         drops to a stats-only view (no map render) in this
 *                         mode. Distance-interval sampling also keeps enough
 *                         points flowing (~every 2s while running) for the
 *                         windowed auto-pause / vehicle detectors to work.
 *
 * No native imports — keeps the policy unit-testable. Integer constants for
 * accuracy map to expo-location's enum at the adapter boundary.
 */

export type AppLifecycleState = 'active' | 'background' | 'inactive' | 'unknown'

export type TrackerMode = 'foreground_active' | 'background' | 'power_save'

/**
 * Mirrors expo-location's `Location.Accuracy` enum integer values, copied here
 * so this module stays expo-free. Numbers must match expo-location at runtime —
 * see node_modules/expo-location/build/Location.types.d.ts.
 */
export const ACCURACY: { Balanced: 3; High: 4; Best: 5; BestForNavigation: 6 } = {
  Balanced: 3,
  High: 4,
  Best: 5,
  BestForNavigation: 6,
}

/**
 * Resolve the accuracy enum for the actual OS at the adapter boundary.
 *
 * The background mode's intent is "~10m fixes, low power". Android's fused
 * Balanced delivers that, but on iOS `Balanced` maps to
 * kCLLocationAccuracyHundredMeters — real fixes report ~65-165m accuracy,
 * which the background hygiene gate (BACKGROUND_ACCURACY_GATE_M = 35m) drops
 * wholesale, freezing route/distance while the screen is locked. iOS's
 * equivalent of the intent is High (kCLLocationAccuracyNearestTenMeters).
 */
export function resolvePlatformAccuracy(accuracy: number, platform: string): number {
  if (platform === 'ios' && accuracy === ACCURACY.Balanced) return ACCURACY.High
  return accuracy
}

export type TrackerConfig = {
  mode: TrackerMode
  accuracy: number          // expo-location Accuracy enum value
  timeIntervalMs: number    // sample period (Android min interval; ignored by iOS)
  /** Minimum movement (meters) between samples. 0 = time-driven only. */
  distanceIntervalM: number
  /** True when subscription must be a foreground watchPositionAsync. */
  foregroundOnly: boolean
}

const LOW_BATTERY_THRESHOLD = 0.15

export function pickTrackerMode(input: {
  appState: AppLifecycleState
  batteryLevel: number | null  // [0,1]; null = unknown, treat as healthy
  isCharging: boolean
  /** User opted into power-save (e.g. long-run toggle). Wins over charging. */
  powerSaveRequested: boolean
}): TrackerMode {
  // Manual toggle is a deliberate choice (marathon) — honor it even on charge.
  if (input.powerSaveRequested) return 'power_save'
  // Auto low-battery fallback. Charging restores full accuracy.
  if (!input.isCharging && input.batteryLevel !== null && input.batteryLevel < LOW_BATTERY_THRESHOLD) {
    return 'power_save'
  }
  if (input.appState === 'active') return 'foreground_active'
  return 'background'
}

export function configForMode(mode: TrackerMode): TrackerConfig {
  switch (mode) {
    case 'foreground_active':
      return {
        mode,
        accuracy: ACCURACY.Best,
        timeIntervalMs: 1000,
        distanceIntervalM: 0,
        foregroundOnly: true,
      }
    case 'background':
      return {
        mode,
        accuracy: ACCURACY.Balanced,
        timeIntervalMs: 5000,
        distanceIntervalM: 0,
        foregroundOnly: false,
      }
    case 'power_save':
      // Keep accuracy HIGH and sample by distance so the route/distance/pace
      // stay faithful on long runs; the battery is recovered in the UI (the
      // run screen hides the map in this mode), not by degrading the data.
      return {
        mode,
        accuracy: ACCURACY.Best,
        timeIntervalMs: 2000,
        distanceIntervalM: 6,
        foregroundOnly: false,
      }
  }
}
