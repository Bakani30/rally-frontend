/**
 * Cold-start latency tracker — pure timer.
 *
 * Tracks the time from `markStart()` (subscription opened) to the first GPS
 * sample with `accuracy <= COLD_START_ACCURACY_THRESHOLD`. Used for the
 * `gps_first_valid_point` analytics event (target: p50 ≤ 5s, p95 ≤ 15s)
 * and for the "GPS searching…" UI banner.
 *
 * Pure: no setTimeout, no globals — caller passes timestamps. Tests inject
 * deterministic clocks.
 */

export const COLD_START_ACCURACY_THRESHOLD_M = 30
export const COLD_START_WARNING_THRESHOLD_MS = 30_000

export type ColdStartState = {
  startedAtMs: number | null
  firstValidAtMs: number | null
  /** Set when we passed COLD_START_WARNING_THRESHOLD without first-valid. */
  warningEmitted: boolean
}

export function createColdStartState(): ColdStartState {
  return { startedAtMs: null, firstValidAtMs: null, warningEmitted: false }
}

export function markStart(state: ColdStartState, nowMs: number): void {
  state.startedAtMs = nowMs
  state.firstValidAtMs = null
  state.warningEmitted = false
}

/**
 * Record a sample. Returns the elapsed ms when this is the first valid one;
 * null otherwise. Caller emits the analytics event on a non-null return.
 */
export function recordSample(
  state: ColdStartState,
  sample: { accuracy: number | null; timestamp: number },
): { firstValidElapsedMs: number } | null {
  if (state.firstValidAtMs !== null) return null
  if (state.startedAtMs === null) return null
  if (sample.accuracy === null || sample.accuracy > COLD_START_ACCURACY_THRESHOLD_M) {
    return null
  }
  state.firstValidAtMs = sample.timestamp
  return { firstValidElapsedMs: sample.timestamp - state.startedAtMs }
}

/** True if no valid point yet AND we are past the warning window. */
export function shouldShowSearchingWarning(state: ColdStartState, nowMs: number): boolean {
  if (state.firstValidAtMs !== null) return false
  if (state.startedAtMs === null) return false
  return nowMs - state.startedAtMs >= COLD_START_WARNING_THRESHOLD_MS
}

export function isStillSearching(state: ColdStartState): boolean {
  return state.startedAtMs !== null && state.firstValidAtMs === null
}
