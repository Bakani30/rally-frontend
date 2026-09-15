import { beforeEach, describe, expect, it } from 'vitest'
import type {
  ClockPort,
  GpsRawSample,
  GpsTrackerPort,
  IdGeneratorPort,
  SessionBufferPort,
} from './runSessionPorts'
import type { StepSourcePort } from './stepSourcePort'
import type { GpsPoint } from '../gps/gpsTypes'
import type { StoredSession, StoredSessionWithPath } from '../offline/sessionBuffer'
import { GPS_LOST_STALENESS_MS, RunSessionService } from './runSessionService'
import { useRunSessionStore } from './runSessionStore'

/**
 * Field-replay regression test — 2026-07-10 walker incident (Soi Pracha
 * Songkhro 27, Bangkok).
 *
 * Screen recordings of the OTA build showed, for a user WALKING continuously
 * in an urban canyon (buildings both sides, GPS accuracy oscillating well
 * above 20m):
 *
 *   - live distance frozen for 40–70s stretches (90m for >1 min) while the
 *     map marker kept moving
 *   - auto-pause latched mid-walk and never released until the user had
 *     drifted far enough for the runner-pace resume window
 *   - a false "สัญญาณ GPS หาย" (GPS lost) banner while fixes kept arriving
 *
 * This test replays that walk — 1.2 m/s, 1Hz fixes, accuracy swinging
 * 15–34m, OS speed unavailable (as with distance-filtered power-save fixes),
 * a genuine 20s standstill at a crossing — through the real
 * RunSessionService pipeline (hygiene → Kalman → auto-pause → distance) and
 * pins the fixed behavior:
 *
 *   1. distance keeps accruing through coarse-accuracy stretches
 *   2. auto-pause latches at the standstill (correct) but releases within
 *      the walk-resume window once walking restarts
 *   3. accepted fixes never go stale enough to trip the GPS-lost watchdog
 */

// ---------------------------------------------------------------------------
// Test doubles (same shape as runSessionService.test.ts)
// ---------------------------------------------------------------------------

class FakeClock implements ClockPort {
  private current: number
  constructor(start: number) {
    this.current = start
  }
  now(): number {
    return this.current
  }
  setTo(ms: number): void {
    this.current = ms
  }
}

class FakeIdGen implements IdGeneratorPort {
  newSessionId(): string {
    return 'sid-field-replay'
  }
}

class FakeTracker implements GpsTrackerPort {
  public callback: ((s: GpsRawSample) => void) | null = null
  async start(onSample: (s: GpsRawSample) => void): Promise<void> {
    this.callback = onSample
  }
  async setMode(): Promise<void> {}
  async stop(): Promise<void> {
    this.callback = null
  }
  emit(sample: GpsRawSample): void {
    if (!this.callback) throw new Error('tracker not started')
    this.callback(sample)
  }
}

class FakeBuffer implements SessionBufferPort {
  public path: GpsPoint[] = []
  async createSession(): Promise<void> {}
  async appendPoint(_id: string, _seq: number, point: GpsPoint): Promise<void> {
    this.path.push(point)
  }
  async markStopped(): Promise<void> {}
  async markActive(): Promise<void> {}
  async loadSession(): Promise<StoredSessionWithPath | null> {
    return null
  }
  async markUploaded(): Promise<void> {}
  async listActiveSessions(): Promise<StoredSession[]> {
    return []
  }
  async discardSession(): Promise<void> {}
  async drainBgRawSamples(): Promise<[]> {
    return []
  }
}

class FakeStepSource implements StepSourcePort {
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async read(): Promise<number | null> {
    return null
  }
}

// ---------------------------------------------------------------------------
// Deterministic walker trace
// ---------------------------------------------------------------------------

const T0 = 1_700_000_000_000
const START_LAT = 13.789
const START_LNG = 100.545
const WALK_SPEED_MPS = 1.2
const M_PER_DEG_LAT = 111_320

type TracePhase = {
  seconds: number
  moving: boolean
  /** [min, max] reported accuracy band for this stretch (meters). */
  accuracyBand: [number, number]
}

/**
 * One fix per second. Northbound walk with deterministic urban-canyon noise:
 * per-phase accuracy bands (clear soi vs building-shadow stretch), ±3m
 * lateral jitter, OS speed always null (what a distance-filtered power-save
 * subscription delivers).
 */
function buildTrace(phases: TracePhase[]): GpsRawSample[] {
  const samples: GpsRawSample[] = []
  let northMeters = 0
  let tick = 0
  for (const phase of phases) {
    const [accMin, accMax] = phase.accuracyBand
    for (let s = 0; s < phase.seconds; s++, tick++) {
      if (phase.moving) northMeters += WALK_SPEED_MPS
      const lateralJitterM = Math.sin(tick * 1.3) * 3
      const accuracy = Math.round(
        accMin + ((accMax - accMin) * (1 + Math.sin(tick * 0.7))) / 2,
      )
      samples.push({
        lat: START_LAT + northMeters / M_PER_DEG_LAT,
        lng:
          START_LNG +
          lateralJitterM /
            (M_PER_DEG_LAT * Math.cos((START_LAT * Math.PI) / 180)),
        accuracy,
        altitude: null,
        speed: null,
        timestamp: T0 + tick * 1_000,
        mocked: null,
      })
    }
  }
  return samples
}

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('field replay — 2026-07-10 urban-canyon walker incident', () => {
  beforeEach(() => useRunSessionStore.getState().reset())

  it('keeps counting a walker through coarse accuracy, releases auto-pause, never trips GPS-lost', async () => {
    const clock = new FakeClock(T0)
    const tracker = new FakeTracker()
    const service = new RunSessionService({
      tracker,
      buffer: new FakeBuffer(),
      store: useRunSessionStore,
      clock,
      idGen: new FakeIdGen(),
      stepSource: new FakeStepSource(),
    })
    await service.start()

    // Modeled on the incident: clear stretch → wait at a crossing (auto-pause
    // latches, correctly) → walk resumes INTO a 40s building-shadow stretch
    // where every fix reports 26–34m. The OTA build starved here: hygiene
    // dropped the whole shadow stretch (distance froze, watchdog tripped) and
    // the strict resume quality-gate kept the pause latched long after.
    const walkA = { seconds: 60, moving: true, accuracyBand: [15, 22] as [number, number] }
    const standstill = { seconds: 20, moving: false, accuracyBand: [16, 20] as [number, number] }
    const walkShadow = { seconds: 40, moving: true, accuracyBand: [26, 34] as [number, number] }
    const walkClear = { seconds: 80, moving: true, accuracyBand: [15, 24] as [number, number] }
    const trace = buildTrace([walkA, standstill, walkShadow, walkClear])

    let pauseLatched = false
    let resumeTickAfterRestart: number | null = null
    let maxAcceptedStalenessMs = 0
    const restartTick = walkA.seconds + standstill.seconds

    for (let i = 0; i < trace.length; i++) {
      const fix = trace[i]
      clock.setTo(fix.timestamp)
      tracker.emit(fix)
      await flushMicrotasks()

      const state = useRunSessionStore.getState()
      if (state.isAutoPaused) pauseLatched = true
      if (
        resumeTickAfterRestart === null &&
        i >= restartTick &&
        pauseLatched &&
        !state.isAutoPaused
      ) {
        resumeTickAfterRestart = i - restartTick
      }
      const lastAccepted = state.gpsHealth.lastAcceptedFixTs
      if (lastAccepted !== null) {
        maxAcceptedStalenessMs = Math.max(maxAcceptedStalenessMs, fix.timestamp - lastAccepted)
      }
    }

    const state = useRunSessionStore.getState()
    const trueMovingMeters =
      (walkA.seconds + walkShadow.seconds + walkClear.seconds) * WALK_SPEED_MPS // 216m

    // 1. Distance keeps accruing despite 15–34m accuracy the whole way.
    //    Allow loss for Kalman lag + the paused resume ramp, but the field
    //    incident (90m frozen for 60s+, ~40% of the walk uncounted) must fail.
    expect(state.distanceMeters).toBeGreaterThan(trueMovingMeters * 0.8)
    expect(state.distanceMeters).toBeLessThan(trueMovingMeters * 1.15)

    // 2. The genuine standstill latched auto-pause (the detector still works)…
    expect(pauseLatched).toBe(true)
    // …but walking again released it within the walk-resume window (12m at
    // 1.2 m/s = 10s, +slack). In the incident this stayed latched for 60-70s.
    expect(resumeTickAfterRestart).not.toBeNull()
    expect(resumeTickAfterRestart!).toBeLessThanOrEqual(15)
    expect(state.isAutoPaused).toBe(false)

    // 3. Accepted fixes never went stale enough for the GPS-lost watchdog —
    //    the false "สัญญาณ GPS หาย" banner cannot fire on this walk.
    expect(maxAcceptedStalenessMs).toBeLessThan(GPS_LOST_STALENESS_MS)
  })
})
