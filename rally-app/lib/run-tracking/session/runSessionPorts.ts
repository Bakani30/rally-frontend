import type { TrackerConfig } from '../gps/gpsAccuracyMode'
import type { GpsPoint } from '../gps/gpsTypes'
import type { StoredSession, StoredSessionWithPath } from '../offline/sessionBuffer'

/**
 * Port interfaces for RunSessionService. Each port is a narrow contract that
 * RunSessionService depends on; concrete implementations live elsewhere
 * (expo-location, expo-sqlite, expo-crypto, etc).
 *
 * Why ports: the service contains all the orchestration logic — when to drop
 * a sample, when to persist, when to advance state. Native modules just
 * deliver bytes/timestamps. Splitting them lets us test the orchestration
 * under Vitest with stubs, before any device build is available.
 *
 * No imports from react-native, expo-*, or supabase. Types only.
 */

/** Raw sample as the OS surfaces it. Pre-hygiene; may be dropped by service. */
export type GpsRawSample = {
  lat: number
  lng: number
  /** Reported accuracy in meters. May be null on misbehaving Android sensors. */
  accuracy: number | null
  altitude: number | null
  speed: number | null
  /** Compass/motion heading in degrees (0 = north). Available on most devices. */
  heading?: number | null
  /** Unix milliseconds. */
  timestamp: number
  /** Android only — true when a mock location provider is active. */
  mocked?: boolean | null
}

/**
 * GPS tracker — wraps the OS subscription. Service decides when to start/stop;
 * tracker pushes samples back via the callback. The tracker MUST guarantee
 * timestamps are monotonic and in milliseconds.
 */
export interface GpsTrackerPort {
  start(onSample: (sample: GpsRawSample) => void, config: TrackerConfig): Promise<void>
  /**
   * Switch to a new mode without dropping the active session. Implementations
   * may stop and re-create the underlying subscription. No-op when inactive.
   */
  setMode(config: TrackerConfig): Promise<void>
  stop(): Promise<void>
  /**
   * Optional pre-session warm-up. Starts GPS at full accuracy so the chip is
   * already locked by the time the user presses Start. When start() is called
   * after warmUp(), implementations SHOULD do a hot handoff (reuse the existing
   * subscription) rather than restarting GPS from scratch.
   *
   * Optional — stub trackers in tests may omit this.
   */
  warmUp?(onSample: (sample: GpsRawSample) => void): Promise<void>
  cancelWarmUp?(): Promise<void>
}

/**
 * Persistent session buffer. Mirrors the public surface of
 * `offline/sessionBuffer` so we can swap a memory stub in tests. Real impl
 * uses expo-sqlite.
 */
export type BgRawSample = {
  lat: number
  lng: number
  accuracy: number | null
  altitude: number | null
  speed: number | null
  timestamp: number
  mocked: boolean | null
}

export interface SessionBufferPort {
  createSession(params: {
    sessionId: string
    matchId?: string | null
    challengeId?: string | null
    startedAt: Date
  }): Promise<void>
  appendPoint(sessionId: string, sequence: number, point: GpsPoint): Promise<void>
  markStopped(params: {
    sessionId: string
    endedAt: Date
    pausedDurationSeconds: number
    integrityFlags: string[]
  }): Promise<void>
  markActive(sessionId: string): Promise<void>
  loadSession(sessionId: string): Promise<StoredSessionWithPath | null>
  markUploaded(sessionId: string): Promise<void>
  /** List sessions still in 'active' status (e.g. left behind by a crash). */
  listActiveSessions(): Promise<StoredSession[]>
  /**
   * Explicit discard: permanently delete a not-yet-uploaded session row (and
   * its points). Used by cancel() and the start() stale-row sweep so a
   * discarded run can never be resurrected by recovery/retry.
   */
  discardSession(sessionId: string): Promise<void>
  /** Drain background-collected raw samples for a session. */
  drainBgRawSamples(sessionId: string): Promise<BgRawSample[]>
}

/** Wall clock — injectable so tests advance time deterministically. */
export interface ClockPort {
  now(): number
}

/** UUID minter — concrete impl uses expo-crypto in app, crypto.randomUUID() in tests. */
export interface IdGeneratorPort {
  newSessionId(): string
}
