/**
 * Vehicle-motion detector. Decides when the runner is moving at a sustained
 * speed that no human can run (in a car / bus / on a bike) so the session can
 * stop counting that stretch and tell the user why — instead of silently
 * dropping points and freezing the route, which reads as a broken app.
 *
 * Distance is already protected upstream: `gpsHygiene` drops single points
 * faster than `SPEED_ANOMALY_M_S` (12 m/s). This detector is the *stateful*,
 * user-visible layer on top of that hard per-point gate. It deliberately uses
 * a lower enter speed (8 m/s) over a time window so it also catches sustained
 * 8–12 m/s travel that slips past the per-point gate, while a single fast GPS
 * spike or a short downhill sprint never latches it.
 *
 * Mirrors `autoPauseDetector`: a pure function over a small mutable state
 * object, with hysteresis so it can't flap on the edge.
 *
 *   enter:  every sample in the last VEHICLE_ENTER_WINDOW_MS is at or above
 *           VEHICLE_ENTER_SPEED_M_S (sustained vehicle-class speed)
 *   exit:   every sample in the last VEHICLE_EXIT_WINDOW_MS is at or below
 *           VEHICLE_EXIT_SPEED_M_S (back to human-class speed)
 *
 * The enter and exit speeds intentionally don't overlap (8 m/s to enter, 5 m/s
 * to exit) — that's hysteresis: a brief traffic slowdown won't flip it back.
 *
 * Like the auto-pause detector, samples worse than ACCURACY_LIMIT_M do not
 * flip the latched state — we don't trust where (or how fast) they are.
 *
 * All thresholds are exported for the test suite.
 */

/** At or above this sustained speed (m/s ≈ 28.8 km/h) the motion is vehicle-class. */
export const VEHICLE_ENTER_SPEED_M_S = 8.0
/** How long speed must stay vehicle-class to latch (ms) — rejects spikes/sprints. */
export const VEHICLE_ENTER_WINDOW_MS = 6_000
/** At or below this sustained speed (m/s ≈ 18 km/h) the runner is human-class again. */
export const VEHICLE_EXIT_SPEED_M_S = 5.0
/** How long speed must stay human-class to unlatch (ms). */
export const VEHICLE_EXIT_WINDOW_MS = 5_000
/** Skip state flips when accuracy is worse than this (meters). */
export const ACCURACY_LIMIT_M = 25
/** Hard cap on retained samples to prevent unbounded growth on stalled streams. */
const SAMPLE_BUFFER_CAP = 120
/** Slack on window completeness so a slightly short window still counts when sampling is jittery. */
const WINDOW_FILL_SLACK_MS = 1_000

export type VehicleSample = {
  /** Speed in m/s. Position-derived `computedSpeed` from hygiene is preferred over OS speed. */
  speed: number
  timestamp: number
  /** Reported accuracy in meters. */
  accuracy: number
}

export type VehicleDetectorState = {
  /** Sliding window of samples. Oldest first. */
  samples: VehicleSample[]
  /** Latched vehicle state. */
  vehicle: boolean
}

export type VehicleTransition = 'enter' | 'exit' | null

export type VehicleUpdate = {
  vehicle: boolean
  /** 'enter' / 'exit' on the sample that flipped the state, otherwise null. */
  transition: VehicleTransition
}

export function createVehicleState(): VehicleDetectorState {
  return { samples: [], vehicle: false }
}

/** Reset the detector — call on session start/stop. */
export function resetVehicleState(state: VehicleDetectorState): void {
  state.samples = []
  state.vehicle = false
}

/**
 * Update the detector with a new speed sample. Mutates `state` in place and
 * returns the new vehicle state plus an optional transition marker on the
 * sample that flipped it. The caller fans the transition out to observers.
 */
export function vehicleUpdate(
  state: VehicleDetectorState,
  sample: VehicleSample,
): VehicleUpdate {
  state.samples.push(sample)
  const cutoff = sample.timestamp - Math.max(VEHICLE_ENTER_WINDOW_MS, VEHICLE_EXIT_WINDOW_MS)
  while (state.samples.length > 0 && state.samples[0].timestamp < cutoff) {
    state.samples.shift()
  }
  if (state.samples.length > SAMPLE_BUFFER_CAP) {
    state.samples.splice(0, state.samples.length - SAMPLE_BUFFER_CAP)
  }

  const wasVehicle = state.vehicle

  // Quality gate — keep the latched state when we don't trust this sample.
  if (sample.accuracy > ACCURACY_LIMIT_M) {
    return { vehicle: wasVehicle, transition: null }
  }

  if (!wasVehicle) {
    return tryEnter(state, sample)
  }
  return tryExit(state, sample)
}

function tryEnter(state: VehicleDetectorState, sample: VehicleSample): VehicleUpdate {
  const windowed = windowedSamples(state, sample.timestamp, VEHICLE_ENTER_WINDOW_MS)
  if (!windowFull(windowed, sample.timestamp, VEHICLE_ENTER_WINDOW_MS)) {
    return { vehicle: false, transition: null }
  }
  const slowest = Math.min(...windowed.map((s) => s.speed))
  if (slowest >= VEHICLE_ENTER_SPEED_M_S) {
    state.vehicle = true
    return { vehicle: true, transition: 'enter' }
  }
  return { vehicle: false, transition: null }
}

function tryExit(state: VehicleDetectorState, sample: VehicleSample): VehicleUpdate {
  const windowed = windowedSamples(state, sample.timestamp, VEHICLE_EXIT_WINDOW_MS)
  if (!windowFull(windowed, sample.timestamp, VEHICLE_EXIT_WINDOW_MS)) {
    return { vehicle: true, transition: null }
  }
  const fastest = Math.max(...windowed.map((s) => s.speed))
  if (fastest <= VEHICLE_EXIT_SPEED_M_S) {
    state.vehicle = false
    return { vehicle: false, transition: 'exit' }
  }
  return { vehicle: true, transition: null }
}

function windowedSamples(
  state: VehicleDetectorState,
  now: number,
  windowMs: number,
): VehicleSample[] {
  const windowStart = now - windowMs
  return state.samples.filter((s) => s.timestamp >= windowStart)
}

/** The window must hold at least two samples spanning (almost) its full length. */
function windowFull(windowed: VehicleSample[], now: number, windowMs: number): boolean {
  if (windowed.length < 2) return false
  const span = now - windowed[0].timestamp
  return span >= windowMs - WINDOW_FILL_SLACK_MS
}
