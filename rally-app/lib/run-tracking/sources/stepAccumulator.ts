/**
 * Pure step-counting helpers for the pedometer StepSource. No React/Expo
 * imports — folds raw Android `watchStepCount` readings and sanity-clamps the
 * final total against distance/pace so an obviously-wrong step count never
 * pollutes the run summary.
 */

/**
 * Fold a new Android `watchStepCount` reading into a running total.
 *
 * Android's step-count watch reports steps *since the subscription started*,
 * not since session start — so every subscription restart (e.g. app
 * backgrounded/foregrounded, OS killed the listener) resets the raw counter
 * back toward 0. A raw value that drops below the previous raw reading means
 * the subscription restarted: fold the new value in as-is (it represents
 * fresh steps counted since the restart). Otherwise the raw value only grew,
 * so add the positive delta since the last reading.
 */
export function accumulateWatchSteps(
  prev: { total: number; lastRaw: number },
  sample: { raw: number },
): { total: number; lastRaw: number } {
  if (sample.raw < prev.lastRaw) {
    // Subscription restarted — raw counter reset. Treat the new raw value as
    // fresh steps accumulated since the restart.
    return { total: prev.total + sample.raw, lastRaw: sample.raw }
  }
  const delta = sample.raw - prev.lastRaw
  return { total: prev.total + delta, lastRaw: sample.raw }
}

/**
 * Sanity-clamp a candidate step count against the session's distance and
 * moving time. Returns `null` (never throws) so callers fall back to the
 * cadence-based estimate in runResultMetrics.
 *
 * Rejects when:
 *   - steps > distanceMeters * 5 (unrealistically short stride)
 *   - sustained cadence > 300 steps/min
 *   - any input is null/absent/non-finite
 */
export function clampStepsForDistance(input: {
  steps: number | null | undefined
  distanceMeters: number | null | undefined
  movingTimeSeconds: number | null | undefined
}): number | null {
  const { steps, distanceMeters, movingTimeSeconds } = input
  if (
    steps == null || !Number.isFinite(steps) ||
    distanceMeters == null || !Number.isFinite(distanceMeters) ||
    movingTimeSeconds == null || !Number.isFinite(movingTimeSeconds)
  ) {
    return null
  }
  if (steps > distanceMeters * 5) return null
  if (movingTimeSeconds > 0) {
    const stepsPerMinute = steps / (movingTimeSeconds / 60)
    if (stepsPerMinute > 300) return null
  }
  return steps
}
