import { haversineMeters } from './gpsDistance'
import type { GpsPoint } from './gpsTypes'

/**
 * GPS hygiene filters. Pure functions applied per-point in the tracker
 * pipeline, before Kalman smoothing and downsampling.
 *
 * See skills/run-tracking/SKILL.md §Integrity checks & GPS hygiene for
 * design rationale and tunable thresholds.
 */

/** Drop points with reported accuracy worse than this (meters). */
export const ACCURACY_GATE_M = 20

/**
 * Relaxed accuracy gate — now used for BOTH foreground and background samples
 * (RunSessionService passes it explicitly). Urban-canyon foreground fixes are
 * routinely 20–35m; dropping everything past 20m starved the distance counter
 * and tripped the false "GPS lost" watchdog (2026-07-10 field incident), same
 * failure mode as background holes bridged with a straight chord. Kept points
 * above {@link ACCURACY_GATE_M} are flagged for server review and
 * down-weighted by the Kalman smoother, so distance inflation stays bounded.
 */
export const BACKGROUND_ACCURACY_GATE_M = 35

/** Below this speed (m/s), the auto-pause detector may consider the runner stationary. */
export const AUTO_PAUSE_SPEED_M_S = 0.5

/** Above this speed (m/s), point is anomalous (~43 km/h — vehicle). */
export const SPEED_ANOMALY_M_S = 12

/** Jump farther than this between consecutive 1Hz samples = teleport. */
export const TELEPORT_JUMP_M = 100

export type RawSample = {
  lat: number
  lng: number
  accuracy?: number | null
  altitude?: number | null
  speed?: number | null
  timestamp: number
  /** Android only — expo-location surfaces this. */
  mocked?: boolean | null
}

export type HygieneVerdict =
  | { kind: 'accept'; point: GpsPoint; computedSpeed?: number }
  | { kind: 'drop'; reason: HygieneDropReason; computedSpeed?: number }

export type HygieneDropReason =
  | 'accuracy_missing'
  | 'accuracy_too_low'
  | 'teleport_detected'
  | 'speed_anomaly'

export type HygieneOptions = {
  /**
   * Drop points worse than this accuracy (meters). Defaults to
   * {@link ACCURACY_GATE_M}. Callers relax it in background, where coarse fixes
   * are expected: dropping them leaves holes the live line bridges with a
   * straight chord across buildings, whereas keeping them (and letting the
   * Kalman smoother down-weight by reported accuracy) preserves route shape.
   */
  accuracyGateM?: number
}

/**
 * Process one raw OS sample against the previous accepted point.
 * Returns a normalized GpsPoint or a drop reason; never throws.
 *
 * `prev` should be the last accepted point (post-hygiene), not the last
 * raw sample, so accuracy gates do not chain.
 */
export function applyHygiene(
  sample: RawSample,
  prev: GpsPoint | null,
  options: HygieneOptions = {},
): HygieneVerdict {
  const accuracyGateM = options.accuracyGateM ?? ACCURACY_GATE_M

  // Accuracy gate
  if (sample.accuracy == null) {
    return { kind: 'drop', reason: 'accuracy_missing' }
  }
  if (sample.accuracy > accuracyGateM) {
    return { kind: 'drop', reason: 'accuracy_too_low' }
  }

  // Position-derived speed, surfaced on every verdict (including drops) so the
  // windowed vehicle detector in RunSessionService can see vehicle-class speed
  // even on points this gate drops. undefined on the first point (no `prev`).
  let computedSpeed: number | undefined

  // Teleport detection
  if (prev) {
    const jump = haversineMeters(prev, sample)
    const dtSec = Math.max(0.001, (sample.timestamp - prev.timestamp) / 1000)
    computedSpeed = jump / dtSec
    if (jump > TELEPORT_JUMP_M && dtSec < 1.5) {
      return { kind: 'drop', reason: 'teleport_detected', computedSpeed }
    }

    // Speed sanity (vehicle-class)
    if (computedSpeed > SPEED_ANOMALY_M_S) {
      return { kind: 'drop', reason: 'speed_anomaly', computedSpeed }
    }
  }

  // Keep instantaneous speed on the point. Pause semantics are applied by the
  // windowed auto-pause detector in RunSessionService, not by one noisy sample.
  const speed = pickSpeed(sample, prev)

  return {
    kind: 'accept',
    computedSpeed,
    point: {
      lat: sample.lat,
      lng: sample.lng,
      accuracy: sample.accuracy,
      altitude: sample.altitude ?? undefined,
      speed,
      // iOS CLLocation delivers fractional-millisecond timestamps; the server
      // submit contract requires integer ms (zod .int()). This is the single
      // choke point every accepted point passes before persist/submit.
      timestamp: Math.round(sample.timestamp),
      isPaused: false,
    },
  }
}

/**
 * Prefer OS-reported speed (from Doppler shift on supported chips); fall
 * back to derived speed from successive positions. Returns 0 if neither.
 */
function pickSpeed(sample: RawSample, prev: GpsPoint | null): number {
  if (sample.speed != null && sample.speed >= 0) return sample.speed
  if (!prev) return 0
  const dtSec = Math.max(0.001, (sample.timestamp - prev.timestamp) / 1000)
  return haversineMeters(prev, sample) / dtSec
}

/** Detect mock location and produce flag string. Caller appends to integrityFlags. */
export function detectMockLocation(sample: RawSample): string | null {
  return sample.mocked === true ? 'mock_location' : null
}
