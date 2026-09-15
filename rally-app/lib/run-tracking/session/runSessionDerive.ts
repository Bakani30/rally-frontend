import { haversineMeters, pathDistanceMeters } from '../gps/gpsDistance'
import { downsamplePath } from '../gps/gpsDownsampler'
import type { GpsPoint, Split } from '../gps/gpsTypes'

/**
 * Pure derivers for finalized run sessions. Run on client at stop time to
 * build the payload sent to `submit-run-session`. The server independently
 * recomputes distance and pace; client-side numbers are the *claim* and
 * must round-trip within 10% of the server's recompute (anti-tamper).
 *
 * Mirrors `supabase/functions/submit-run-session/service.ts` derivePathDistance.
 * Do not diverge — server compares both.
 *
 * No side effects, no React, no expo-* imports — node-testable.
 */

/** Total duration of a session, including paused time. */
export function deriveDurationSeconds(startedAt: Date, endedAt: Date): number {
  return Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000))
}

/**
 * Active duration = total duration minus accumulated paused seconds.
 * Pace is computed against this, never raw duration.
 */
export function deriveActiveDurationSeconds(
  totalDurationSeconds: number,
  pausedDurationSeconds: number,
): number {
  return Math.max(0, totalDurationSeconds - pausedDurationSeconds)
}

/**
 * Total distance over the path. Re-exported from gpsDistance for ergonomics —
 * callers can import everything they need from runSessionDerive.
 */
export function deriveDistanceMeters(path: readonly GpsPoint[]): number {
  return pathDistanceMeters(path)
}

/**
 * Distance over the same 5s downsampled path that gps_live submits to the
 * server. Use this for pre-submit reward estimates so the HUD previews the
 * server's likely distance instead of the full-rate live UI distance.
 */
export function deriveSubmittedDistanceMeters(path: readonly GpsPoint[]): number {
  return Math.round(deriveDistanceMeters(downsamplePath(path)))
}

/**
 * Pace in seconds-per-kilometer using *active* duration. Returns 0 when
 * distance is below 1m (degenerate path) so callers don't divide by zero.
 */
export function derivePaceSecondsPerKm(
  distanceMeters: number,
  activeDurationSeconds: number,
): number {
  if (distanceMeters < 1) return 0
  const km = distanceMeters / 1000
  return Math.round(activeDurationSeconds / km)
}

/**
 * Per-kilometer splits. Walks the path accumulating distance; emits a Split
 * each time the cumulative distance crosses a kilometer boundary. The split
 * timestamp is interpolated linearly across the segment that crossed.
 *
 * Paused segments do not contribute to distance OR time inside the split,
 * matching how server-side pace excludes paused duration.
 *
 * Edge cases:
 *   - path < 2 points → []
 *   - distance < 1km → []
 *   - last partial km → not emitted (only whole km splits)
 */
export function deriveSplits(path: readonly GpsPoint[]): Split[] {
  if (path.length < 2) return []

  const splits: Split[] = []
  let cumulativeMeters = 0
  let activeMs = 0
  let nextKmBoundary = 1000
  let kmIndex = 1

  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1]
    const curr = path[i]
    const segmentMs = curr.timestamp - prev.timestamp

    if (curr.isPaused) {
      // Paused segment contributes neither distance nor active time.
      continue
    }

    const segmentMeters = haversineMeters(prev, curr)
    const newCumulative = cumulativeMeters + segmentMeters

    // A long sparse segment can cross multiple km boundaries.
    while (segmentMeters > 0 && nextKmBoundary <= newCumulative) {
      const metersIntoSegment = nextKmBoundary - cumulativeMeters
      const fraction = metersIntoSegment / segmentMeters
      const msIntoSegment = segmentMs * fraction
      const boundaryActiveMs = activeMs + msIntoSegment
      const splitTimeSeconds = Math.round(boundaryActiveMs / 1000)
      const prevSplitEndSec = splits.length > 0 ? splits[splits.length - 1].timeSeconds : 0
      splits.push({
        km: kmIndex,
        timeSeconds: splitTimeSeconds,
        paceSecondsPerKm: Math.max(1, splitTimeSeconds - prevSplitEndSec),
      })
      nextKmBoundary += 1000
      kmIndex += 1
    }

    cumulativeMeters = newCumulative
    activeMs += segmentMs
  }

  return splits
}

/**
 * Bundled derivation for the submit payload. One call, all numbers.
 * Caller is responsible for `externalWorkoutId` and `integrityFlags`.
 */
export function deriveRunSessionTotals(input: {
  path: readonly GpsPoint[]
  startedAt: Date
  endedAt: Date
  pausedDurationSeconds: number
  /**
   * Distance function for the reported total. Defaults to
   * {@link deriveDistanceMeters} (pause-excluded only). gps_live passes
   * {@link gpsLiveGapExcludedDistanceMeters} so its reported distance also drops
   * >5-min teleport chords and matches the server's anti-tamper recompute.
   */
  distanceFn?: (path: readonly GpsPoint[]) => number
}): {
  distanceMeters: number
  durationSeconds: number
  activeDurationSeconds: number
  paceSecondsPerKm: number
  splits: Split[]
} {
  const distanceFn = input.distanceFn ?? deriveDistanceMeters
  const distanceMeters = Math.round(distanceFn(input.path))
  const durationSeconds = deriveDurationSeconds(input.startedAt, input.endedAt)
  const activeDurationSeconds = deriveActiveDurationSeconds(
    durationSeconds,
    input.pausedDurationSeconds,
  )
  const paceSecondsPerKm = derivePaceSecondsPerKm(distanceMeters, activeDurationSeconds)
  const splits = deriveSplits(input.path)
  return {
    distanceMeters,
    durationSeconds,
    activeDurationSeconds,
    paceSecondsPerKm,
    splits,
  }
}
