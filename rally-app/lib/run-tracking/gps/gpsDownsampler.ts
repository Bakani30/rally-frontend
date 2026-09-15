import type { GpsPoint } from './gpsTypes'

/**
 * Fixed 5s downsampling. MVP scope is single-session running ≤ a couple hours
 * (3–10 km typical, ultra/marathon out of scope), so a 5s cadence stays well
 * under the 1500-point server hard cap (≈2h of run before the cap bites).
 *
 * Downsampling rule: keep the first point in each 5s window. Preserves time
 * anchors used for waypoint-order checks.
 */

export const DOWNSAMPLE_INTERVAL_MS = 5_000

export const PATH_HARD_CAP_POINTS = 1500

/**
 * Decide if `candidate` should be kept relative to the last kept point.
 * Streaming-friendly: caller maintains the last-kept pointer. Returns true
 * when no prior point exists (always keep first).
 */
export function shouldKeep(candidate: GpsPoint, lastKept: GpsPoint | null): boolean {
  if (!lastKept) return true
  return candidate.timestamp - lastKept.timestamp >= DOWNSAMPLE_INTERVAL_MS
}

/**
 * One-shot downsample for a finalized path (e.g. when importing from
 * HealthKit or replaying a buffered session). Streaming use should prefer
 * `shouldKeep` to avoid double work.
 */
export function downsamplePath(path: readonly GpsPoint[]): GpsPoint[] {
  if (path.length === 0) return []
  const out: GpsPoint[] = [path[0]]
  for (let i = 1; i < path.length; i++) {
    if (shouldKeep(path[i], out[out.length - 1])) {
      out.push(path[i])
    }
  }
  return out
}
