/**
 * GPS primitive types shared across run-tracking subsystems.
 *
 * GpsPoint is the single canonical shape for a sampled position. All sources
 * (gps_live, healthkit, health_connect) normalize to this shape before any
 * downstream code (downsampler, hygiene, distance) sees it.
 *
 * `isPaused` semantics: true means this point anchors a non-distance segment:
 * either the auto-pause detector latched a stationary window, or this is the
 * first accepted GPS point after a user-pressed pause/resume. It stays in the
 * path for visualization/server parity but is excluded from distance.
 */

export type GpsPoint = {
  lat: number
  lng: number
  /** Reported accuracy in meters. expo-location provides this on both iOS+Android. */
  accuracy: number
  /** Altitude in meters above sea level. iOS reliable; Android often null. */
  altitude?: number
  /** Instantaneous speed in m/s, when provided by OS. */
  speed?: number
  /** Unix milliseconds. */
  timestamp: number
  /** True when this point anchors a paused segment. Path keeps point; distance ignores it. */
  isPaused: boolean
}

/**
 * Per-km split derived at session stop. Time is cumulative from session start
 * (excluding paused duration is handled at server-side derivation).
 */
export type Split = {
  km: number
  timeSeconds: number
  paceSecondsPerKm: number
}
