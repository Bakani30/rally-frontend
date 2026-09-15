import { ACCURACY_LIMIT_M, FAST_RESUME_SPEED_M_S } from './autoPauseDetector'
import { haversineMeters } from './gpsDistance'
import type { GpsPoint } from './gpsTypes'

/**
 * Display-only stationary clamp for the live map marker.
 *
 * Even after Kalman smoothing, GPS noise moves the estimated position by
 * several meters per sample while the runner is genuinely standing still —
 * visually this reads as the marker walking in place. This holds the marker
 * at the last settled anchor until a new point moves far enough to be
 * unambiguous real motion, instead of animating to every noisy sample.
 *
 * The escape radius matches autoPauseDetector's RESUME_RADIUS_M so "the
 * marker starts moving again" lines up with "auto-pause resumes."
 *
 * While genuinely running, the radius alone made the marker hop in ~12m
 * steps behind the live trail (whose tail always reaches the latest raw
 * sample), so the line visibly ran ahead of the dot. A trusted-quality fix
 * at unambiguous running speed (autoPauseDetector's fast-resume threshold)
 * therefore escapes immediately — stationary speed jitter (±1 m/s) stays
 * below it, so the standing-still clamp is unaffected.
 *
 * Display-only: never touches `path` or distance — those still derive from
 * the raw per-sample Kalman output via pathDistanceMeters, unaffected by
 * this clamp. Pure function; caller owns the anchor across samples.
 */
export const LIVE_MARKER_ESCAPE_RADIUS_M = 12

export function resolveStableLiveMarker(latest: GpsPoint, anchor: GpsPoint | null): GpsPoint {
  if (!anchor) return latest
  const movingUnambiguously =
    latest.speed != null &&
    latest.speed >= FAST_RESUME_SPEED_M_S &&
    latest.accuracy <= ACCURACY_LIMIT_M
  if (movingUnambiguously) return latest
  return haversineMeters(anchor, latest) > LIVE_MARKER_ESCAPE_RADIUS_M ? latest : anchor
}
