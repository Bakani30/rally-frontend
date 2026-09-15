import { haversineMeters } from './gpsDistance'

/**
 * Auto-pause detector. Decides when the runner has *actually* stopped
 * (red light, water break, untie shoe) so the timer/UI can pause and
 * resume only after they truly start moving again.
 *
 * Why not just `speed < 0.5 m/s`? Because:
 *
 *   - GPS speed jitters by ±1 m/s while standing still — a single
 *     "fast" sample shouldn't flip the state back to running.
 *   - Some chips (Doppler-failing units, urban canyons) report
 *     non-zero speed when stationary; some report zero while jogging.
 *   - A runner taking a tight corner can dip below 0.5 m/s for two
 *     to three samples without actually stopping.
 *
 * The detector therefore looks at WHERE the runner has been over a
 * short trailing window, not just how fast the latest sample claims
 * they're going:
 *
 *   pause:  every position in the last PAUSE_WINDOW_MS is within
 *           PAUSE_RADIUS_M of the oldest one (i.e. they've barely
 *           moved for that long)
 *   resume: max position spread in the last RESUME_WINDOW_MS (runner)
 *           or WALK_RESUME_WINDOW_MS (walker) exceeds RESUME_RADIUS_M
 *           (i.e. they're clearly moving again)
 *
 * Position alone can't tell a standstill from a U-turn (fixes cluster at
 * the turn point) or from a stationary phone whose fix drifts on multipath
 * (wander never settles inside the pause radius), so the detector also
 * weighs the window's median Doppler speed — see PAUSE_BLOCK_MEDIAN_SPEED_M_S
 * and DRIFT_PAUSE_WINDOW_MS.
 *
 * Plus two hard overrides:
 *
 *   fast resume:  OS speed ≥ FAST_RESUME_SPEED_M_S → resume now (no
 *                 need to wait for the resume window to fill — they
 *                 are unambiguously running)
 *   quality gate: sample accuracy worse than ACCURACY_LIMIT_M does
 *                 not flip the state (we don't know where they are)
 *
 * The pause and resume thresholds intentionally don't overlap (8 m
 * to pause, 12 m to resume) — that's hysteresis: prevents rapid
 * flapping when the runner is right on the edge.
 *
 * All thresholds are exported for the test suite. The detector
 * itself is a pure function over a small mutable state object.
 */

/** Stationary if max spread over the trailing window stays within this radius (meters). */
export const PAUSE_RADIUS_M = 8
/** How long the runner must stay within PAUSE_RADIUS_M to be considered paused (ms). */
export const PAUSE_WINDOW_MS = 12_000
/** Resume radius — runner must move at least this far across the resume window (meters). */
export const RESUME_RADIUS_M = 12
/** Window length used to detect resume (ms). Shorter than pause so resume feels responsive. */
export const RESUME_WINDOW_MS = 4_000
/**
 * Slow (walk-speed) resume window (ms). The 4s window demands 12m/4s = 3 m/s —
 * running pace — so a walker (~1.3 m/s) could never resume via position, and
 * the fast-resume path fails too when the OS omits speed (typical for
 * distance-filtered power-save fixes). Field incident 2026-07-10: auto-pause
 * latched on a walker and held for 60–70s stretches, freezing distance while
 * the map marker kept moving. 12m over 12s = 1 m/s — a normal walk resumes
 * within one window while a genuine standstill (spread ≤ 8m) stays paused.
 */
export const WALK_RESUME_WINDOW_MS = 12_000
/** Skip state flips when accuracy is worse than this (meters) — we don't know where they are. */
export const ACCURACY_LIMIT_M = 25
/**
 * Relaxed accuracy ceiling for RESUME evaluation only (matches the relaxed
 * hygiene gate). A latched pause + a sustained coarse-accuracy stretch (urban
 * canyon, 26–35m) used to block resume entirely — every sample failed the
 * strict quality gate, so a walker who kept moving stayed paused and their
 * distance was silently excluded (2026-07-10 field incident). The asymmetry
 * is deliberate: wrongly resuming self-corrects (the 8m/12s pause window
 * re-latches), wrongly staying paused loses real distance forever. Pause
 * flips still require the strict {@link ACCURACY_LIMIT_M}.
 */
export const RESUME_ACCURACY_LIMIT_M = 35
/**
 * OS-reported speed at or above this (m/s ≈ 3.6 km/h) instantly resumes.
 *
 * Was 2.0 (≈7.2 km/h): a walker cruising at ~1.3 m/s cleared neither this gate
 * NOR the position path (12m over the 4s resume window = 3 m/s), so once
 * auto-pause latched at a crossing/light their entire continued walk stayed
 * flagged paused and was excluded from distance — legit walks silently
 * under-counted below the 100m submit floor. 1.0 m/s lets a normal walk resume
 * while a genuine standstill (OS speed usually <0.5, brief noise spikes) does
 * not sustain it; if a spike does resume, the 8m/12s pause window re-latches.
 */
export const FAST_RESUME_SPEED_M_S = 1.0
/**
 * U-turn guard: don't latch a pause while the window's median OS speed says
 * the runner is clearly moving (m/s). Position spread alone can't tell a
 * standstill from a U-turn — walking out 6s and back 6s clusters every fix
 * around the turn point, well inside PAUSE_RADIUS_M. Field incident
 * 2026-07-11: every out-and-back turn on a soi walk latched a false pause.
 * Median (not mean) so a stray Doppler spike while genuinely stopped can't
 * hold the latch open.
 */
export const PAUSE_BLOCK_MEDIAN_SPEED_M_S = 0.8
/**
 * Below this median OS speed (m/s) the Doppler evidence says "stationary".
 * Used by the drift-pause latch and by the drift-aware resume guard below.
 * Genuine standstill Doppler reads ~0.0–0.3; a walker reads ≥0.8.
 */
export const STATIONARY_MEDIAN_SPEED_M_S = 0.4
/**
 * Drift-pause: a phone sitting still in poor signal random-walks its fix by
 * 10–25m (multipath), so the strict 8m/12s latch never fires — the same
 * 2026-07-11 field incident sat for 2 minutes without pausing. When the
 * median Doppler speed over this longer window is stationary AND the fix
 * wander stays inside DRIFT_PAUSE_RADIUS_M, latch anyway. A real walker with
 * broken Doppler covers ~39m in 30s (1.3 m/s) and stays clear of the radius.
 */
export const DRIFT_PAUSE_WINDOW_MS = 30_000
/** Max fix wander (meters) over DRIFT_PAUSE_WINDOW_MS that still counts as sitting still. */
export const DRIFT_PAUSE_RADIUS_M = 20
/** Minimum non-null OS speeds required before trusting a median-speed verdict. */
const SPEED_MEDIAN_MIN_SAMPLES = 3
/**
 * A pause latch window must have no delivery gap longer than this (ms). A gap
 * means the pipeline starved (distance-filter at speed, brief outage) — the
 * runner may have covered real ground that the window never saw, and the
 * Kalman-lagged first fix after the gap clusters near the pre-gap fixes,
 * faking a standstill. Idle-watch fixes arrive every ~2.5s and 1Hz foreground
 * fixes every ~1s, so 6s tolerates jitter without spanning a real hole.
 */
const PAUSE_MAX_SAMPLE_GAP_MS = 6_000
/** Hard cap on retained samples to prevent unbounded growth on stalled streams. */
const SAMPLE_BUFFER_CAP = 120

/** Slack on window completeness so e.g. an 11.8s window still counts when sampling is jittery. */
const WINDOW_FILL_SLACK_MS = 1_000

export type AutoPauseSample = {
  lat: number
  lng: number
  timestamp: number
  /** OS-reported speed in m/s. null when unavailable (typical for synthesized backfill samples). */
  speed: number | null
  /** Reported accuracy in meters. */
  accuracy: number
}

export type AutoPauseDetectorState = {
  /** Sliding window of samples. Oldest first. */
  samples: AutoPauseSample[]
  /** Latched pause state. */
  paused: boolean
  /**
   * Timestamp of the sample that latched the current pause, null while
   * running. The drift-aware resume guard measures displacement from here so
   * pre-pause approach movement can't fake a resume.
   */
  pausedAtMs: number | null
}

export type AutoPauseTransition = 'pause' | 'resume' | null

export type AutoPauseUpdate = {
  paused: boolean
  /** 'pause' / 'resume' on the sample that flipped the state, otherwise null. */
  transition: AutoPauseTransition
}

export function createAutoPauseState(): AutoPauseDetectorState {
  return { samples: [], paused: false, pausedAtMs: null }
}

/** Reset the detector — call on session start/stop. */
export function resetAutoPauseState(state: AutoPauseDetectorState): void {
  state.samples = []
  state.paused = false
  state.pausedAtMs = null
}

/**
 * Update the detector with a new sample. Mutates `state` in place and returns
 * the new pause state plus an optional transition marker on the sample that
 * flipped it. The caller is responsible for fanning the transition out to
 * observers / store.
 */
export function autoPauseUpdate(
  state: AutoPauseDetectorState,
  sample: AutoPauseSample,
): AutoPauseUpdate {
  // Append + trim window. We keep enough samples to satisfy whichever window
  // is longer (pause) plus a small safety margin so we never drop a sample
  // that's still in range.
  state.samples.push(sample)
  const cutoff =
    sample.timestamp -
    Math.max(PAUSE_WINDOW_MS, RESUME_WINDOW_MS, WALK_RESUME_WINDOW_MS, DRIFT_PAUSE_WINDOW_MS)
  while (state.samples.length > 0 && state.samples[0].timestamp < cutoff) {
    state.samples.shift()
  }
  // Hard cap as a safety net for pathological sampling rates.
  if (state.samples.length > SAMPLE_BUFFER_CAP) {
    state.samples.splice(0, state.samples.length - SAMPLE_BUFFER_CAP)
  }

  const wasPaused = state.paused

  // Fast resume — bypass the window when the OS is confident.
  if (
    wasPaused &&
    sample.speed != null &&
    sample.speed >= FAST_RESUME_SPEED_M_S &&
    sample.accuracy <= ACCURACY_LIMIT_M
  ) {
    state.paused = false
    state.pausedAtMs = null
    return { paused: false, transition: 'resume' }
  }

  // Quality gate — asymmetric. Pause flips need the strict limit (a false
  // pause costs real distance while it lasts). Resume evaluation tolerates
  // coarse-but-bounded accuracy: blocking it latched walkers paused through
  // whole urban-canyon stretches (see RESUME_ACCURACY_LIMIT_M).
  if (sample.accuracy > ACCURACY_LIMIT_M) {
    if (!wasPaused || sample.accuracy > RESUME_ACCURACY_LIMIT_M) {
      return { paused: wasPaused, transition: null }
    }
    return tryResume(state, sample)
  }

  if (!wasPaused) {
    return tryPause(state, sample)
  }
  return tryResume(state, sample)
}

function tryPause(state: AutoPauseDetectorState, sample: AutoPauseSample): AutoPauseUpdate {
  const windowStart = sample.timestamp - PAUSE_WINDOW_MS
  const windowed = state.samples.filter((s) => s.timestamp >= windowStart)
  if (windowed.length < 2) {
    return { paused: false, transition: null }
  }
  const span = sample.timestamp - windowed[0].timestamp
  // Window must be (almost) full — otherwise we don't yet know whether the
  // runner has been stationary long enough.
  if (span < PAUSE_WINDOW_MS - WINDOW_FILL_SLACK_MS) {
    return { paused: false, transition: null }
  }
  // A delivery gap only blocks the latch when the runner MIGHT have been
  // moving through it (distance-filter starvation at speed, Kalman-lag
  // clustering). iOS thins fixes to every ~8-11s on a stationary phone, so a
  // blanket gap guard delayed the stop-latch by 30-40s (2026-07-12 field
  // test); Doppler that unambiguously reads stationary vouches for the gap.
  // The vouching median spans the longer drift window — a thinned 12s window
  // holds only ~2 fixes, too few for a trustworthy median.
  const median = medianSpeed(windowed)
  if (hasDeliveryGap(windowed)) {
    const vouchWindowStart = sample.timestamp - DRIFT_PAUSE_WINDOW_MS
    const vouchMedian = medianSpeed(
      state.samples.filter((s) => s.timestamp >= vouchWindowStart),
    )
    if (vouchMedian == null || vouchMedian >= STATIONARY_MEDIAN_SPEED_M_S) {
      return { paused: false, transition: null }
    }
  }
  const maxSpread = maxPairwiseDistanceFromAnchor(windowed)
  if (maxSpread <= PAUSE_RADIUS_M) {
    // U-turn guard: an out-and-back turn clusters fixes inside the pause
    // radius while Doppler still reads walking pace — don't latch on it.
    if (median != null && median >= PAUSE_BLOCK_MEDIAN_SPEED_M_S) {
      return { paused: false, transition: null }
    }
    state.paused = true
    state.pausedAtMs = sample.timestamp
    return { paused: true, transition: 'pause' }
  }
  return tryDriftPause(state, sample)
}

/**
 * Secondary latch for "sitting still while the fix drifts": multipath can
 * wander a stationary phone's position past PAUSE_RADIUS_M indefinitely, so
 * the primary latch never fires. When the Doppler evidence over the longer
 * drift window is unambiguously stationary and the wander stays bounded,
 * latch anyway. See DRIFT_PAUSE_WINDOW_MS for the field incident.
 */
function tryDriftPause(state: AutoPauseDetectorState, sample: AutoPauseSample): AutoPauseUpdate {
  const windowStart = sample.timestamp - DRIFT_PAUSE_WINDOW_MS
  const windowed = state.samples.filter((s) => s.timestamp >= windowStart)
  if (windowed.length < 2) {
    return { paused: false, transition: null }
  }
  const span = sample.timestamp - windowed[0].timestamp
  if (span < DRIFT_PAUSE_WINDOW_MS - WINDOW_FILL_SLACK_MS) {
    return { paused: false, transition: null }
  }
  const median = medianSpeed(windowed)
  if (median == null || median >= STATIONARY_MEDIAN_SPEED_M_S) {
    return { paused: false, transition: null }
  }
  // Drift latches already demand stationary Doppler (above), which vouches
  // for delivery gaps the same way it does in tryPause — see the note there.
  if (maxPairwiseDistanceFromAnchor(windowed) > DRIFT_PAUSE_RADIUS_M) {
    return { paused: false, transition: null }
  }
  state.paused = true
  state.pausedAtMs = sample.timestamp
  return { paused: true, transition: 'pause' }
}

function tryResume(state: AutoPauseDetectorState, sample: AutoPauseSample): AutoPauseUpdate {
  // Drift-aware guard: when the post-pause Doppler evidence still says
  // "stationary", position wander is presumed to be multipath drift — the
  // same drift that latched a drift-pause would otherwise clear the 12m
  // resume window a few samples later and flap the state. Demand sustained
  // displacement (the drift radius, measured from the latch) instead. Samples
  // without OS speed (power-save backfill) leave the guard off, preserving
  // the 2026-07-10 walker-resume fix.
  if (state.pausedAtMs != null) {
    const pausedAtMs = state.pausedAtMs
    const sincePause = state.samples.filter(
      (s) =>
        s.timestamp > pausedAtMs && s.timestamp >= sample.timestamp - DRIFT_PAUSE_WINDOW_MS,
    )
    // Judge "still stationary?" from the RECENT Doppler only — a long-latched
    // pause accumulates legitimate ~0 speeds that would otherwise keep the
    // guard engaged forever, even against a walker whose fresh samples carry
    // no speed at all (power-save nulls).
    const recentSincePause = sincePause.filter(
      (s) => s.timestamp >= sample.timestamp - WALK_RESUME_WINDOW_MS,
    )
    const median = medianSpeed(recentSincePause)
    if (median != null && median < STATIONARY_MEDIAN_SPEED_M_S) {
      if (maxPairwiseDistanceFromAnchor(sincePause) >= DRIFT_PAUSE_RADIUS_M) {
        state.paused = false
        state.pausedAtMs = null
        return { paused: false, transition: 'resume' }
      }
      return { paused: true, transition: null }
    }
  }

  // Fast path: runner-speed movement clears RESUME_RADIUS_M within the short
  // window. Slow path: walk-speed movement clears the same radius over the
  // longer window — see WALK_RESUME_WINDOW_MS for why both exist.
  for (const windowMs of [RESUME_WINDOW_MS, WALK_RESUME_WINDOW_MS]) {
    const windowStart = sample.timestamp - windowMs
    const windowed = state.samples.filter((s) => s.timestamp >= windowStart)
    if (windowed.length < 2) continue
    const maxSpread = maxPairwiseDistanceFromAnchor(windowed)
    if (maxSpread >= RESUME_RADIUS_M) {
      state.paused = false
      state.pausedAtMs = null
      return { paused: false, transition: 'resume' }
    }
  }
  return { paused: true, transition: null }
}

/** True when any consecutive pair in `samples` is farther apart than PAUSE_MAX_SAMPLE_GAP_MS. */
function hasDeliveryGap(samples: AutoPauseSample[]): boolean {
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].timestamp - samples[i - 1].timestamp > PAUSE_MAX_SAMPLE_GAP_MS) {
      return true
    }
  }
  return false
}

/**
 * Median of the OS-reported speeds in `samples`, or null when fewer than
 * SPEED_MEDIAN_MIN_SAMPLES carry one — too little Doppler evidence to act on.
 */
function medianSpeed(samples: AutoPauseSample[]): number | null {
  const speeds = samples
    .map((s) => s.speed)
    .filter((v): v is number => v != null && v >= 0)
    .sort((a, b) => a - b)
  if (speeds.length < SPEED_MEDIAN_MIN_SAMPLES) return null
  const mid = Math.floor(speeds.length / 2)
  return speeds.length % 2 === 1 ? speeds[mid] : (speeds[mid - 1] + speeds[mid]) / 2
}

/**
 * Distance from the windowed anchor (oldest sample) to the farthest point in
 * the window. Cheaper than a full O(n²) pairwise scan and produces the same
 * result for monotonic running tracks. Stationary tracks always anchor at
 * roughly the same lat/lng so the answer matches the user-visible "are they
 * still in the same spot" question.
 */
function maxPairwiseDistanceFromAnchor(samples: AutoPauseSample[]): number {
  if (samples.length < 2) return 0
  const anchor = samples[0]
  let max = 0
  for (let i = 1; i < samples.length; i++) {
    const d = haversineMeters(anchor, samples[i])
    if (d > max) max = d
  }
  return max
}
