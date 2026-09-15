import {
  autoPauseUpdate,
  createAutoPauseState,
  resetAutoPauseState,
  type AutoPauseDetectorState,
} from '../gps/autoPauseDetector'
import {
  createVehicleState,
  resetVehicleState,
  vehicleUpdate,
  type VehicleDetectorState,
} from '../gps/vehicleMotionDetector'
import { shouldKeep } from '../gps/gpsDownsampler'
import { PauseLedger } from './pauseLedger'
import {
  ACCURACY_GATE_M,
  BACKGROUND_ACCURACY_GATE_M,
  applyHygiene,
  detectMockLocation,
} from '../gps/gpsHygiene'
import type { RawSample } from '../gps/gpsHygiene'
import type { GpsPoint } from '../gps/gpsTypes'
import { runExistenceDistanceMeters } from '../gps/gpsDistance'
import { KalmanLatLng } from '../gps/kalmanSmoother'
import { PaceSmoother } from '../gps/paceSmoothing'
import { configForMode, pickTrackerMode } from '../gps/gpsAccuracyMode'
import type { AppLifecycleState, TrackerMode } from '../gps/gpsAccuracyMode'
import { recoverInterruptedActiveSessions } from '../offline/interruptedSessionRecovery'
import {
  createColdStartState,
  markStart as markColdStart,
  recordSample as recordColdStartSample,
} from '../gps/coldStartTracker'
import type { ColdStartState } from '../gps/coldStartTracker'
import type {
  ClockPort,
  GpsRawSample,
  GpsTrackerPort,
  IdGeneratorPort,
  SessionBufferPort,
} from './runSessionPorts'
import type { StepSourcePort } from './stepSourcePort'
import { clampStepsForDistance } from '../sources/stepAccumulator'
import type { useRunSessionStore } from './runSessionStore'
import type { RunSource } from './runSourceAdapter'
import type { SubmitRunSessionResult } from './runSessionRepository'
import {
  getRunSessionSubmitBlockReason,
  RunSessionSubmitBlockedError,
} from './runSessionSubmitRules'

const BG_GAP_THRESHOLD_MS = 5 * 60_000       // > 5min gap = iOS likely suspended
/**
 * A latched detector pause span may only keep growing while accepted fixes
 * keep confirming it. When accepted fixes stop for longer than this, close the
 * span at the last confirming fix: leaving it open counts the whole delivery
 * hole as paused, which deletes real running time from activeDuration and
 * makes the average pace read impossibly fast at unlock (field incident
 * 2026-07-13 — auto-pause latched just before screen-off, every screen-off
 * fix was then hygiene-dropped, so the detector never saw the runner move
 * again). Detectors re-latch from fresh evidence if the runner really is
 * still stationary. 30s is ~3× the worst observed iOS stationary
 * fix-thinning cadence (~8–11s, buglog 2026-07-12).
 */
const DETECTOR_EVIDENCE_GAP_MS = 30_000
export const RUN_PAUSE_LIMIT_SECONDS = 15 * 60
export const RUN_PAUSE_LIMIT_MS = RUN_PAUSE_LIMIT_SECONDS * 1000

/** Accuracy (m) below which a fix is 'good'; at/worse (still kept) is 'poor'. */
export const GPS_GOOD_ACCURACY_M = 10
/**
 * Staleness watchdog: while a run is active, if no sample has passed hygiene
 * for this long the OS has likely stopped delivering fixes — distance freezes
 * silently, so the UI must say so ('lost'). Reset by the next accepted fix.
 */
export const GPS_LOST_STALENESS_MS = 20_000

/**
 * Resolve the live GPS quality shown to the runner. Pure so both the hook (per
 * 1Hz tick) and tests use the same rule. `'lost'` is time-derived, not stored:
 * it fires only while `active`, with a prior fix, once staleness exceeds the
 * threshold — and only when the watchdog is enabled (suppressed in power-save,
 * whose distance-interval sampling is legitimately sparse).
 */
export function resolveLiveGpsQuality(input: {
  status: 'idle' | 'active' | 'paused' | 'stopped'
  lastAcceptedFixTs: number | null
  baseQuality: 'searching' | 'good' | 'poor' | 'lost'
  nowMs: number
  watchdogEnabled: boolean
}): 'searching' | 'good' | 'poor' | 'lost' {
  const { status, lastAcceptedFixTs, baseQuality, nowMs, watchdogEnabled } = input
  if (lastAcceptedFixTs == null) return baseQuality
  if (
    status === 'active' &&
    watchdogEnabled &&
    nowMs - lastAcceptedFixTs > GPS_LOST_STALENESS_MS
  ) {
    return 'lost'
  }
  return baseQuality
}

/**
 * Orchestrator for active run sessions. Owns the GPS pipeline:
 *
 *   tracker.onSample → mock detect → hygiene → Kalman → adaptive downsample
 *                                                           │
 *                                                           ├─→ SQLite buffer
 *                                                           └─→ Zustand store (UI)
 *
 * Boundaries:
 *   - Service has NO React, expo-*, or supabase imports.
 *   - All side effects flow through injected ports (tracker, buffer, clock,
 *     idGen) or the Zustand store (treated as a port).
 *   - Pure derivers (hygiene, Kalman, downsample) are imported as modules
 *     because they are themselves environment-agnostic.
 *
 * Lifecycle:
 *   start()  → mint sessionId, store.start(), buffer.createSession(),
 *              tracker.start(callback)
 *   pause()  → store.pause()  — tracker keeps emitting; service ignores via
 *              checking store status before persisting
 *   resume() → store.resume()
 *   stop()   → tracker.stop(), store.stop(), buffer.markStopped()
 *   submit() → source.produce(), repo.submit(), buffer.markUploaded()
 *
 * Hygiene / downsample state notes:
 *   - `hygieneLastPoint` is the last point that PASSED hygiene, even if
 *     downsample later dropped it. Used as `prev` for the next hygiene call
 *     so the teleport gate doesn't false-positive against an old kept point.
 *   - `downsampleLastKept` is the last point persisted to buffer/store.
 *   - Kalman is reset per session on start().
 */

export type RunSessionServiceDeps = {
  tracker: GpsTrackerPort
  buffer: SessionBufferPort
  store: typeof useRunSessionStore
  clock: ClockPort
  idGen: IdGeneratorPort
  stepSource: StepSourcePort
}

export type FirstValidPointEvent = {
  latencyMs: number
  accuracyM: number
}

export type ServiceObservers = {
  onFirstValidPoint?: (event: FirstValidPointEvent) => void
  onSearchingTimeout?: (event: { elapsedMs: number }) => void
  onModeChange?: (mode: TrackerMode) => void
  onAutoPause?: () => void
  onAutoResume?: () => void
  /** Sustained vehicle-class speed latched — counting paused. */
  onVehicleDetected?: () => void
  /** Vehicle-class speed cleared — counting resumes. */
  onVehicleCleared?: () => void
  onKmMarker?: (event: { km: number }) => void
  /** Fired once when manual pause + auto-pause reaches the shared 15m budget. */
  onPauseLimitReached?: (event: { totalPausedSeconds: number }) => void
}

export type SubmitDeps = {
  source: RunSource
  submit: (input: {
    source: RunSource['kind']
    externalWorkoutId: string
    startedAt: Date
    endedAt: Date
    distanceMeters: number
    pausedDurationSeconds: number
    path: readonly GpsPoint[]
    splits?: readonly { km: number; timeSeconds: number; paceSecondsPerKm: number }[]
    elevationGainMeters?: number
    avgHeartRate?: number
    integrityFlags?: readonly string[]
    steps?: number
  }) => Promise<SubmitRunSessionResult>
}

export type StartRunSessionOptions = {
  matchId?: string | null
  challengeId?: string | null
}

export type SubmitRunSessionOptions = {
  markUploaded?: boolean
}

export class RunSessionService {
  private kalman = new KalmanLatLng()
  private paceSmoother = new PaceSmoother()
  private hygieneLastPoint: GpsPoint | null = null
  // Wall-clock (clock.now()) at which hygieneLastPoint was accepted. The
  // foreground long-gap check requires real time to have actually elapsed, not
  // just the sample timestamp claiming a jump — so a bad/spoofed GPS timestamp
  // can't fabricate a gap, and back-to-back sparse-timestamp samples are not a
  // gap. Null until the first accepted fix; reset on any resume boundary.
  private lastAcceptedWallClockMs: number | null = null
  private downsampleLastKept: GpsPoint | null = null
  private sequence = 0
  private lastKmCrossed = 0
  private currentSessionId: string | null = null
  private currentMode: TrackerMode = 'foreground_active'
  private appState: AppLifecycleState = 'active'
  private batteryLevel: number | null = null
  private isCharging = false
  // User toggle for power-save (long-run) mode. Distinct from the auto
  // low-battery trigger; folded into pickTrackerMode on every re-evaluation.
  private powerSaveRequested = false
  private coldStart: ColdStartState = createColdStartState()
  private observers: ServiceObservers = {}
  private draining = false
  // Auto-pause + vehicle detectors decide "is the runner stationary / in a
  // vehicle right now"; the pauseLedger below owns *all* span accounting.
  private autoPauseDetector: AutoPauseDetectorState = createAutoPauseState()
  private vehicleDetector: VehicleDetectorState = createVehicleState()
  // Single source of truth for pause accounting. Manual, auto, and vehicle
  // spans are recorded here — detector spans keyed on the triggering sample's
  // timestamp (so a background-drain replay folds the real stationary stretch,
  // not ~0s of wall-clock), manual spans on clock.now(). totalPausedSeconds is
  // the duration of their union, so overlapping auto+vehicle pauses count once
  // and all three kinds share one cumulative 15-minute budget. Fresh per start().
  private pauseLedger = new PauseLedger()
  private pauseLimitFired = false
  private manualResumeBoundaryPending = false

  constructor(private readonly deps: RunSessionServiceDeps) {}

  /** Wire optional observers — analytics + UI surfaces. Idempotent. */
  setObservers(observers: ServiceObservers): void {
    this.observers = observers
  }

  /** Current smoothed pace from the 30s rolling window. Null while buffer is sparse. */
  currentSmoothedPaceSecPerKm(nowMs: number): number | null {
    return this.paceSmoother.currentPaceSecPerKm(nowMs)
  }

  /**
   * Start GPS at full accuracy before the user presses Start, so the chip is
   * already locked when recording begins. The tracker performs a hot handoff
   * when start() is called — no OS subscription restart, no second cold search.
   * No-op if a session is already active.
   */
  async prewarm(onLocation: (sample: { lat: number; lng: number; accuracy: number | null; heading: number | null }) => void): Promise<void> {
    if (this.currentSessionId) return
    await this.deps.tracker.warmUp?.((sample) => {
      onLocation({
        lat: sample.lat,
        lng: sample.lng,
        accuracy: sample.accuracy,
        heading: sample.heading ?? null,
      })
    })
  }

  async cancelPrewarm(): Promise<void> {
    await this.deps.tracker.cancelWarmUp?.()
  }

  /** Start a new session. Returns the freshly-minted sessionId. */
  async start(options: StartRunSessionOptions = {}): Promise<string> {
    if (this.currentSessionId) {
      throw new Error('RunSessionService.start: a session is already active')
    }
    const sessionId = this.deps.idGen.newSessionId()
    const startedAt = new Date(this.deps.clock.now())

    this.kalman = new KalmanLatLng()
    this.paceSmoother.reset()
    this.hygieneLastPoint = null
    this.lastAcceptedWallClockMs = null
    this.downsampleLastKept = null
    this.sequence = 0
    this.lastKmCrossed = 0
    this.currentSessionId = sessionId

    this.coldStart = createColdStartState()
    markColdStart(this.coldStart, startedAt.getTime())
    resetAutoPauseState(this.autoPauseDetector)
    resetVehicleState(this.vehicleDetector)
    // Fresh ledger per session — no pause span survives across runs.
    this.pauseLedger = new PauseLedger()
    // powerSaveRequested intentionally persists across sessions: a marathoner
    // sets it once and it carries into the next run (the toggle shows state).
    this.pauseLimitFired = false
    this.manualResumeBoundaryPending = false

    const initialMode = pickTrackerMode({
      appState: this.appState,
      batteryLevel: this.batteryLevel,
      isCharging: this.isCharging,
      powerSaveRequested: this.powerSaveRequested,
    })
    this.currentMode = initialMode
    this.observers.onModeChange?.(initialMode)

    // Single-active-row invariant: sweep any pre-existing 'active' rows before
    // creating this session so the background task can never attribute the new
    // run's samples to a stale session. Reuses the recovery demotion logic
    // (≥100m → 'stopped' for upload, else discard) through the injected buffer.
    await this.sweepStaleActiveSessions()

    await this.deps.buffer.createSession({
      sessionId,
      matchId: options.matchId ?? null,
      challengeId: options.challengeId ?? null,
      startedAt,
    })
    this.deps.store.getState().start({ sessionId, startedAt })
    await this.deps.tracker.start((sample) => {
      void this.onSample(sample)
    }, configForMode(initialMode))
    await this.deps.stepSource.start(startedAt.getTime())
    return sessionId
  }

  /**
   * AppState change hook. Foreground-resume: drain any background-buffered
   * raw samples through the hygiene pipeline, then re-pick mode.
   */
  async onAppStateChange(state: AppLifecycleState): Promise<void> {
    const prev = this.appState
    this.appState = state
    if (!this.currentSessionId) return
    if (prev !== 'active' && state === 'active') {
      await this.drainBackgroundSamples()
    }
    await this.reEvaluateMode()
  }

  /** Battery level update from the BatteryPort. Re-pick mode if relevant. */
  async onBatteryChange(snapshot: { level: number | null; isCharging: boolean }): Promise<void> {
    this.batteryLevel = snapshot.level
    this.isCharging = snapshot.isCharging
    if (!this.currentSessionId) return
    await this.reEvaluateMode()
  }

  /**
   * Toggle power-save (long-run) mode. Keeps GPS stats accurate (Best accuracy
   * sampled by distance) while the UI drops to a stats-only view; meant for
   * long marathons where battery matters but distance/pace must stay exact.
   * Mirrors the flag to the store so the toggle UI reflects it.
   */
  async setPowerSaveMode(on: boolean): Promise<void> {
    this.powerSaveRequested = on
    this.deps.store.getState().setPowerSaveRequested(on)
    if (!this.currentSessionId) return
    await this.reEvaluateMode()
  }

  pause(): void {
    const nowMs = this.deps.clock.now()
    // A manual pause supersedes any latched detector span — close them so they
    // don't keep growing, then open the manual span. The union merges anything
    // that overlapped, so budget stays correct.
    this.pauseLedger.closeSpan('auto', nowMs)
    this.pauseLedger.closeSpan('vehicle', nowMs)
    this.pauseLedger.openSpan('manual', nowMs)
    resetAutoPauseState(this.autoPauseDetector)
    resetVehicleState(this.vehicleDetector)
    this.deps.store.getState().pause(nowMs)
    this.maybeFirePauseLimit(nowMs)
  }

  resume(): void {
    const nowMs = this.deps.clock.now()
    const wasPaused = this.deps.store.getState().status === 'paused'
    this.pauseLedger.closeSpan('manual', nowMs)
    this.deps.store.getState().resume(nowMs)
    if (wasPaused && this.deps.store.getState().status === 'active') {
      this.prepareManualResumeBoundary()
    }
    this.maybeFirePauseLimit(nowMs)
  }

  async continueStopped(): Promise<void> {
    const state = this.deps.store.getState()
    if (state.status !== 'stopped' || !state.sessionId) {
      throw new Error('RunSessionService.continueStopped: no stopped session to continue')
    }
    if (this.currentSessionId) {
      throw new Error('RunSessionService.continueStopped: a session is already active')
    }

    const nowMs = this.deps.clock.now()
    // Record the stop→continue idle gap as a manual pause span. endedAt is the
    // stop timestamp (all live spans were closed at stop()), so distance
    // excludes the straight chord from the stop location to the continue
    // location and the idle seconds land in pausedDurationSeconds.
    if (state.endedAt) {
      this.pauseLedger.openSpan('manual', state.endedAt.getTime())
      this.pauseLedger.closeSpan('manual', nowMs)
    }

    const desired = pickTrackerMode({
      appState: this.appState,
      batteryLevel: this.batteryLevel,
      isCharging: this.isCharging,
      powerSaveRequested: this.powerSaveRequested,
    })
    this.currentMode = desired
    this.currentSessionId = state.sessionId
    this.observers.onModeChange?.(desired)
    this.pauseLimitFired = false
    // Same boundary reset as a manual resume: null the hygiene/downsample
    // anchors, reset Kalman/pace/detectors, and arm the resume boundary so the
    // first post-continue point is a fresh paused anchor (no distance chord
    // from the pre-stop location). Keeps the existing ledger: the 15-minute
    // budget spans the whole session, including continues.
    this.prepareManualResumeBoundary()

    await this.deps.buffer.markActive(state.sessionId)
    this.deps.store.getState().continueFromStopped()
    await this.deps.tracker.start((sample) => {
      void this.onSample(sample)
    }, configForMode(desired))
    await this.deps.stepSource.start(nowMs)
  }

  async markUploaded(sessionId: string): Promise<void> {
    await this.deps.buffer.markUploaded(sessionId)
  }

  /**
   * Explicit user discard. Stops the tracker, permanently deletes the buffer
   * row (so neither interrupted-session recovery nor the retry queue can ever
   * resurrect and auto-submit it), then drops the in-memory store. Works from
   * both 'active' (mid-run) and 'stopped' (post-stop exit) — in the latter the
   * store still holds the sessionId even though currentSessionId is cleared.
   * Uploaded rows are audit history and are left intact by discardSession.
   * Idempotent.
   */
  async cancel(): Promise<void> {
    await this.deps.tracker.stop()
    await this.deps.stepSource.stop()
    const sessionId = this.currentSessionId ?? this.deps.store.getState().sessionId
    if (sessionId) {
      await this.deps.buffer.discardSession(sessionId)
    }
    this.deps.store.getState().reset()
    this.currentSessionId = null
    this.manualResumeBoundaryPending = false
  }

  /**
   * Demote every pre-existing 'active' buffer row via the shared recovery
   * logic. Recoverable rows (≥ submit minimum) become 'stopped' for the retry
   * queue to upload; the rest are discarded. Driven entirely through the
   * injected buffer port so it stays testable and free of sqlite imports.
   */
  private async sweepStaleActiveSessions(): Promise<void> {
    await recoverInterruptedActiveSessions({
      listActiveSessions: () => this.deps.buffer.listActiveSessions(),
      loadSession: (sessionId) => this.deps.buffer.loadSession(sessionId),
      markStopped: (params) => this.deps.buffer.markStopped(params),
      discardActiveSession: (sessionId) => this.deps.buffer.discardSession(sessionId),
    })
  }

  /** Stop tracker, finalize buffer, transition store to 'stopped'. */
  async stop(): Promise<void> {
    if (!this.currentSessionId) return
    // Drain any background samples that landed since the last app-active tick
    // so the path captured at stop is the full union of fg + bg points.
    await this.drainBackgroundSamples()

    await this.deps.tracker.stop()
    const sessionId = this.currentSessionId

    const nowMs = this.deps.clock.now()
    // Freeze the ledger: close any open span at stop time so the persisted
    // total is stable and later reads (summary UI) don't keep growing.
    this.pauseLedger.closeAll(nowMs)
    this.deps.store.getState().stop(nowMs)

    const finalState = this.deps.store.getState()
    if (!finalState.endedAt) {
      // Defensive: store should have set this. Reconstruct rather than crash.
      throw new Error('RunSessionService.stop: store did not record endedAt')
    }

    const pausedDurationSeconds = this.pauseLedger.totalPausedSeconds(nowMs)

    // Steps are optional garnish — a failing step source must never abort
    // stop() and strand the session un-submittable.
    let rawSteps: number | null = null
    try {
      rawSteps = await this.deps.stepSource.read(nowMs)
      await this.deps.stepSource.stop()
    } catch {
      rawSteps = null
    }
    const movingTimeSeconds = finalState.startedAt
      ? Math.max(0, Math.round((finalState.endedAt.getTime() - finalState.startedAt.getTime()) / 1000) - pausedDurationSeconds)
      : null
    this.deps.store.getState().setSteps(clampStepsForDistance({
      steps: rawSteps,
      distanceMeters: finalState.distanceMeters,
      movingTimeSeconds,
    }))

    await this.deps.buffer.markStopped({
      sessionId,
      endedAt: finalState.endedAt,
      pausedDurationSeconds,
      integrityFlags: finalState.integrityFlags,
    })

    this.currentSessionId = null
  }

  /**
   * Submit a previously-stopped session. Caller supplies a RunSource
   * (typically createGpsLiveSource) and a submit function (typically
   * submitRunSession). On success the buffer row is promoted to 'uploaded'
   * unless the caller defers completion while it performs follow-up work
   * such as linking a match submission.
   */
  async submit(
    sessionId: string,
    deps: SubmitDeps,
    options: SubmitRunSessionOptions = {},
  ): Promise<SubmitRunSessionResult> {
    const session = await deps.source.produce()
    const blockReason = getRunSessionSubmitBlockReason({
      distanceMeters: session.distanceMeters,
      existenceDistanceMeters: runExistenceDistanceMeters(session.path),
    })
    if (blockReason) {
      throw new RunSessionSubmitBlockedError(blockReason)
    }

    const result = await deps.submit({
      source: deps.source.kind,
      externalWorkoutId: session.externalWorkoutId,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      distanceMeters: session.distanceMeters,
      pausedDurationSeconds: session.pausedDurationSeconds,
      path: session.path,
      splits: session.splits,
      avgHeartRate: session.avgHeartRate,
      elevationGainMeters: session.elevationGainMeters,
      integrityFlags: session.integrityFlags,
      steps: session.steps ?? undefined,
    })
    if (options.markUploaded !== false) {
      await this.deps.buffer.markUploaded(sessionId)
    }
    return result
  }

  /**
   * Process one OS sample. Public for tests; production callers go through
   * the tracker callback wired in start().
   */
  async onSample(
    sample: GpsRawSample,
    options: { fromBackground?: boolean } = {},
  ): Promise<void> {
    if (!this.currentSessionId) return

    // Status gate: do not persist while paused/stopped. Store also enforces
    // this on appendPoint, but we should also skip the buffer write.
    const status = this.deps.store.getState().status
    if (status !== 'active') return

    // Long-gap boundary on EVERY ingestion path (foreground onSample or
    // background drain): a >5-min outage between accepted fixes — a tunnel /
    // deep-indoor stretch while moving, or an iOS-suspended background stretch
    // — means the straight chord across the gap is not real distance. The
    // server excludes that chord from its derived distance, so the client must
    // exclude the same chord or a legit run trips distance_path_mismatch.
    this.maybeHandleLongGapBoundary(sample.timestamp, options.fromBackground ?? false)

    // Cold-start: emit on first sample with accuracy ≤ threshold.
    if (sample.accuracy !== null) {
      const fv = recordColdStartSample(this.coldStart, {
        accuracy: sample.accuracy,
        timestamp: sample.timestamp,
      })
      if (fv) {
        this.observers.onFirstValidPoint?.({
          latencyMs: fv.firstValidElapsedMs,
          accuracyM: sample.accuracy,
        })
      }
    }

    // Mock-location flag: surface to UI/server but do NOT drop the point —
    // server-side admin review decides what to do with it.
    const mockFlag = detectMockLocation(toRawSample(sample))
    if (mockFlag) {
      this.deps.store.getState().addIntegrityFlag(mockFlag)
    }

    // Hygiene gate. Both foreground and background use the relaxed accuracy
    // gate: urban-canyon fixes (Bangkok soi, buildings both sides) routinely
    // report 20–35m accuracy, and dropping them starves the distance counter
    // and staleness watchdog while the raw marker keeps moving — field
    // incident 2026-07-10 showed 60s+ distance freezes and a false "GPS lost"
    // banner from exactly this. Kept coarse points are down-weighted by the
    // Kalman smoother and flagged below for server review, so distance
    // inflation stays bounded.
    const verdict = applyHygiene(toRawSample(sample), this.hygieneLastPoint, {
      accuracyGateM: BACKGROUND_ACCURACY_GATE_M,
    })

    // Feed the vehicle-motion detector with position-derived speed BEFORE the
    // drop gate, so sustained vehicle-class travel (whose points hygiene drops
    // for speed_anomaly) still latches the vehicle-paused state + notice rather
    // than freezing the route silently.
    if (verdict.computedSpeed != null && sample.accuracy != null) {
      this.updateVehicleDetector(verdict.computedSpeed, sample.timestamp, sample.accuracy)
    }

    if (verdict.kind === 'drop') {
      // Publish the drop reason so the UI can surface it; quality + last-fix ts
      // are left untouched (a drop is not a new fix). The staleness watchdog,
      // reading lastAcceptedFixTs, catches a run of consecutive drops.
      this.deps.store.getState().setGpsHealth({ lastDropReason: verdict.reason })
      return
    }

    // The accepted point is what hygiene returned. Update the hygiene
    // anchor BEFORE Kalman/downsample so the teleport gate compares against
    // a real GPS reading, not a smoothed estimate.
    this.hygieneLastPoint = verdict.point
    this.lastAcceptedWallClockMs = this.deps.clock.now()

    // Publish live GPS health: this accepted fix resets the staleness watchdog
    // and clears any prior drop reason. Quality is derived from the raw fix
    // accuracy (pre-Kalman), matching what the user sees on the map.
    this.deps.store.getState().setGpsHealth({
      lastAcceptedFixTs: verdict.point.timestamp,
      quality: verdict.point.accuracy < GPS_GOOD_ACCURACY_M ? 'good' : 'poor',
      lastDropReason: null,
    })

    // A kept point past the strict gate (foreground or background) — flag it
    // so server-side review knows the route segment was reconstructed from
    // coarse fixes.
    if (verdict.point.accuracy > ACCURACY_GATE_M) {
      this.deps.store.getState().addIntegrityFlag('low_accuracy_bg')
    }

    // Kalman smoothing on lat/lng. Keep accuracy/timestamp/isPaused as-is.
    const smoothed = this.kalman.smooth({
      lat: verdict.point.lat,
      lng: verdict.point.lng,
      accuracy: verdict.point.accuracy,
      timestamp: verdict.point.timestamp,
    })
    const point: GpsPoint = {
      ...verdict.point,
      lat: smoothed.lat,
      lng: smoothed.lng,
    }

    // Auto-pause detector — see autoPauseDetector.ts for the algorithm.
    // Operates on the post-Kalman point because the smoothed lat/lng matches
    // what the user sees on the map and what distance accumulates against.
    // Speed must be the OS-reported (Doppler) value, NOT point.speed: that one
    // falls back to position-derived speed, which jitter inflates to walking
    // pace on a stationary phone — the detector's median-speed guards would
    // read garbage. null when the OS didn't report one.
    const storeState = this.deps.store.getState()
    const osSpeed = sample.speed != null && sample.speed >= 0 ? sample.speed : null
    const detectorResult = autoPauseUpdate(this.autoPauseDetector, {
      lat: point.lat,
      lng: point.lng,
      timestamp: point.timestamp,
      speed: osSpeed,
      accuracy: point.accuracy,
    })

    if (detectorResult.transition === 'pause') {
      storeState.setAutoPaused(true)
      // Sample-domain start: a background-drain replay opens the span at the
      // stationary sample's ts, not at wall-clock-at-replay.
      this.pauseLedger.openSpan('auto', point.timestamp)
      this.observers.onAutoPause?.()
    } else if (detectorResult.transition === 'resume') {
      this.pauseLedger.closeSpan('auto', point.timestamp)
      storeState.setAutoPaused(false)
      this.observers.onAutoResume?.()
    }

    // Sample-domain "now": during a drain the budget grows with the replayed
    // sample timestamps, so a long backgrounded pause still trips the limit.
    this.maybeFirePauseLimit(point.timestamp)

    // Pause-span containment: a sample whose timestamp lands inside any recorded
    // pause span (manual/auto/vehicle) is a paused point — including a
    // background-drained sample replayed after resume, whose ts falls inside the
    // now-closed manual span. This kills the "pause → ride → resume adds the
    // ride" exploit deterministically (no dependence on drain-vs-foreground-fix
    // ordering) and covers the pre-latch ramp-up that the detectors alone miss.
    const insidePauseSpan = this.pauseLedger.isInsidePauseSpan(point.timestamp)
    const markManualResumeBoundary = this.manualResumeBoundaryPending
    const shouldMarkPaused =
      markManualResumeBoundary || insidePauseSpan || detectorResult.paused || this.vehicleDetector.vehicle
    const recordedPoint: GpsPoint = shouldMarkPaused === point.isPaused
      ? point
      : { ...point, isPaused: shouldMarkPaused }
    if (markManualResumeBoundary) {
      this.manualResumeBoundaryPending = false
    }

    // Push every accepted point to the live UI so distance/pace feel realtime.
    // The durable upload buffer below still uses the 5s downsample to stay
    // under server path caps.
    this.deps.store.getState().appendPoint(recordedPoint)
    this.paceSmoother.push(recordedPoint)

    // Km-marker: fire once each time a new km boundary is crossed.
    const currentKm = Math.floor(this.deps.store.getState().distanceMeters / 1000)
    if (currentKm > this.lastKmCrossed && currentKm >= 1) {
      this.lastKmCrossed = currentKm
      this.observers.onKmMarker?.({ km: currentKm })
    }

    // Fixed 5s downsample for persistence/upload.
    if (!markManualResumeBoundary && !shouldKeep(recordedPoint, this.downsampleLastKept)) {
      return
    }
    this.downsampleLastKept = recordedPoint

    // Persist the downsampled upload path. The live UI already received the
    // full-rate accepted point above.
    this.sequence += 1
    await this.deps.buffer.appendPoint(this.currentSessionId, this.sequence, recordedPoint)
  }

  /**
   * Live foreground poll. Drains any background-buffered raw samples through
   * the pipeline without an app-state transition.
   *
   * Why this exists: on some Android OEMs (e.g. MIUI) the OS coalesces the
   * foreground `watchPositionAsync` and the background fg-service location
   * request into one stream and delivers it to the background TaskManager
   * task — starving the in-process foreground callback. The samples land in
   * sqlite but, with no app-state change, never reach the live store, so the
   * route/distance freeze until stop(). A ~1s factory-driven poll calls this
   * so the route follows in real time regardless of which subscription the OS
   * feeds. No-op on healthy devices (sqlite is empty while the fg watch feeds
   * the store directly) and re-entrancy-guarded against the stop()/resume drain.
   */
  async pollBackgroundSamples(): Promise<void> {
    await this.drainBackgroundSamples()
  }

  /**
   * Replay raw samples persisted by the background TaskManager task through
   * the same hygiene → Kalman → downsample pipeline used in the foreground.
   * Long sample gaps (suspected iOS suspension) are detected inside onSample
   * (maybeHandleLongGapBoundary), so a >5-min gap is excluded identically here
   * and on the foreground path.
   */
  private async drainBackgroundSamples(): Promise<void> {
    if (!this.currentSessionId || this.draining) return
    this.draining = true
    try {
      const samples = await this.deps.buffer.drainBgRawSamples(this.currentSessionId)
      if (samples.length === 0) return

      for (const raw of samples) {
        await this.onSample(
          {
            lat: raw.lat,
            lng: raw.lng,
            accuracy: raw.accuracy,
            altitude: raw.altitude,
            speed: raw.speed,
            timestamp: raw.timestamp,
            mocked: raw.mocked,
          },
          { fromBackground: true },
        )
      }
    } finally {
      this.draining = false
    }
  }

  private async reEvaluateMode(): Promise<void> {
    const desired = pickTrackerMode({
      appState: this.appState,
      batteryLevel: this.batteryLevel,
      isCharging: this.isCharging,
      powerSaveRequested: this.powerSaveRequested,
    })
    if (desired === this.currentMode) return
    this.currentMode = desired
    this.observers.onModeChange?.(desired)
    await this.deps.tracker.setMode(configForMode(desired))
  }

  /**
   * Push a position-derived speed sample to the vehicle-motion detector and
   * react to latch transitions. Enter opens a vehicle pause span; exit closes
   * it — both keyed on the sample's timestamp. Mirrors the auto-pause path.
   */
  private updateVehicleDetector(speed: number, timestamp: number, accuracy: number): void {
    const result = vehicleUpdate(this.vehicleDetector, { speed, timestamp, accuracy })
    if (result.transition === 'enter') {
      this.deps.store.getState().setVehiclePaused(true)
      this.pauseLedger.openSpan('vehicle', timestamp)
      this.observers.onVehicleDetected?.()
    } else if (result.transition === 'exit') {
      this.pauseLedger.closeSpan('vehicle', timestamp)
      this.deps.store.getState().setVehiclePaused(false)
      this.observers.onVehicleCleared?.()
    }
    this.maybeFirePauseLimit(timestamp)
  }

  /**
   * Two accepted-fix-gap boundaries, applied on ANY ingestion path and keyed
   * off `hygieneLastPoint` (the last accepted point):
   *
   *   - > DETECTOR_EVIDENCE_GAP_MS (30s): close any OPEN auto/vehicle span at
   *     the last pre-gap sample ts. The detectors were reset or starved when
   *     fixes stopped, so nothing else would ever emit the resume/exit
   *     transition that closes the span — leaving it open counts the whole
   *     hole as paused, deflating activeDuration (average pace reads too
   *     fast; false paused_exceeds_duration risk).
   *
   *   - > BG_GAP_THRESHOLD_MS (5min, suspected iOS suspension): additionally
   *     arm a manual-resume boundary, excluding the straight chord across the
   *     gap (matching the server's gap-excluded distance recompute) and flag
   *     the suspension for review. `prepareManualResumeBoundary` nulls the
   *     hygiene anchor, so this fires at most once per gap and never
   *     double-applies across the fg/drain paths. The gap itself is NOT a
   *     pause span — duration keeps counting, only the distance chord is
   *     excluded.
   *
   * A gap needs BOTH the sample-timestamp delta AND real time to exceed the
   * threshold. Background-drained samples are replayed fast in wall-clock but
   * carry the real sample-time gap, so `fromBackground` satisfies the real-time
   * side directly. On the foreground path we require `clock.now()` to have
   * actually advanced past the threshold since the last accepted fix, so an
   * untrusted GPS timestamp claiming a jump — or deliberately sparse timestamps
   * with no elapsed time — never fabricates a gap.
   */
  private maybeHandleLongGapBoundary(sampleTs: number, fromBackground: boolean): void {
    const prev = this.hygieneLastPoint
    if (!prev) return
    const gapMs = sampleTs - prev.timestamp
    if (gapMs <= DETECTOR_EVIDENCE_GAP_MS) return
    const realTimeElapsedBeyond = (thresholdMs: number): boolean =>
      fromBackground ||
      (this.lastAcceptedWallClockMs != null &&
        this.deps.clock.now() - this.lastAcceptedWallClockMs > thresholdMs)

    // Evidence-hole boundary (> 30s): close any latched detector span at the
    // LAST pre-gap sample ts — the pause stopped being evidenced when fixes
    // stopped. See DETECTOR_EVIDENCE_GAP_MS.
    if (realTimeElapsedBeyond(DETECTOR_EVIDENCE_GAP_MS)) {
      this.closeDetectorSpansAt(prev.timestamp)
    }

    // Suspension boundary (> 5min): additionally exclude the straight chord
    // across the gap from distance (matching the server's gap-excluded
    // recompute) and flag the suspension for review.
    if (gapMs <= BG_GAP_THRESHOLD_MS) return
    if (!realTimeElapsedBeyond(BG_GAP_THRESHOLD_MS)) return
    this.deps.store.getState().addIntegrityFlag('ios_background_suspended')
    this.prepareManualResumeBoundary()
  }

  /**
   * Force-close latched detector spans at `ts` and clear the matching latch
   * state + store flags, so the closed span and the detectors/UI agree. Manual
   * spans are untouched — the user did intend that pause.
   */
  private closeDetectorSpansAt(ts: number): void {
    if (this.pauseLedger.hasOpenSpan('auto')) {
      this.pauseLedger.closeSpan('auto', ts)
      resetAutoPauseState(this.autoPauseDetector)
      this.deps.store.getState().setAutoPaused(false)
    }
    if (this.pauseLedger.hasOpenSpan('vehicle')) {
      this.pauseLedger.closeSpan('vehicle', ts)
      resetVehicleState(this.vehicleDetector)
      this.deps.store.getState().setVehiclePaused(false)
    }
  }

  private prepareManualResumeBoundary(): void {
    this.manualResumeBoundaryPending = true
    this.hygieneLastPoint = null
    this.lastAcceptedWallClockMs = null
    this.downsampleLastKept = null
    this.kalman = new KalmanLatLng()
    this.paceSmoother.reset()
    resetAutoPauseState(this.autoPauseDetector)
    resetVehicleState(this.vehicleDetector)
  }

  /**
   * Cumulative paused seconds (union of manual + auto + vehicle spans) up to
   * `nowTs`. Single source read by the UI, the persisted-at-stop value, and the
   * 15-minute budget check — they can no longer disagree.
   */
  pauseBudgetUsedSeconds(nowTs: number): number {
    return this.pauseLedger.totalPausedSeconds(nowTs)
  }

  private maybeFirePauseLimit(nowTs: number): void {
    if (this.pauseLimitFired) return
    const totalPausedSeconds = this.pauseLedger.totalPausedSeconds(nowTs)
    if (totalPausedSeconds < RUN_PAUSE_LIMIT_SECONDS) return
    this.pauseLimitFired = true
    this.observers.onPauseLimitReached?.({ totalPausedSeconds })
  }
}

/**
 * Map our port-level GpsRawSample (nullable accuracy/altitude/speed) to the
 * RawSample shape expected by gpsHygiene. Pure helper, no logic.
 */
function toRawSample(sample: GpsRawSample): RawSample {
  return {
    lat: sample.lat,
    lng: sample.lng,
    accuracy: sample.accuracy,
    altitude: sample.altitude,
    speed: sample.speed,
    timestamp: sample.timestamp,
    mocked: sample.mocked,
  }
}
