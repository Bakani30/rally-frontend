import { beforeEach, describe, expect, it } from 'vitest'
import type { GpsPoint } from '../gps/gpsTypes'
import { recoverInterruptedActiveSessions } from '../offline/interruptedSessionRecovery'
import type { StoredSession, StoredSessionWithPath } from '../offline/sessionBuffer'
import type {
  BgRawSample,
  ClockPort,
  GpsRawSample,
  GpsTrackerPort,
  IdGeneratorPort,
  SessionBufferPort,
} from './runSessionPorts'
import type { StepSourcePort } from './stepSourcePort'
import {
  RUN_SUBMIT_MIN_DISTANCE_METERS,
  RunSessionSubmitBlockedError,
} from './runSessionSubmitRules'
import {
  GPS_LOST_STALENESS_MS,
  RunSessionService,
  resolveLiveGpsQuality,
} from './runSessionService'
import { useRunSessionStore } from './runSessionStore'

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

class FakeClock implements ClockPort {
  private current: number
  constructor(start: number) {
    this.current = start
  }
  now(): number {
    return this.current
  }
  advance(ms: number): void {
    this.current += ms
  }
  setTo(ms: number): void {
    this.current = ms
  }
}

class FakeIdGen implements IdGeneratorPort {
  constructor(private readonly id: string) {}
  newSessionId(): string {
    return this.id
  }
}

class FakeTracker implements GpsTrackerPort {
  public started = false
  public callback: ((s: GpsRawSample) => void) | null = null
  public stopCalls = 0
  public modeChanges = 0

  async start(onSample: (s: GpsRawSample) => void): Promise<void> {
    this.started = true
    this.callback = onSample
  }
  async setMode(): Promise<void> {
    this.modeChanges += 1
  }
  async stop(): Promise<void> {
    this.started = false
    this.stopCalls += 1
  }
  emit(sample: GpsRawSample): void {
    if (!this.callback) throw new Error('tracker not started')
    this.callback(sample)
  }
}

class FakeBuffer implements SessionBufferPort {
  public sessions = new Map<
    string,
    {
      sessionId: string
      matchId: string | null
      challengeId: string | null
      startedAt: Date
      endedAt: Date | null
      status: 'active' | 'stopped' | 'uploaded'
      pausedDurationSeconds: number
      integrityFlags: string[]
      path: GpsPoint[]
    }
  >()

  async createSession(p: {
    sessionId: string
    matchId?: string | null
    challengeId?: string | null
    startedAt: Date
  }): Promise<void> {
    this.sessions.set(p.sessionId, {
      sessionId: p.sessionId,
      matchId: p.matchId ?? null,
      challengeId: p.challengeId ?? null,
      startedAt: p.startedAt,
      endedAt: null,
      status: 'active',
      pausedDurationSeconds: 0,
      integrityFlags: [],
      path: [],
    })
  }
  async appendPoint(sessionId: string, _sequence: number, point: GpsPoint): Promise<void> {
    const s = this.sessions.get(sessionId)
    if (!s) throw new Error(`appendPoint: session ${sessionId} not in buffer`)
    s.path.push(point)
  }
  async markStopped(p: {
    sessionId: string
    endedAt: Date
    pausedDurationSeconds: number
    integrityFlags: string[]
  }): Promise<void> {
    const s = this.sessions.get(p.sessionId)
    if (!s) throw new Error('markStopped: not found')
    s.endedAt = p.endedAt
    s.pausedDurationSeconds = p.pausedDurationSeconds
    s.integrityFlags = p.integrityFlags
    s.status = 'stopped'
  }
  async markActive(sessionId: string): Promise<void> {
    const s = this.sessions.get(sessionId)
    if (!s) throw new Error('markActive: not found')
    s.endedAt = null
    s.status = 'active'
  }
  async loadSession(sessionId: string): Promise<StoredSessionWithPath | null> {
    const s = this.sessions.get(sessionId)
    if (!s) return null
    return {
      sessionId: s.sessionId,
      matchId: s.matchId,
      challengeId: s.challengeId,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      status: s.status,
      source: 'gps_live',
      pausedDurationSeconds: s.pausedDurationSeconds,
      integrityFlags: s.integrityFlags,
      attempts: 0,
      lastErrorCode: null,
      path: [...s.path],
    }
  }
  async markUploaded(sessionId: string): Promise<void> {
    const s = this.sessions.get(sessionId)
    if (!s) throw new Error('markUploaded: not found')
    s.status = 'uploaded'
  }
  async listActiveSessions(): Promise<StoredSession[]> {
    return [...this.sessions.values()]
      .filter((s) => s.status === 'active')
      .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
      .map((s) => ({
        sessionId: s.sessionId,
        matchId: s.matchId,
        challengeId: s.challengeId,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        status: s.status,
        source: 'gps_live',
        pausedDurationSeconds: s.pausedDurationSeconds,
        integrityFlags: s.integrityFlags,
        attempts: 0,
        lastErrorCode: null,
      }))
  }
  // Fail the next N discardSession calls to simulate a transient SQLite error.
  public discardFailuresRemaining = 0
  async discardSession(sessionId: string): Promise<void> {
    if (this.discardFailuresRemaining > 0) {
      this.discardFailuresRemaining -= 1
      throw new Error('discardSession: sqlite write failed')
    }
    const s = this.sessions.get(sessionId)
    if (!s) return
    // Explicit user discard removes active/stopped rows; uploaded rows are
    // audit history and must survive.
    if (s.status === 'active' || s.status === 'stopped') {
      this.sessions.delete(sessionId)
    }
  }
  // Samples the OEM routed to the background fg-service task (sqlite) instead
  // of the foreground watch. Drained + cleared on each call, like the real one.
  public bgQueue: BgRawSample[] = []
  async drainBgRawSamples(): Promise<BgRawSample[]> {
    const out = this.bgQueue
    this.bgQueue = []
    return out
  }
}

class FakeStepSource implements StepSourcePort {
  public startCalls = 0
  public stopCalls = 0
  public steps: number | null = null
  public throwOnRead = false

  async start(): Promise<void> {
    this.startCalls += 1
  }
  async stop(): Promise<void> {
    this.stopCalls += 1
  }
  async read(): Promise<number | null> {
    if (this.throwOnRead) throw new Error('pedometer exploded')
    return this.steps
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const T0 = 1_700_000_000_000

function buildService(opts: { startMs?: number; sessionId?: string } = {}) {
  const clock = new FakeClock(opts.startMs ?? T0)
  const idGen = new FakeIdGen(opts.sessionId ?? 'sid-test')
  const tracker = new FakeTracker()
  const buffer = new FakeBuffer()
  const stepSource = new FakeStepSource()
  const service = new RunSessionService({
    tracker,
    buffer,
    store: useRunSessionStore,
    clock,
    idGen,
    stepSource,
  })
  return { service, clock, idGen, tracker, buffer, stepSource }
}

const sample = (overrides: Partial<GpsRawSample> = {}): GpsRawSample => ({
  lat: 13.700,
  lng: 100.500,
  accuracy: 5,
  altitude: null,
  speed: null,
  timestamp: T0,
  mocked: null,
  ...overrides,
})

describe('RunSessionService.start', () => {
  beforeEach(() => useRunSessionStore.getState().reset())

  it('mints sessionId, transitions store, creates buffer row, starts tracker', async () => {
    const { service, tracker, buffer } = buildService({ sessionId: 'sid-1' })
    const id = await service.start()
    expect(id).toBe('sid-1')
    expect(tracker.started).toBe(true)
    expect(buffer.sessions.get('sid-1')?.status).toBe('active')
    expect(useRunSessionStore.getState().status).toBe('active')
    expect(useRunSessionStore.getState().sessionId).toBe('sid-1')
  })

  it('persists match context with the session row', async () => {
    const { service, buffer } = buildService({ sessionId: 'sid-match' })
    await service.start({ matchId: 'match-1' })
    expect(buffer.sessions.get('sid-match')?.matchId).toBe('match-1')
  })

  it('persists challenge context with the session row', async () => {
    const { service, buffer } = buildService({ sessionId: 'sid-challenge' })
    await service.start({ challengeId: 'challenge-1' })
    expect(buffer.sessions.get('sid-challenge')?.challengeId).toBe('challenge-1')
  })

  it('rejects double start', async () => {
    const { service } = buildService()
    await service.start()
    await expect(service.start()).rejects.toThrow(/already active/)
  })
})

describe('RunSessionService.cancel — explicit discard', () => {
  beforeEach(() => useRunSessionStore.getState().reset())

  it('discards the active buffer row so a later recovery pass finds nothing', async () => {
    const { service, tracker, buffer } = buildService()
    await service.start()
    // Build a genuinely recoverable path (≥100m) to prove even a run that
    // WOULD recover is gone forever once the user explicitly cancels.
    tracker.emit(sample({ timestamp: T0 }))
    tracker.emit(sample({ lat: 13.7 + 150 / 111_320, timestamp: T0 + 60_000, speed: 2.5 }))
    await waitForMicrotasks()
    expect(buffer.sessions.get('sid-test')?.status).toBe('active')

    await service.cancel()

    expect(buffer.sessions.has('sid-test')).toBe(false)
    expect(useRunSessionStore.getState().status).toBe('idle')

    const result = await recoverInterruptedActiveSessions({
      listActiveSessions: () => buffer.listActiveSessions(),
      loadSession: (id) => buffer.loadSession(id),
      markStopped: (p) => buffer.markStopped(p),
      discardActiveSession: (id) => buffer.discardSession(id),
    })
    expect(result).toEqual({ recovered: 0, discarded: 0 })
  })

  it('discards a stopped buffer row when the user exits after stop', async () => {
    const { service, clock, tracker, buffer } = buildService()
    await service.start()
    tracker.emit(sample({ timestamp: T0 }))
    tracker.emit(sample({ lat: 13.7 + 150 / 111_320, timestamp: T0 + 60_000, speed: 2.5 }))
    await waitForMicrotasks()
    clock.setTo(T0 + 60_000)
    await service.stop()
    expect(buffer.sessions.get('sid-test')?.status).toBe('stopped')

    // Explicit exit-from-stopped: currentSessionId is already null, so cancel
    // must resolve the id from the store's retained stopped session.
    await service.cancel()

    expect(buffer.sessions.has('sid-test')).toBe(false)
  })

  it('reports a failed discard and leaves state a retry can complete from (no resurrection)', async () => {
    const { service, tracker, buffer } = buildService()
    await service.start()
    tracker.emit(sample({ timestamp: T0 }))
    tracker.emit(sample({ lat: 13.7 + 150 / 111_320, timestamp: T0 + 60_000, speed: 2.5 }))
    await waitForMicrotasks()

    // First discard throws (SQLite failure). cancel() MUST surface it — a
    // swallowed failure lets the screen navigate away while the buffer row
    // survives, and the retry pipeline later auto-submits the discarded run.
    buffer.discardFailuresRemaining = 1
    await expect(service.cancel()).rejects.toThrow(/sqlite write failed/)

    // Store is NOT reset on failure, so a retry of cancel() can still resolve
    // the session and complete the discard (discardSession is idempotent).
    expect(useRunSessionStore.getState().sessionId).toBe('sid-test')
    expect(buffer.sessions.get('sid-test')?.status).toBe('active')

    // Retry succeeds: row gone, store idle.
    await service.cancel()
    expect(buffer.sessions.has('sid-test')).toBe(false)
    expect(useRunSessionStore.getState().status).toBe('idle')

    // A recovery pass after the successful retry resurrects nothing.
    const result = await recoverInterruptedActiveSessions({
      listActiveSessions: () => buffer.listActiveSessions(),
      loadSession: (id) => buffer.loadSession(id),
      markStopped: (p) => buffer.markStopped(p),
      discardActiveSession: (id) => buffer.discardSession(id),
    })
    expect(result).toEqual({ recovered: 0, discarded: 0 })
  })

  it('never deletes an already-uploaded row on cancel (audit history preserved)', async () => {
    const { service, clock, tracker, buffer } = buildService()
    await service.start()
    tracker.emit(sample({ timestamp: T0 }))
    tracker.emit(sample({ lat: 13.7 + 150 / 111_320, timestamp: T0 + 60_000, speed: 2.5 }))
    await waitForMicrotasks()
    clock.setTo(T0 + 60_000)
    await service.stop()
    await service.markUploaded('sid-test')
    expect(buffer.sessions.get('sid-test')?.status).toBe('uploaded')

    await service.cancel()

    expect(buffer.sessions.get('sid-test')?.status).toBe('uploaded')
  })
})

describe('RunSessionService.start — stale active-row sweep', () => {
  beforeEach(() => useRunSessionStore.getState().reset())

  const seedStale = (
    buffer: ReturnType<typeof buildService>['buffer'],
    sessionId: string,
    path: GpsPoint[],
  ) => {
    buffer.sessions.set(sessionId, {
      sessionId,
      matchId: null,
      challengeId: null,
      startedAt: new Date(T0 - 100_000),
      endedAt: null,
      status: 'active',
      pausedDurationSeconds: 0,
      integrityFlags: [],
      path,
    })
  }

  it('demotes a recoverable stale active row to stopped before creating the new session', async () => {
    const { service, buffer } = buildService({ sessionId: 'sid-new' })
    seedStale(buffer, 'sid-stale', [
      { lat: 13.7, lng: 100.5, accuracy: 5, timestamp: T0 - 100_000, isPaused: false },
      { lat: 13.7 + 150 / 111_320, lng: 100.5, accuracy: 5, timestamp: T0 - 40_000, isPaused: false },
    ])

    await service.start()

    expect(buffer.sessions.get('sid-stale')?.status).toBe('stopped')
    expect(buffer.sessions.get('sid-new')?.status).toBe('active')
    const actives = await buffer.listActiveSessions()
    expect(actives.map((s) => s.sessionId)).toEqual(['sid-new'])
  })

  it('discards a sub-distance stale active row before creating the new session', async () => {
    const { service, buffer } = buildService({ sessionId: 'sid-new' })
    seedStale(buffer, 'sid-stale', [
      { lat: 13.7, lng: 100.5, accuracy: 5, timestamp: T0 - 100_000, isPaused: false },
      { lat: 13.7 + 20 / 111_320, lng: 100.5, accuracy: 5, timestamp: T0 - 40_000, isPaused: false },
    ])

    await service.start()

    expect(buffer.sessions.has('sid-stale')).toBe(false)
    expect(buffer.sessions.get('sid-new')?.status).toBe('active')
    const actives = await buffer.listActiveSessions()
    expect(actives.map((s) => s.sessionId)).toEqual(['sid-new'])
  })
})

describe('RunSessionService.pollBackgroundSamples', () => {
  beforeEach(() => useRunSessionStore.getState().reset())

  it('surfaces background-buffered samples to the live store mid-run', async () => {
    // Repro: on some Android OEMs (MIUI) the OS routes location fixes to the
    // background fg-service task — sqlite — and starves the foreground watch.
    // Without periodic polling the live route stays empty until stop(). The
    // poll drains sqlite through the same pipeline so the route follows live.
    const { service, buffer } = buildService()
    await service.start()
    buffer.bgQueue.push(
      { lat: 13.70000, lng: 100.5, accuracy: 5, altitude: null, speed: null, timestamp: T0, mocked: null },
      { lat: 13.70010, lng: 100.5, accuracy: 5, altitude: null, speed: null, timestamp: T0 + 2000, mocked: null },
    )
    expect(useRunSessionStore.getState().path).toHaveLength(0)

    await service.pollBackgroundSamples()

    expect(useRunSessionStore.getState().path).toHaveLength(2)
    expect(useRunSessionStore.getState().distanceMeters).toBeGreaterThan(5)
  })

  it('is a no-op when no session is active', async () => {
    const { service } = buildService()
    await service.pollBackgroundSamples()
    expect(useRunSessionStore.getState().path).toHaveLength(0)
  })

  it('keeps a coarse background sample via the relaxed gate and flags it', async () => {
    // 30m fix: dropped by the strict 20m foreground gate, but background drops
    // would leave a hole the live line bridges with a straight chord. The
    // relaxed background gate keeps it and flags it for server review.
    const { service, buffer } = buildService()
    await service.start()
    buffer.bgQueue.push({
      lat: 13.7, lng: 100.5, accuracy: 30, altitude: null, speed: null, timestamp: T0, mocked: null,
    })

    await service.pollBackgroundSamples()

    expect(useRunSessionStore.getState().path).toHaveLength(1)
    expect(useRunSessionStore.getState().integrityFlags).toContain('low_accuracy_bg')
  })

  it('keeps a coarse foreground sample via the relaxed gate and flags it', async () => {
    // Foreground now uses the same relaxed 35m gate as background: urban-canyon
    // fixes routinely report 20-35m, and dropping them froze distance and
    // tripped the false "GPS lost" watchdog (2026-07-10 field incident).
    const { service, tracker } = buildService()
    await service.start()
    tracker.emit(sample({ accuracy: 30 }))
    await waitForMicrotasks()
    expect(useRunSessionStore.getState().path).toHaveLength(1)
    expect(useRunSessionStore.getState().integrityFlags).toContain('low_accuracy_bg')
  })

  it('still drops a foreground sample past the relaxed gate', async () => {
    const { service, tracker } = buildService()
    await service.start()
    tracker.emit(sample({ accuracy: 36 }))
    await waitForMicrotasks()
    expect(useRunSessionStore.getState().path).toHaveLength(0)
  })
})

describe('RunSessionService.onSample — pipeline', () => {
  beforeEach(() => useRunSessionStore.getState().reset())

  it('drops samples that fail accuracy gate', async () => {
    const { service, tracker, buffer } = buildService()
    await service.start()
    tracker.emit(sample({ accuracy: 50 })) // > 20m gate
    await waitForMicrotasks()
    expect(buffer.sessions.get('sid-test')?.path).toHaveLength(0)
    expect(useRunSessionStore.getState().path).toHaveLength(0)
  })

  it('drops samples with missing accuracy', async () => {
    const { service, tracker, buffer } = buildService()
    await service.start()
    tracker.emit(sample({ accuracy: null }))
    await waitForMicrotasks()
    expect(buffer.sessions.get('sid-test')?.path).toHaveLength(0)
  })

  it('keeps the first valid sample (downsample first-point rule)', async () => {
    const { service, tracker, buffer } = buildService()
    await service.start()
    tracker.emit(sample())
    await waitForMicrotasks()
    expect(buffer.sessions.get('sid-test')?.path).toHaveLength(1)
    expect(useRunSessionStore.getState().path).toHaveLength(1)
  })

  it('downsamples subsequent samples within the 5s window', async () => {
    const { service, tracker, buffer } = buildService()
    await service.start()
    tracker.emit(sample({ timestamp: T0 + 0 }))
    tracker.emit(sample({ lat: 13.7001, timestamp: T0 + 1000, speed: 2 }))
    tracker.emit(sample({ lat: 13.7002, timestamp: T0 + 3000, speed: 2 }))
    await waitForMicrotasks()
    // First kept, next two within 5s window dropped.
    expect(buffer.sessions.get('sid-test')?.path).toHaveLength(1)
  })

  it('keeps points crossing the 5s downsample boundary', async () => {
    const { service, tracker, buffer } = buildService()
    await service.start()
    tracker.emit(sample({ timestamp: T0 }))
    tracker.emit(sample({ lat: 13.7001, timestamp: T0 + 5000, speed: 2 }))
    tracker.emit(sample({ lat: 13.7002, timestamp: T0 + 10_500, speed: 2 }))
    await waitForMicrotasks()
    expect(buffer.sessions.get('sid-test')?.path).toHaveLength(3)
  })

  it('flags mock_location without dropping the sample', async () => {
    const { service, tracker, buffer } = buildService()
    await service.start()
    tracker.emit(sample({ mocked: true }))
    await waitForMicrotasks()
    expect(useRunSessionStore.getState().integrityFlags).toContain('mock_location')
    expect(buffer.sessions.get('sid-test')?.path).toHaveLength(1)
  })

  it('does not persist samples while store status is paused', async () => {
    const { service, tracker, buffer } = buildService()
    await service.start()
    tracker.emit(sample({ timestamp: T0 }))
    await waitForMicrotasks()
    service.pause()
    tracker.emit(sample({ lat: 13.7001, timestamp: T0 + 6000 }))
    await waitForMicrotasks()
    // Only the pre-pause point persisted
    expect(buffer.sessions.get('sid-test')?.path).toHaveLength(1)
  })

  it('updates live store before the downsampled buffer write resolves', async () => {
    // Live distance/pace should feel realtime even if the durable upload buffer
    // is momentarily slow. The upload path is still persisted once appendPoint
    // resolves.
    const { service, tracker, buffer } = buildService()
    await service.start()

    const original = buffer.appendPoint.bind(buffer)
    let release: () => void = () => {}
    const blocker = new Promise<void>((resolve) => {
      release = resolve
    })
    buffer.appendPoint = async (sid, seq, p) => {
      await blocker
      return original(sid, seq, p)
    }

    tracker.emit(sample({ timestamp: T0 }))
    await waitForMicrotasks()
    expect(useRunSessionStore.getState().path).toHaveLength(1)
    expect(buffer.sessions.get('sid-test')?.path).toHaveLength(0)
    release()
    await waitForMicrotasks()
    await waitForMicrotasks()
    expect(buffer.sessions.get('sid-test')?.path).toHaveLength(1)
  })
})

describe('RunSessionService.pause / resume / stop', () => {
  beforeEach(() => useRunSessionStore.getState().reset())

  it('pause/resume reflect in store and use injected clock', async () => {
    const { service, clock } = buildService({ startMs: T0 })
    await service.start()
    clock.advance(10_000)
    service.pause()
    clock.advance(7_000)
    service.resume()
    expect(useRunSessionStore.getState().pausedDurationSeconds).toBe(7)
  })

  it('anchors manual resume without counting movement while paused', async () => {
    const { service, clock, tracker, buffer } = buildService({ startMs: T0 })
    await service.start()

    tracker.emit(sample({ timestamp: T0, speed: 2.5 }))
    await waitForMicrotasks()

    service.pause()
    clock.advance(60_000)
    tracker.emit(sample({
      lat: 13.7 + 500 / 111_320,
      timestamp: T0 + 30_000,
      speed: 2.5,
    }))
    await waitForMicrotasks()
    expect(useRunSessionStore.getState().path).toHaveLength(1)

    service.resume()
    tracker.emit(sample({
      lat: 13.7 + 500 / 111_320,
      timestamp: T0 + 65_000,
      speed: 2.5,
    }))
    tracker.emit(sample({
      lat: 13.7 + 520 / 111_320,
      timestamp: T0 + 70_000,
      speed: 2.5,
    }))
    await waitForMicrotasks()

    const state = useRunSessionStore.getState()
    expect(state.path).toHaveLength(3)
    expect(state.path[1].isPaused).toBe(true)
    expect(state.path[2].isPaused).toBe(false)
    expect(state.distanceMeters).toBeGreaterThan(5)
    expect(state.distanceMeters).toBeLessThan(50)

    const persisted = buffer.sessions.get('sid-test')?.path ?? []
    expect(persisted).toHaveLength(3)
    expect(persisted[1].isPaused).toBe(true)
    expect(persisted[2].isPaused).toBe(false)
  })

  it('continues a stopped session after failed submit', async () => {
    const { service, tracker, buffer } = buildService()
    await service.start()
    tracker.emit(sample({ timestamp: T0 }))
    await waitForMicrotasks()
    await service.stop()

    expect(useRunSessionStore.getState().status).toBe('stopped')
    expect(buffer.sessions.get('sid-test')?.status).toBe('stopped')

    await service.continueStopped()
    expect(tracker.started).toBe(true)
    expect(useRunSessionStore.getState().status).toBe('active')
    expect(useRunSessionStore.getState().sessionId).toBe('sid-test')
    expect(buffer.sessions.get('sid-test')?.status).toBe('active')
    expect(buffer.sessions.get('sid-test')?.endedAt).toBeNull()
  })

  it('stop halts tracker, transitions store, marks buffer stopped', async () => {
    const { service, clock, tracker, buffer } = buildService()
    await service.start()
    clock.advance(60_000)
    await service.stop()
    expect(tracker.stopCalls).toBe(1)
    expect(useRunSessionStore.getState().status).toBe('stopped')
    expect(buffer.sessions.get('sid-test')?.status).toBe('stopped')
    expect(buffer.sessions.get('sid-test')?.endedAt).toBeInstanceOf(Date)
  })

  it('stop is a no-op when no session is active', async () => {
    const { service, tracker } = buildService()
    await service.stop()
    expect(tracker.stopCalls).toBe(0)
  })

  it('stop survives a throwing step source — session still stops, steps null', async () => {
    const { service, clock, buffer, stepSource } = buildService()
    await service.start()
    clock.advance(60_000)
    stepSource.throwOnRead = true
    await service.stop()
    expect(useRunSessionStore.getState().status).toBe('stopped')
    expect(useRunSessionStore.getState().steps).toBeNull()
    expect(buffer.sessions.get('sid-test')?.status).toBe('stopped')
  })

  it('start works again after stop (clears prior state)', async () => {
    const { service, clock, idGen } = buildService({ sessionId: 'sid-A' })
    await service.start()
    clock.advance(1000)
    await service.stop()

    // swap idGen to mint a new id
    ;(idGen as any).id = 'sid-B'
    const id2 = await service.start()
    expect(id2).toBe('sid-B')
    expect(useRunSessionStore.getState().sessionId).toBe('sid-B')
    expect(useRunSessionStore.getState().path).toHaveLength(0)
  })
})

describe('RunSessionService.submit', () => {
  beforeEach(() => useRunSessionStore.getState().reset())

  it('produces session via source, calls submit, marks buffer uploaded', async () => {
    const { service, clock, tracker, buffer } = buildService()
    await service.start()
    // simulate a real path
    tracker.emit(sample({ timestamp: T0 }))
    tracker.emit(sample({ lat: 13.7 + 1100 / 111_320, timestamp: T0 + 396_000, speed: 3 }))
    await waitForMicrotasks()
    clock.setTo(T0 + 396_000)
    await service.stop()

    const calls: any[] = []
    const result = await service.submit('sid-test', {
      source: {
        kind: 'gps_live',
        async produce() {
          return {
            externalWorkoutId: 'sid-test',
            startedAt: new Date(T0),
            endedAt: new Date(T0 + 396_000),
            distanceMeters: 1100,
            durationSeconds: 396,
            pausedDurationSeconds: 0,
            paceSecondsPerKm: 360,
            path: buffer.sessions.get('sid-test')!.path,
            splits: [{ km: 1, timeSeconds: 360, paceSecondsPerKm: 360 }],
            verificationLevel: 2,
            integrityFlags: [],
          }
        },
      },
      submit: async (input) => {
        calls.push(input)
        return {
          activitySessionId: 'asid-1',
          verificationLevel: 2,
          alreadyExists: false,
          serverDistanceMeters: 1098,
          serverPaceSecondsPerKm: 359,
          pointReward: 0,
          rewardGranted: false,
          rewardReason: 'not_eligible',
        }
      },
    })

    expect(result.activitySessionId).toBe('asid-1')
    expect(calls).toHaveLength(1)
    expect(calls[0].source).toBe('gps_live')
    expect(calls[0].externalWorkoutId).toBe('sid-test')
    expect(buffer.sessions.get('sid-test')?.status).toBe('uploaded')
  })

  it('can defer marking uploaded until match link succeeds', async () => {
    const { service, clock, tracker, buffer } = buildService()
    await service.start({ matchId: 'match-1' })
    tracker.emit(sample({ timestamp: T0 }))
    tracker.emit(sample({ lat: 13.7 + 1100 / 111_320, timestamp: T0 + 396_000, speed: 3 }))
    await waitForMicrotasks()
    clock.setTo(T0 + 396_000)
    await service.stop()

    await service.submit('sid-test', {
      source: {
        kind: 'gps_live',
        async produce() {
          return {
            externalWorkoutId: 'sid-test',
            startedAt: new Date(T0),
            endedAt: new Date(T0 + 396_000),
            distanceMeters: 1100,
            durationSeconds: 396,
            pausedDurationSeconds: 0,
            paceSecondsPerKm: 360,
            path: buffer.sessions.get('sid-test')!.path,
            splits: [{ km: 1, timeSeconds: 360, paceSecondsPerKm: 360 }],
            verificationLevel: 2,
            integrityFlags: [],
          }
        },
      },
      submit: async () => ({
        activitySessionId: 'asid-1',
        verificationLevel: 2,
        alreadyExists: false,
        serverDistanceMeters: 1098,
        serverPaceSecondsPerKm: 359,
        pointReward: 0,
        rewardGranted: false,
        rewardReason: 'not_eligible',
      }),
    }, { markUploaded: false })

    expect(buffer.sessions.get('sid-test')?.status).toBe('stopped')
    await service.markUploaded('sid-test')
    expect(buffer.sessions.get('sid-test')?.status).toBe('uploaded')
  })

  it('blocks sub-100m stopped sessions before network submit', async () => {
    const { service, clock, tracker, buffer } = buildService()
    await service.start()
    tracker.emit(sample({ timestamp: T0 }))
    tracker.emit(sample({ lat: 13.7 + 50 / 111_320, timestamp: T0 + 20_000, speed: 2.5 }))
    await waitForMicrotasks()
    clock.setTo(T0 + 20_000)
    await service.stop()

    const submitCalls: unknown[] = []

    await expect(service.submit('sid-test', {
      source: {
        kind: 'gps_live',
        async produce() {
          return {
            externalWorkoutId: 'sid-test',
            startedAt: new Date(T0),
            endedAt: new Date(T0 + 20_000),
            distanceMeters: RUN_SUBMIT_MIN_DISTANCE_METERS - 1,
            durationSeconds: 20,
            pausedDurationSeconds: 0,
            paceSecondsPerKm: 200,
            path: buffer.sessions.get('sid-test')!.path,
            splits: [],
            verificationLevel: 2,
            integrityFlags: [],
          }
        },
      },
      submit: async (input) => {
        submitCalls.push(input)
        throw new Error('network submit should not run')
      },
    })).rejects.toBeInstanceOf(RunSessionSubmitBlockedError)

    expect(submitCalls).toHaveLength(0)
    expect(buffer.sessions.get('sid-test')?.status).toBe('stopped')
  })
})

describe('RunSessionService — km-marker observer', () => {
  beforeEach(() => useRunSessionStore.getState().reset())

  it('fires onKmMarker with km=1 when distance crosses 1000m', async () => {
    const { service, tracker } = buildService()
    const kmEvents: number[] = []
    service.setObservers({ onKmMarker: ({ km }) => kmEvents.push(km) })
    await service.start()

    // Anchor point
    tracker.emit(sample({ timestamp: T0 }))
    await waitForMicrotasks()

    // Point that puts total path distance at ~1100m (passes hygiene: 396s gap, ~2.8 m/s)
    tracker.emit(sample({ lat: 13.700 + 1100 / 111_320, timestamp: T0 + 396_000, speed: 2.8 }))
    await waitForMicrotasks()

    expect(kmEvents).toEqual([1])
  })

  it('does not re-fire onKmMarker for the same km boundary', async () => {
    const { service, tracker } = buildService()
    const kmEvents: number[] = []
    service.setObservers({ onKmMarker: ({ km }) => kmEvents.push(km) })
    await service.start()

    tracker.emit(sample({ timestamp: T0 }))
    await waitForMicrotasks()

    // First point crosses 1km
    tracker.emit(sample({ lat: 13.700 + 1100 / 111_320, timestamp: T0 + 396_000, speed: 2.8 }))
    await waitForMicrotasks()

    // Another point, still within the same km band (total ~1200m)
    tracker.emit(sample({
      lat: 13.700 + 1200 / 111_320,
      timestamp: T0 + 432_000,
      speed: 2.8,
    }))
    await waitForMicrotasks()

    expect(kmEvents).toEqual([1]) // fires once only
  })

  it('fires km=2 when a second km boundary is crossed', async () => {
    const { service, tracker } = buildService()
    const kmEvents: number[] = []
    service.setObservers({ onKmMarker: ({ km }) => kmEvents.push(km) })
    await service.start()

    tracker.emit(sample({ timestamp: T0 }))
    await waitForMicrotasks()

    // Cross 1km (~1100m in 396s)
    tracker.emit(sample({ lat: 13.700 + 1100 / 111_320, timestamp: T0 + 396_000, speed: 2.8 }))
    await waitForMicrotasks()

    // Cross 2km (another ~1100m, 396s later)
    tracker.emit(sample({
      lat: 13.700 + 2200 / 111_320,
      timestamp: T0 + 792_000,
      speed: 2.8,
    }))
    await waitForMicrotasks()

    expect(kmEvents).toEqual([1, 2])
  })

  it('resets lastKmCrossed on a new start so km=1 fires again', async () => {
    const { service, clock, tracker, idGen } = buildService({ sessionId: 'sid-A' })
    const kmEvents: number[] = []
    service.setObservers({ onKmMarker: ({ km }) => kmEvents.push(km) })
    await service.start()

    tracker.emit(sample({ timestamp: T0 }))
    await waitForMicrotasks()
    tracker.emit(sample({ lat: 13.700 + 1100 / 111_320, timestamp: T0 + 396_000, speed: 2.8 }))
    await waitForMicrotasks()
    clock.advance(396_000)
    await service.stop()

    // Second session — km=1 must fire again
    ;(idGen as any).id = 'sid-B'
    await service.start()
    tracker.emit(sample({ timestamp: T0 + 400_000 }))
    await waitForMicrotasks()
    tracker.emit(sample({
      lat: 13.700 + 1100 / 111_320,
      timestamp: T0 + 796_000,
      speed: 2.8,
    }))
    await waitForMicrotasks()

    expect(kmEvents).toEqual([1, 1])
  })
})

describe('RunSessionService — auto-pause observer', () => {
  beforeEach(() => useRunSessionStore.getState().reset())

  // The new detector pauses when the runner stays within ~8 m for ~12 s. We
  // emit a 13-second window of stationary 1Hz samples to trip it.
  async function emitStationaryWindow(
    tracker: ReturnType<typeof buildService>['tracker'],
    seconds = 13,
    startMs = T0,
  ) {
    for (let i = 0; i <= seconds; i++) {
      tracker.emit(sample({ speed: 0, timestamp: startMs + i * 1_000 }))
      await waitForMicrotasks()
    }
  }

  it('does NOT fire onAutoPause for a brief slow stretch', async () => {
    const { service, tracker } = buildService()
    const events: string[] = []
    service.setObservers({ onAutoPause: () => events.push('pause') })
    await service.start()

    // 5 seconds is well under the 12s pause window.
    for (let i = 0; i < 5; i++) {
      tracker.emit(sample({ speed: 0.2, timestamp: T0 + i * 1_000 }))
      await waitForMicrotasks()
    }

    expect(useRunSessionStore.getState().isAutoPaused).toBe(false)
    expect(events).toEqual([])
  })

  it('fires onAutoPause after the pause window of stationary samples', async () => {
    const { service, tracker } = buildService()
    const events: string[] = []
    service.setObservers({
      onAutoPause: () => events.push('pause'),
      onAutoResume: () => events.push('resume'),
    })
    await service.start()

    await emitStationaryWindow(tracker)

    expect(useRunSessionStore.getState().isAutoPaused).toBe(true)
    expect(events).toEqual(['pause'])
  })

  it('keeps slow upload points unpaused before auto-pause latches', async () => {
    const { service, tracker, buffer } = buildService()
    await service.start()

    tracker.emit(sample({ timestamp: T0, speed: 2.5 }))
    await waitForMicrotasks()
    tracker.emit(sample({ lat: 13.700001, timestamp: T0 + 5_000, speed: 0.1 }))
    await waitForMicrotasks()

    expect(useRunSessionStore.getState().isAutoPaused).toBe(false)
    const persisted = buffer.sessions.get('sid-test')?.path ?? []
    expect(persisted).toHaveLength(2)
    expect(persisted[1].isPaused).toBe(false)
  })

  it('marks upload points paused after auto-pause latches', async () => {
    const { service, tracker, buffer } = buildService()
    await service.start()

    await emitStationaryWindow(tracker, 15)

    expect(useRunSessionStore.getState().isAutoPaused).toBe(true)
    const persisted = buffer.sessions.get('sid-test')?.path ?? []
    expect(persisted.at(-1)?.isPaused).toBe(true)
  })

  it('fast-resumes when OS speed clearly indicates running', async () => {
    const { service, tracker } = buildService()
    const events: string[] = []
    service.setObservers({
      onAutoPause: () => events.push('pause'),
      onAutoResume: () => events.push('resume'),
    })
    await service.start()

    await emitStationaryWindow(tracker)
    // 2.5 m/s ≥ FAST_RESUME_SPEED_M_S (2.0) — instant resume.
    tracker.emit(sample({ lat: 13.7001, speed: 2.5, timestamp: T0 + 14_000 }))
    await waitForMicrotasks()

    expect(useRunSessionStore.getState().isAutoPaused).toBe(false)
    expect(events).toEqual(['pause', 'resume'])
  })

  it('does NOT resume on a single fast-spike while still standing', async () => {
    const { service, tracker } = buildService()
    await service.start()

    await emitStationaryWindow(tracker)
    expect(useRunSessionStore.getState().isAutoPaused).toBe(true)

    // Single sample with speed under FAST_RESUME_SPEED_M_S, position barely
    // moved — should NOT flip back. Movement-based resume needs sustained
    // displacement across the resume window.
    tracker.emit(sample({ lat: 13.7000005, speed: 0.6, timestamp: T0 + 14_000 }))
    await waitForMicrotasks()

    expect(useRunSessionStore.getState().isAutoPaused).toBe(true)
  })

  it('user pause() resets isAutoPaused immediately', async () => {
    const { service, tracker } = buildService()
    await service.start()

    await emitStationaryWindow(tracker)
    expect(useRunSessionStore.getState().isAutoPaused).toBe(true)

    service.pause()
    expect(useRunSessionStore.getState().status).toBe('paused')
    expect(useRunSessionStore.getState().isAutoPaused).toBe(false)
  })

  it('auto-pause → user-pause → resume: isAutoPaused stays false', async () => {
    const { service, clock, tracker } = buildService({ startMs: T0 })
    await service.start()

    await emitStationaryWindow(tracker)
    expect(useRunSessionStore.getState().isAutoPaused).toBe(true)

    clock.advance(3_000)
    service.pause()
    expect(useRunSessionStore.getState().isAutoPaused).toBe(false)

    clock.advance(5_000)
    service.resume()
    expect(useRunSessionStore.getState().isAutoPaused).toBe(false)
    expect(useRunSessionStore.getState().status).toBe('active')
  })

  it('does not re-fire onAutoPause once already auto-paused', async () => {
    const { service, tracker } = buildService()
    let pauseCount = 0
    service.setObservers({ onAutoPause: () => { pauseCount++ } })
    await service.start()

    await emitStationaryWindow(tracker)
    // Additional stationary samples after pause — should not re-fire.
    tracker.emit(sample({ speed: 0, timestamp: T0 + 14_000 }))
    await waitForMicrotasks()
    tracker.emit(sample({ speed: 0, timestamp: T0 + 15_000 }))
    await waitForMicrotasks()

    expect(pauseCount).toBe(1)
  })

  it('fires onPauseLimitReached after 15 minutes of auto-pause (sample domain)', async () => {
    const { service, tracker } = buildService()
    let timedOut = false
    service.setObservers({ onPauseLimitReached: () => { timedOut = true } })
    await service.start()

    await emitStationaryWindow(tracker)
    expect(useRunSessionStore.getState().isAutoPaused).toBe(true)

    // Still stationary 16 minutes later in the *sample-time* domain: the open
    // auto span now exceeds the budget. Keyed on the sample timestamp — not
    // wall clock — so a backgrounded pause trips the limit just the same.
    tracker.emit(sample({ speed: 0, timestamp: T0 + 16 * 60_000 }))
    await waitForMicrotasks()

    expect(timedOut).toBe(true)
  })

  it('counts completed auto-pause time in the shared pause budget', async () => {
    const { service, tracker } = buildService({ startMs: T0 })
    await service.start()

    await emitStationaryWindow(tracker)
    expect(useRunSessionStore.getState().isAutoPaused).toBe(true)

    // Auto latches at the sample where the 12s window fills (T0 + 11s). A fast
    // sample 42s after that latch resumes and closes the span.
    tracker.emit(sample({ lat: 13.7001, speed: 2.5, timestamp: T0 + 53_000 }))
    await waitForMicrotasks()

    expect(useRunSessionStore.getState().isAutoPaused).toBe(false)
    expect(service.pauseBudgetUsedSeconds(T0 + 999_999)).toBe(42)
  })

  it('combines manual pause and auto-pause against the same 15-minute budget', async () => {
    const { service, clock, tracker } = buildService({ startMs: T0 })
    let totalPausedSeconds = 0
    service.setObservers({
      onPauseLimitReached: (event) => { totalPausedSeconds = event.totalPausedSeconds },
    })
    await service.start()

    // 10 minutes of manual pause (wall-clock domain).
    service.pause()
    clock.advance(10 * 60_000)
    service.resume()

    // Then a disjoint 5-minute auto-pause (sample-time domain) tips the shared
    // union budget over 15 minutes. Manual and auto never overlap here, so the
    // total is their sum.
    const autoStart = T0 + 10 * 60_000
    await emitStationaryWindow(tracker, 13, autoStart)
    tracker.emit(sample({ speed: 0, timestamp: autoStart + 11_000 + 5 * 60_000 }))
    await waitForMicrotasks()

    expect(totalPausedSeconds).toBeGreaterThanOrEqual(15 * 60)
  })

  it('does not fire onPauseLimitReached twice for the same session', async () => {
    const { service, tracker } = buildService()
    let count = 0
    service.setObservers({ onPauseLimitReached: () => { count++ } })
    await service.start()

    await emitStationaryWindow(tracker)
    tracker.emit(sample({ speed: 0, timestamp: T0 + 16 * 60_000 }))
    await waitForMicrotasks()
    tracker.emit(sample({ speed: 0, timestamp: T0 + 16 * 60_000 + 1_000 }))
    await waitForMicrotasks()

    expect(count).toBe(1)
  })
})

describe('RunSessionService — vehicle motion', () => {
  beforeEach(() => useRunSessionStore.getState().reset())

  // Move N meters north per sample. 1° lat ≈ 111_320 m.
  const M = (m: number) => m / 111_320

  it('latches vehicle-paused and freezes distance when points are dropped for vehicle speed', async () => {
    const { service, tracker } = buildService()
    const events: string[] = []
    service.setObservers({
      onVehicleDetected: () => events.push('detect'),
      onVehicleCleared: () => events.push('clear'),
    })
    await service.start()

    // 15 m/s (> the 12 m/s hygiene drop) sustained — every moved point is
    // dropped for speed_anomaly, but the detector still sees vehicle-class
    // speed and latches the notice instead of freezing the route silently.
    for (let i = 0; i <= 7; i++) {
      tracker.emit(sample({ lat: 13.700 + M(15 * i), timestamp: T0 + i * 1_000 }))
      await waitForMicrotasks()
    }

    expect(useRunSessionStore.getState().isVehiclePaused).toBe(true)
    expect(events).toEqual(['detect'])
    // Only the first point was accepted; the route did not run away with the car.
    expect(useRunSessionStore.getState().path).toHaveLength(1)
    expect(useRunSessionStore.getState().distanceMeters).toBe(0)
  })

  it('resumes counting once speed returns to human-class', async () => {
    const { service, tracker } = buildService()
    const events: string[] = []
    service.setObservers({
      onVehicleDetected: () => events.push('detect'),
      onVehicleCleared: () => events.push('clear'),
    })
    await service.start()

    // Sustained 10 m/s (8–12 band, accepted) latches vehicle...
    let t = 0
    let meters = 0
    for (let i = 0; i <= 7; i++, t += 1_000) {
      meters += 10
      tracker.emit(sample({ lat: 13.700 + M(meters), timestamp: T0 + t }))
      await waitForMicrotasks()
    }
    expect(useRunSessionStore.getState().isVehiclePaused).toBe(true)

    // ...then 2 m/s for the exit window clears it.
    for (let i = 0; i <= 6; i++, t += 1_000) {
      meters += 2
      tracker.emit(sample({ lat: 13.700 + M(meters), timestamp: T0 + t }))
      await waitForMicrotasks()
    }

    expect(useRunSessionStore.getState().isVehiclePaused).toBe(false)
    expect(events).toEqual(['detect', 'clear'])
  })

  it('folds vehicle-paused time into the shared 15-minute pause budget', async () => {
    const { service, tracker } = buildService()
    let limit = 0
    service.setObservers({ onPauseLimitReached: () => { limit++ } })
    await service.start()

    for (let i = 0; i <= 7; i++) {
      tracker.emit(sample({ lat: 13.700 + M(15 * i), timestamp: T0 + i * 1_000 }))
      await waitForMicrotasks()
    }
    expect(useRunSessionStore.getState().isVehiclePaused).toBe(true)

    // Still moving at vehicle speed 16 minutes later in the sample-time domain:
    // the open vehicle span exceeds the shared budget. Keyed on the sample ts so
    // a background drain of vehicle-class travel trips the limit correctly.
    const seconds = 16 * 60
    tracker.emit(sample({ lat: 13.700 + M(15 * seconds), timestamp: T0 + seconds * 1_000 }))
    await waitForMicrotasks()

    expect(limit).toBe(1)
  })
})

describe('RunSessionService — pause ledger (single source of truth)', () => {
  beforeEach(() => useRunSessionStore.getState().reset())

  it('folds a backgrounded stationary stretch by sample ts, not ~0s (drain replay)', async () => {
    // Regression for the CRITICAL bug: the OLD fold used clock.now() at replay
    // time, so a 10-minute stationary stretch drained from the background queue
    // (while wall-clock barely advanced) folded ~0s and bypassed the budget.
    const { service, buffer, clock } = buildService({ startMs: T0 })
    await service.start()

    // 10 minutes of stationary background samples (3s apart) queued by the
    // background task while the app was suspended. Clock does NOT advance.
    const bg = []
    for (let t = 0; t <= 600_000; t += 3_000) {
      bg.push({
        lat: 13.700,
        lng: 100.500,
        accuracy: 5,
        altitude: null,
        speed: 0,
        timestamp: T0 + t,
        mocked: null,
      })
    }
    buffer.bgQueue = bg

    await service.pollBackgroundSamples()

    // Auto-pause latched during the drain and the span reflects the full
    // stationary stretch in the sample-time domain — ~10 minutes, not ~0s.
    expect(useRunSessionStore.getState().isAutoPaused).toBe(true)
    const budget = service.pauseBudgetUsedSeconds(T0 + 600_000)
    expect(budget).toBeGreaterThanOrEqual(9 * 60)
    // Wall clock never moved, so the OLD implementation would report ~0 here.
    expect(clock.now()).toBe(T0)
  })

  it('starts a fresh ledger — a previous mid-auto-pause session never leaks', async () => {
    const { service, tracker, idGen } = buildService({ sessionId: 'sid-A' })
    await service.start()
    await emitStationaryWindowAt(tracker)
    expect(useRunSessionStore.getState().isAutoPaused).toBe(true)
    await service.stop()

    ;(idGen as any).id = 'sid-B'
    await service.start()

    // New session opens with zero pause budget even though the prior one ended
    // mid-auto-pause — the ledger is reconstructed per start().
    expect(service.pauseBudgetUsedSeconds(T0 + 999_999)).toBe(0)
  })
})

describe('RunSessionService — pause-aware background drain + continue boundary', () => {
  beforeEach(() => useRunSessionStore.getState().reset())

  // Move N meters north per sample. 1° lat ≈ 111_320 m.
  const M = (m: number) => m / 111_320

  it('excludes drained samples that land inside a manual pause span (drain after resume)', async () => {
    const { service, tracker, buffer, clock } = buildService({ startMs: T0 })
    await service.start()

    // Active baseline at the pause location.
    tracker.emit(sample({ lat: 13.700, timestamp: T0, speed: 5 }))
    await waitForMicrotasks()
    expect(useRunSessionStore.getState().distanceMeters).toBe(0)

    // Manual pause at A.
    service.pause()

    // The pre-armed background task keeps writing samples while paused: the user
    // rides 800m north over 160s (5 m/s, human-class so the vehicle detector
    // never latches). These land in sqlite, not the foreground watch.
    const bg = []
    for (let i = 1; i <= 8; i++) {
      bg.push({
        lat: 13.700 + M(100 * i),
        lng: 100.500,
        accuracy: 5,
        altitude: null,
        speed: 5,
        timestamp: T0 + i * 20_000,
        mocked: null,
      })
    }
    buffer.bgQueue = bg

    // Resume after the ride. The manual span closes at resume time.
    clock.setTo(T0 + 170_000)
    service.resume()

    // Drain the backlog through the foreground pipeline.
    await service.pollBackgroundSamples()

    const state = useRunSessionStore.getState()
    // No fake distance: every drained sample fell inside the manual pause span.
    expect(state.distanceMeters).toBeLessThan(50)
    // Kept for route continuity, but all marked paused (excluded from distance).
    expect(state.path.length).toBeGreaterThan(1)
    expect(state.path.slice(1).every((p) => p.isPaused)).toBe(true)
    // Pace smoother saw no moving points → still null.
    expect(service.currentSmoothedPaceSecPerKm(T0 + 170_000)).toBeNull()
  })

  it('is race-free: a foreground fix before the drain yields the same result', async () => {
    const { service, tracker, buffer, clock } = buildService({ startMs: T0 })
    await service.start()

    tracker.emit(sample({ lat: 13.700, timestamp: T0, speed: 5 }))
    await waitForMicrotasks()

    service.pause()

    const bg = []
    for (let i = 1; i <= 8; i++) {
      bg.push({
        lat: 13.700 + M(100 * i),
        lng: 100.500,
        accuracy: 5,
        altitude: null,
        speed: 5,
        timestamp: T0 + i * 20_000,
        mocked: null,
      })
    }
    buffer.bgQueue = bg

    clock.setTo(T0 + 170_000)
    service.resume()

    // The first foreground fix arrives at the resume location BEFORE the drain.
    tracker.emit(sample({ lat: 13.700 + M(800), timestamp: T0 + 171_000, speed: 5 }))
    await waitForMicrotasks()

    // Then the backlog drains.
    await service.pollBackgroundSamples()

    // Identical to the drain-first ordering: the ride is not counted.
    expect(useRunSessionStore.getState().distanceMeters).toBeLessThan(50)
  })

  it('excludes vehicle-band drained samples inside a manual pause span', async () => {
    const { service, tracker, buffer, clock } = buildService({ startMs: T0 })
    await service.start()

    tracker.emit(sample({ lat: 13.700, timestamp: T0, speed: 2.5 }))
    await waitForMicrotasks()

    service.pause()

    // Background ride at 10 m/s (vehicle band: accepted by hygiene, latches the
    // vehicle detector only after its 6s confirmation window). The manual span
    // must catch the pre-latch ramp-up samples that the detector alone misses.
    const bg = []
    for (let i = 1; i <= 15; i++) {
      bg.push({
        lat: 13.700 + M(10 * i),
        lng: 100.500,
        accuracy: 5,
        altitude: null,
        speed: 10,
        timestamp: T0 + i * 1_000,
        mocked: null,
      })
    }
    buffer.bgQueue = bg

    clock.setTo(T0 + 20_000)
    service.resume()
    await service.pollBackgroundSamples()

    const state = useRunSessionStore.getState()
    expect(state.distanceMeters).toBeLessThan(30)
    expect(state.path.slice(1).every((p) => p.isPaused)).toBe(true)
  })

  it('continueStopped resets the boundary and records the stop→continue gap as paused', async () => {
    const { service, tracker, clock } = buildService({ startMs: T0 })
    await service.start()

    tracker.emit(sample({ lat: 13.700, timestamp: T0, speed: 2.5 }))
    await waitForMicrotasks()
    clock.setTo(T0 + 10_000)
    tracker.emit(sample({ lat: 13.700 + M(20), timestamp: T0 + 10_000, speed: 2.5 }))
    await waitForMicrotasks()
    const distanceBeforeStop = useRunSessionStore.getState().distanceMeters
    expect(distanceBeforeStop).toBeGreaterThan(15)

    clock.setTo(T0 + 15_000)
    await service.stop()

    // Idle 120s, then continue the run 300m away (user walked/drove elsewhere).
    clock.setTo(T0 + 135_000)
    await service.continueStopped()

    clock.setTo(T0 + 140_000)
    tracker.emit(sample({ lat: 13.700 + M(300), timestamp: T0 + 140_000, speed: 2.5 }))
    await waitForMicrotasks()

    const state = useRunSessionStore.getState()
    // No 300m straight-line chord from the pre-stop location.
    expect(state.distanceMeters).toBeLessThan(distanceBeforeStop + 50)
    // The first post-continue point is a fresh paused anchor.
    expect(state.path.at(-1)?.isPaused).toBe(true)
    // The 120s idle gap lands in the paused budget.
    expect(service.pauseBudgetUsedSeconds(T0 + 140_000)).toBeGreaterThanOrEqual(120)
  })

  it('excludes a >5-min FOREGROUND-path gap chord from distance (tunnel/deep-indoor)', async () => {
    // Finding 1: a long outage that resumes through the foreground onSample
    // path (not the bg-drain branch) — e.g. a tunnel or deep-indoor stretch
    // while moving. The server excludes the straight chord of any >5-min gap
    // from its derived distance, so the client must too or a legit run trips
    // distance_path_mismatch. This exercises tracker.emit (foreground), never
    // the background queue.
    const { service, tracker, clock } = buildService({ startMs: T0 })
    await service.start()

    tracker.emit(sample({ lat: 13.700, timestamp: T0, speed: 2 }))
    await waitForMicrotasks()
    clock.setTo(T0 + 10_000)
    tracker.emit(sample({ lat: 13.700 + M(20), timestamp: T0 + 10_000, speed: 2 }))
    await waitForMicrotasks()
    const distanceBeforeGap = useRunSessionStore.getState().distanceMeters
    expect(distanceBeforeGap).toBeGreaterThan(15)

    // 12-minute outage — real time actually elapses (screen on, in a tunnel) —
    // then a foreground fix 3km away. Implied ~4 m/s passes hygiene, so without
    // a gap boundary the 3km chord would be counted.
    const gapTs = T0 + 10_000 + 12 * 60_000
    clock.setTo(gapTs)
    tracker.emit(sample({ lat: 13.700 + M(3000), timestamp: gapTs, speed: 2 }))
    await waitForMicrotasks()

    const state = useRunSessionStore.getState()
    // The 3km gap chord never enters distance.
    expect(state.distanceMeters).toBeLessThan(distanceBeforeGap + 50)
    // Post-gap point is a fresh paused anchor (excluded from distance).
    expect(state.path.at(-1)?.isPaused).toBe(true)
    // Suspension recorded for server-side review.
    expect(state.integrityFlags).toContain('ios_background_suspended')
    // The gap is NOT a pause: duration keeps counting, only distance excluded.
    expect(service.pauseBudgetUsedSeconds(gapTs)).toBe(0)
  })

  it('closes an OPEN auto-pause span at the last pre-gap sample ts (no inflation)', async () => {
    // Finding 2: runner stops at a light → auto-pause latches (span open) →
    // phone suspends. The reset detector can no longer emit the resume that
    // would close the span, so leaving it open inflates pausedDurationSeconds
    // to now — a false paused_exceeds_duration risk. The gap boundary must
    // close the open auto span at the LAST pre-gap sample ts, not now.
    const { service, tracker, clock } = buildService({ startMs: T0 })
    await service.start()

    // 13s stationary window → auto latches at T0+11s, span open; last accepted
    // pre-gap sample at T0+13s.
    for (let i = 0; i <= 13; i++) {
      tracker.emit(sample({ speed: 0, timestamp: T0 + i * 1_000 }))
      await waitForMicrotasks()
    }
    expect(useRunSessionStore.getState().isAutoPaused).toBe(true)

    // 12-minute suspension (real time elapses), then a foreground fix 3km away.
    // The open auto span must be frozen at T0+13s (2s of real pause), not
    // extended to the gap ts.
    const gapTs = T0 + 13_000 + 12 * 60_000
    clock.setTo(gapTs)
    tracker.emit(sample({ lat: 13.700 + M(3000), timestamp: gapTs, speed: 2 }))
    await waitForMicrotasks()

    // Budget reflects only the 2s the span was actually open pre-gap, not the
    // ~12 minutes it would have grown to if left open until now.
    expect(service.pauseBudgetUsedSeconds(gapTs)).toBeLessThan(10)
  })

  it('excludes the >5-min background-gap chord from distance without recording a pause', async () => {
    const { service, tracker, buffer, clock } = buildService({ startMs: T0 })
    await service.start()

    // ~20m of real foreground running establishes downsampleLastKept.
    tracker.emit(sample({ lat: 13.700, timestamp: T0, speed: 2 }))
    await waitForMicrotasks()
    clock.setTo(T0 + 10_000)
    tracker.emit(sample({ lat: 13.700 + M(20), timestamp: T0 + 10_000, speed: 2 }))
    await waitForMicrotasks()
    const distanceBeforeGap = useRunSessionStore.getState().distanceMeters
    expect(distanceBeforeGap).toBeGreaterThan(15)

    // App suspended 12 minutes; the device wakes 3km away (a taxi hop). The
    // implied speed (~4 m/s) passes hygiene, so without a gap boundary the 3km
    // chord would be counted.
    buffer.bgQueue = [{
      lat: 13.700 + M(3000),
      lng: 100.500,
      accuracy: 5,
      altitude: null,
      speed: 2,
      timestamp: T0 + 10_000 + 12 * 60_000,
      mocked: null,
    }]

    await service.pollBackgroundSamples()

    const state = useRunSessionStore.getState()
    // The 3km gap chord never enters distance.
    expect(state.distanceMeters).toBeLessThan(distanceBeforeGap + 50)
    // The suspension is still recorded for server-side review.
    expect(state.integrityFlags).toContain('ios_background_suspended')
    // The gap is NOT a pause: duration keeps counting, only distance is excluded.
    expect(service.pauseBudgetUsedSeconds(T0 + 10_000 + 12 * 60_000)).toBe(0)
  })
})

describe('RunSessionService — gpsHealth publishing', () => {
  beforeEach(() => useRunSessionStore.getState().reset())

  it('publishes good quality + last-fix ts on an accepted high-accuracy sample', async () => {
    const { service, tracker } = buildService()
    await service.start()
    tracker.emit(sample({ accuracy: 5, timestamp: T0 }))
    await waitForMicrotasks()
    const health = useRunSessionStore.getState().gpsHealth
    expect(health.quality).toBe('good')
    expect(health.lastAcceptedFixTs).toBe(T0)
    expect(health.lastDropReason).toBeNull()
  })

  it('publishes poor quality for a coarse-but-kept fix', async () => {
    const { service, tracker } = buildService()
    await service.start()
    tracker.emit(sample({ accuracy: 15, timestamp: T0 }))
    await waitForMicrotasks()
    expect(useRunSessionStore.getState().gpsHealth.quality).toBe('poor')
  })

  it('records the drop reason without advancing last-fix ts', async () => {
    const { service, tracker } = buildService()
    await service.start()
    tracker.emit(sample({ accuracy: 5, timestamp: T0 }))
    await waitForMicrotasks()
    tracker.emit(sample({ accuracy: 50, timestamp: T0 + 1_000 })) // fails accuracy gate → drop
    await waitForMicrotasks()
    const health = useRunSessionStore.getState().gpsHealth
    expect(health.lastDropReason).toBe('accuracy_too_low')
    expect(health.lastAcceptedFixTs).toBe(T0) // unchanged by the drop
    expect(health.quality).toBe('good') // last accepted fix quality retained
  })

  it('a fresh accepted fix clears a prior drop reason', async () => {
    const { service, tracker } = buildService()
    await service.start()
    tracker.emit(sample({ accuracy: 50, timestamp: T0 })) // drop
    await waitForMicrotasks()
    expect(useRunSessionStore.getState().gpsHealth.lastDropReason).toBe('accuracy_too_low')
    tracker.emit(sample({ accuracy: 5, timestamp: T0 + 6_000 })) // accepted
    await waitForMicrotasks()
    expect(useRunSessionStore.getState().gpsHealth.lastDropReason).toBeNull()
  })

  it('start() resets gpsHealth to the searching baseline', async () => {
    const { service, tracker } = buildService()
    await service.start()
    tracker.emit(sample({ accuracy: 5, timestamp: T0 }))
    await waitForMicrotasks()
    expect(useRunSessionStore.getState().gpsHealth.quality).toBe('good')
    await service.stop()
    await service.cancel()
    const { service: service2, tracker: tracker2 } = buildService({ sessionId: 'sid-2' })
    await service2.start()
    void tracker2
    const health = useRunSessionStore.getState().gpsHealth
    expect(health.quality).toBe('searching')
    expect(health.lastAcceptedFixTs).toBeNull()
    expect(health.lastDropReason).toBeNull()
  })
})

describe('resolveLiveGpsQuality — staleness watchdog', () => {
  const opts = {
    status: 'active' as const,
    baseQuality: 'good' as const,
    watchdogEnabled: true,
  }

  it('returns the base quality before the first fix regardless of nowMs', () => {
    expect(
      resolveLiveGpsQuality({ ...opts, baseQuality: 'searching', lastAcceptedFixTs: null, nowMs: T0 + 999_999 }),
    ).toBe('searching')
  })

  it('keeps the base quality while fixes are fresh', () => {
    expect(
      resolveLiveGpsQuality({ ...opts, lastAcceptedFixTs: T0, nowMs: T0 + GPS_LOST_STALENESS_MS - 1 }),
    ).toBe('good')
  })

  it('flips to lost once staleness exceeds the threshold', () => {
    expect(
      resolveLiveGpsQuality({ ...opts, lastAcceptedFixTs: T0, nowMs: T0 + GPS_LOST_STALENESS_MS + 1 }),
    ).toBe('lost')
  })

  it('resets to base quality when a newer fix arrives', () => {
    // Was stale...
    expect(
      resolveLiveGpsQuality({ ...opts, lastAcceptedFixTs: T0, nowMs: T0 + 30_000 }),
    ).toBe('lost')
    // ...new fix at T0+25s means only 5s stale now.
    expect(
      resolveLiveGpsQuality({ ...opts, lastAcceptedFixTs: T0 + 25_000, nowMs: T0 + 30_000 }),
    ).toBe('good')
  })

  it('does not fire the watchdog while paused', () => {
    expect(
      resolveLiveGpsQuality({ ...opts, status: 'paused', lastAcceptedFixTs: T0, nowMs: T0 + 60_000 }),
    ).toBe('good')
  })

  it('is suppressed when the watchdog is disabled (power-save sparse sampling)', () => {
    expect(
      resolveLiveGpsQuality({ ...opts, watchdogEnabled: false, lastAcceptedFixTs: T0, nowMs: T0 + 60_000 }),
    ).toBe('good')
  })
})

describe('RunSessionService — evidence-gap detector span close', () => {
  beforeEach(() => useRunSessionStore.getState().reset())

  it('closes an open auto-pause span at the last evidenced fix when accepted fixes stop >30s', async () => {
    const { service, tracker, clock } = buildService()
    await service.start()

    // Latch auto-pause with a stationary window (samples T0 .. T0+13s).
    await emitStationaryWindowAt(tracker)
    expect(useRunSessionStore.getState().isAutoPaused).toBe(true)

    // Screen-off starvation: 3 minutes with every fix hygiene-dropped, then
    // the first accepted fix after unlock, ~500m up the road. (Field incident
    // 2026-07-13: the runner resumed while the screen was off; the latched
    // span silently swallowed the whole stretch as paused time.)
    const unlockTs = T0 + 13_000 + 180_000
    clock.setTo(unlockTs)
    tracker.emit(sample({ timestamp: unlockTs, lat: 13.700 + 500 / 111_320, speed: 3 }))
    await waitForMicrotasks()

    // Span closed at the last evidenced fix (~T0+13s), not at unlock: the
    // 180s hole counts as active time, so the pause budget stays ~13s.
    expect(useRunSessionStore.getState().isAutoPaused).toBe(false)
    expect(service.pauseBudgetUsedSeconds(unlockTs)).toBeLessThanOrEqual(13)
    // The unlock fix is outside the (closed) span — its sub-5-min chord still
    // counts as distance instead of being marked paused.
    expect(useRunSessionStore.getState().distanceMeters).toBeGreaterThan(400)
  })

  it('keeps a latched span open across a short (<30s) delivery hole', async () => {
    const { service, tracker, clock } = buildService()
    await service.start()

    await emitStationaryWindowAt(tracker)
    expect(useRunSessionStore.getState().isAutoPaused).toBe(true)

    // 20s hole, then another stationary fix at the same spot — still paused,
    // and the hole itself keeps counting toward the pause budget.
    const nextTs = T0 + 13_000 + 20_000
    clock.setTo(nextTs)
    tracker.emit(sample({ timestamp: nextTs, speed: 0 }))
    await waitForMicrotasks()

    expect(useRunSessionStore.getState().isAutoPaused).toBe(true)
    expect(service.pauseBudgetUsedSeconds(nextTs)).toBeGreaterThanOrEqual(20)
  })
})

// Emit a 13s window of stationary 1Hz samples to trip the auto-pause detector.
async function emitStationaryWindowAt(
  tracker: ReturnType<typeof buildService>['tracker'],
): Promise<void> {
  for (let i = 0; i <= 13; i++) {
    tracker.emit(sample({ speed: 0, timestamp: T0 + i * 1_000 }))
    await waitForMicrotasks()
  }
}

// Microtask flush helper. onSample is fire-and-forget (void), so awaiting one
// resolved promise is not enough — we need to drain the microtask queue.
async function waitForMicrotasks(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve()
  }
}
