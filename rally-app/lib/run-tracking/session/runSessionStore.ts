import { create } from 'zustand'
import { pathDistanceMeters } from '../gps/gpsDistance'
import type { GpsPoint } from '../gps/gpsTypes'

/**
 * Zustand store for the active run session. Lives in memory only — durable
 * persistence is the SQLite buffer (see offline/sessionBuffer.ts). The store
 * mirrors a subset of buffer state so that UI can render at 1Hz without
 * touching SQLite on every tick.
 *
 * State machine:
 *
 *   idle ──start()──→ active ──pause()──→ paused ──resume()──→ active
 *                       │                       │
 *                       └──────── stop() ───────┴──→ stopped (terminal)
 *
 * After stop() the store retains the final session for the summary screen
 * until reset() is called. A new start() from `stopped` is allowed and clears.
 *
 * No imports from react-native, expo-*, or supabase. zustand is environment-
 * agnostic and tested under Vitest with the node environment.
 */

export type RunSessionStatus = 'idle' | 'active' | 'paused' | 'stopped'

/**
 * Live GPS signal quality. `'lost'` is the watchdog verdict (no accepted fix
 * for ≥ the staleness threshold) and is only ever produced at read time by
 * resolveLiveGpsQuality — the store base value stays 'searching' | 'good' | 'poor'.
 */
export type GpsQuality = 'searching' | 'good' | 'poor' | 'lost'

/**
 * Single source of truth for live GPS health, published by RunSessionService
 * on every accepted/dropped sample so the hook can relay it without deriving
 * quality itself. The staleness watchdog reads `lastAcceptedFixTs`.
 */
export type GpsHealth = {
  /** Timestamp (ms) of the most recent sample that passed hygiene, or null before the first fix. */
  lastAcceptedFixTs: number | null
  /** Base quality from the latest accepted fix's accuracy. Never 'lost' (see resolveLiveGpsQuality). */
  quality: GpsQuality
  /** Hygiene reason for the most recent dropped sample; cleared on the next accepted fix. */
  lastDropReason: string | null
}

export type RunSessionState = {
  status: RunSessionStatus
  /** Stable id; doubles as `externalWorkoutId` when submitted. */
  sessionId: string | null
  startedAt: Date | null
  endedAt: Date | null
  /** Append-only path (already hygiene-filtered + downsampled by caller). */
  path: GpsPoint[]
  /** Cumulative paused seconds, ticked while status === 'paused'. */
  pausedDurationSeconds: number
  /** Last wall-clock at which we transitioned into paused. */
  pauseStartedAtMs: number | null
  /** Convenience cache; always equals pathDistanceMeters(path). */
  distanceMeters: number
  /** Source-declared integrity warnings (e.g. ['ios_background_suspended']). */
  integrityFlags: string[]
  /** Average HR reported by an optional Wear OS companion during the run. */
  avgHeartRate: number | null
  wearHeartRateSamples: number
  /** Sanity-clamped pedometer step count for the session, or null if unavailable. */
  steps: number | null
  /** True when the latest GPS sample is auto-paused (speed < 0.5 m/s). */
  isAutoPaused: boolean
  /** True when sustained vehicle-class speed has paused counting (see vehicleMotionDetector). */
  isVehiclePaused: boolean
  /** User toggle for power-save (long-run) mode — accurate stats, stats-only UI. */
  powerSaveRequested: boolean
  /** Live GPS health snapshot; single source relayed by the hook. */
  gpsHealth: GpsHealth
}

type RunSessionActions = {
  start: (input: { sessionId: string; startedAt?: Date }) => void
  appendPoint: (point: GpsPoint) => void
  pause: (atMs?: number) => void
  resume: (atMs?: number) => void
  continueFromStopped: () => void
  stop: (atMs?: number) => void
  addPausedDuration: (seconds: number) => void
  addIntegrityFlag: (flag: string) => void
  recordWearHeartRate: (bpm: number) => void
  setSteps: (steps: number | null) => void
  setAutoPaused: (value: boolean) => void
  setVehiclePaused: (value: boolean) => void
  setPowerSaveRequested: (value: boolean) => void
  /** Merge a partial GPS-health snapshot (accepted/dropped sample publish). */
  setGpsHealth: (patch: Partial<GpsHealth>) => void
  reset: () => void
}

const INITIAL: RunSessionState = {
  status: 'idle',
  sessionId: null,
  startedAt: null,
  endedAt: null,
  path: [],
  pausedDurationSeconds: 0,
  pauseStartedAtMs: null,
  distanceMeters: 0,
  integrityFlags: [],
  avgHeartRate: null,
  wearHeartRateSamples: 0,
  steps: null,
  isAutoPaused: false,
  isVehiclePaused: false,
  powerSaveRequested: false,
  gpsHealth: { lastAcceptedFixTs: null, quality: 'searching', lastDropReason: null },
}

export const useRunSessionStore = create<RunSessionState & RunSessionActions>(
  (set, get) => ({
    ...INITIAL,

    start: ({ sessionId, startedAt }) => {
      // powerSaveRequested persists across sessions (set-and-forget for long runs).
      const { powerSaveRequested } = get()
      set({
        ...INITIAL,
        powerSaveRequested,
        status: 'active',
        sessionId,
        startedAt: startedAt ?? new Date(),
      })
    },

    appendPoint: (point) => {
      const { status, path } = get()
      if (status !== 'active') return
      // Monotonic-timestamp guard. The same GPS fix can reach here twice when an
      // OEM feeds both the foreground watch and the background fg-service task
      // (identical timestamps). Dropping non-increasing timestamps keeps the
      // append-only path ordered and distance from double-counting.
      const last = path[path.length - 1]
      if (last && point.timestamp <= last.timestamp) return
      const nextPath = [...path, point]
      set({
        path: nextPath,
        distanceMeters: pathDistanceMeters(nextPath),
      })
    },

    pause: (atMs) => {
      const { status } = get()
      if (status !== 'active') return
      set({
        status: 'paused',
        pauseStartedAtMs: atMs ?? Date.now(),
        isAutoPaused: false,
        isVehiclePaused: false,
      })
    },

    resume: (atMs) => {
      const { status, pauseStartedAtMs, pausedDurationSeconds } = get()
      if (status !== 'paused' || pauseStartedAtMs == null) return
      const elapsed = Math.max(0, Math.round(((atMs ?? Date.now()) - pauseStartedAtMs) / 1000))
      set({
        status: 'active',
        pauseStartedAtMs: null,
        pausedDurationSeconds: pausedDurationSeconds + elapsed,
        isAutoPaused: false,
        isVehiclePaused: false,
      })
    },

    continueFromStopped: () => {
      const { status, sessionId } = get()
      if (status !== 'stopped' || !sessionId) return
      set({
        status: 'active',
        endedAt: null,
        pauseStartedAtMs: null,
        isAutoPaused: false,
        isVehiclePaused: false,
      })
    },

    stop: (atMs) => {
      const { status, pauseStartedAtMs, pausedDurationSeconds } = get()
      if (status === 'idle' || status === 'stopped') return
      const now = atMs ?? Date.now()
      // If currently paused, fold remaining paused time into total.
      const finalPaused =
        status === 'paused' && pauseStartedAtMs != null
          ? pausedDurationSeconds + Math.max(0, Math.round((now - pauseStartedAtMs) / 1000))
          : pausedDurationSeconds
      set({
        status: 'stopped',
        endedAt: new Date(now),
        pauseStartedAtMs: null,
        pausedDurationSeconds: finalPaused,
        isAutoPaused: false,
        isVehiclePaused: false,
      })
    },

    addPausedDuration: (seconds) => {
      if (!Number.isFinite(seconds) || seconds <= 0) return
      const rounded = Math.round(seconds)
      if (rounded <= 0) return
      const { pausedDurationSeconds } = get()
      set({ pausedDurationSeconds: pausedDurationSeconds + rounded })
    },

    addIntegrityFlag: (flag) => {
      const { integrityFlags } = get()
      if (integrityFlags.includes(flag)) return
      set({ integrityFlags: [...integrityFlags, flag] })
    },

    recordWearHeartRate: (bpm) => {
      if (!Number.isFinite(bpm) || bpm < 30 || bpm > 250) return
      const { avgHeartRate, wearHeartRateSamples, integrityFlags } = get()
      const nextSamples = wearHeartRateSamples + 1
      const nextAverage = Math.round(
        (((avgHeartRate ?? bpm) * wearHeartRateSamples) + bpm) / nextSamples,
      )
      set({
        avgHeartRate: nextAverage,
        wearHeartRateSamples: nextSamples,
        integrityFlags: integrityFlags.includes('wear_os_companion')
          ? integrityFlags.includes('health_services_hr')
            ? integrityFlags
            : [...integrityFlags, 'health_services_hr']
          : [...integrityFlags, 'wear_os_companion', 'health_services_hr'],
      })
    },

    setSteps: (steps) => {
      set({ steps })
    },

    setAutoPaused: (value) => {
      set({ isAutoPaused: value })
    },

    setVehiclePaused: (value) => {
      set({ isVehiclePaused: value })
    },

    setPowerSaveRequested: (value) => {
      set({ powerSaveRequested: value })
    },

    setGpsHealth: (patch) => {
      set({ gpsHealth: { ...get().gpsHealth, ...patch } })
    },

    reset: () => set({ ...INITIAL }),
  }),
)
