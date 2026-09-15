import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, AppState, Platform } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useCompassHeading } from '@/hooks/useCompassHeading'
import { openAppSettings } from '@/lib/permissions/appSettings'
import {
  getRunLocationPermissionState,
  requestRunLocationPermissions,
  type RunLocationPermissionStatus,
} from '@/lib/run-tracking/permissions/locationPermissions'
import { COLD_START_WARNING_THRESHOLD_MS } from '@/lib/run-tracking/gps/coldStartTracker'
import type { TrackerMode } from '@/lib/run-tracking/gps/gpsAccuracyMode'
import type { GpsPoint } from '@/lib/run-tracking/gps/gpsTypes'
import { resolveStableLiveMarker } from '@/lib/run-tracking/gps/liveMarkerClamp'
import { formatPace } from '@/lib/run-tracking/gps/paceSmoothing'
import {
  deriveSplits,
  deriveSubmittedDistanceMeters,
} from '@/lib/run-tracking/session/runSessionDerive'
import {
  computeElapsedDurationSeconds,
  computeLivePaceSecondsPerKm,
} from '@/lib/run-tracking/session/runSessionFormat'
import {
  getRunSessionService,
  makeSubmitDeps,
} from '@/lib/run-tracking/session/runSessionServiceFactory'
import {
  RUN_PAUSE_LIMIT_SECONDS,
  resolveLiveGpsQuality,
} from '@/lib/run-tracking/session/runSessionService'
import {
  useRunSessionStore,
  type GpsQuality,
} from '@/lib/run-tracking/session/runSessionStore'
import {
  type SubmitRunSessionResult,
} from '@/lib/run-tracking/session/runSessionRepository'
import {
  formatRunSessionSubmitBlockMessage,
  getRunSessionSubmitBlockReasonFromError,
  RunSessionSubmitBlockedError,
  type RunSessionSubmitBlockReason,
} from '@/lib/run-tracking/session/runSessionSubmitRules'
import {
  describeRunSubmitErrorWithFallback,
  extractRunSubmitErrorCode,
} from '@/lib/run-tracking/session/runSubmitErrorMessages'
import { speakRunVoiceCue } from '@/lib/run-tracking/session/runSessionVoiceCue'

export type { GpsQuality }

const START_READY_ACCURACY_M = 30

/**
 * Bridge between the imperative RunSessionService and React. Owns:
 *   - subscriptions to the Zustand store (status / path / pause state)
 *   - a 1Hz tick that re-renders the duration display while running
 *   - foreground-location permission gating
 *   - thin wrappers over service.start / pause / resume / stop / submit
 *
 * Architectural notes:
 *   - Service singleton lives in the factory; the hook never instantiates it.
 *   - All UI formatting is delegated to runSessionFormat helpers — keeps
 *     render-time logic pure and the hook thin.
 *   - This hook is NOT covered by Vitest (Node env, no React Testing Library
 *     yet). Manual smoke-test on dev client is the validation layer until
 *     we add a UI test harness.
 *
 * Returned shape is intentionally flat — screen components consume named
 * fields rather than `state.something.subfield`.
 */

export type LocationPermissionState = RunLocationPermissionStatus
type AnalyticsPermissionStatus = Exclude<RunLocationPermissionStatus, 'requesting'>

function computeBearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const dLng = ((to.lng - from.lng) * Math.PI) / 180
  const lat1 = (from.lat * Math.PI) / 180
  const lat2 = (to.lat * Math.PI) / 180
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function humanizeRunError(message: string): string {
  if (message.includes('insufficient path points')) {
    return 'ยังไม่มีจุด GPS เพียงพอ — ลองวิ่งให้ขยับสักหน่อยก่อนกดหยุด หรือเช็คว่ามือถืออยู่กลางแจ้ง'
  }
  if (message.includes('not found in buffer')) {
    return 'หาเซสชันการวิ่งไม่เจอ ลองเริ่มใหม่อีกครั้ง'
  }
  if (message.includes('has no endedAt') || message.includes("expected 'stopped'")) {
    return 'เซสชันยังไม่ปิดสมบูรณ์ ลองกดหยุดอีกครั้ง'
  }
  if (/network|fetch|timeout|timed out|econn|enotfound|offline/i.test(message)) {
    return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ เช็คอินเทอร์เน็ตแล้วลองใหม่ — ข้อมูลวิ่งยังถูกเก็บไว้ในเครื่อง'
  }
  if (message.includes('already active') || message.includes('already a session')) {
    return 'มีเซสชันวิ่งค้างอยู่แล้ว ลองออกจากหน้านี้แล้วเริ่มวิ่งใหม่'
  }
  // ข้อความที่เป็นไทยอยู่แล้ว (เช่น block reason) ส่งผ่านได้; ที่เหลือเป็น technical/อังกฤษ
  // → แปลงเป็นข้อความกลางที่ผู้ใช้อ่านรู้เรื่องและทำต่อได้ (รายละเอียด error ดิบยังถูก track ผ่าน analytics)
  if (/[ก-๙]/.test(message)) return message
  return 'เกิดข้อผิดพลาดที่ไม่คาดคิด ลองใหม่อีกครั้ง — ถ้ายังไม่หาย ลองออกแล้วเริ่มวิ่งใหม่'
}

function toAnalyticsPermissionStatus(status: RunLocationPermissionStatus): AnalyticsPermissionStatus {
  return status === 'requesting' ? 'unknown' : status
}

export type UseRunSessionResult = {
  // Lifecycle status
  status: 'idle' | 'active' | 'paused' | 'stopped'
  sessionId: string | null
  permission: LocationPermissionState
  backgroundPermission: LocationPermissionState
  /** False once the OS will no longer prompt — the UI must route to Settings. */
  canAskAgain: boolean
  /** Surfaced when the last action threw (start failure, submit failure, …). */
  error: string | null
  /** Terminal local submit failure: user must exit and create a fresh run. */
  stoppedRunBlockReason: RunSessionSubmitBlockReason | null

  // Live numbers — render directly, formatters apply at the screen layer.
  distanceMeters: number
  /** Distance over the downsampled upload path, matching submit-run-session's server recompute. */
  submittedDistanceMeters: number
  activeDurationSeconds: number
  durationSeconds: number
  paceSecondsPerKm: number | null
  /** 30s rolling-window smoothed pace. Null for first ~30s. Falls back to raw pace in UI. */
  smoothedPaceSecondsPerKm: number | null
  isAutoPaused: boolean
  isVehiclePaused: boolean
  gpsQuality: GpsQuality
  integrityFlags: readonly string[]
  avgHeartRate: number | null
  path: import('@/lib/run-tracking/gps/gpsTypes').GpsPoint[]
  /** Per-km splits, derived from path. Empty until first km mark. */
  splits: import('@/lib/run-tracking/gps/gpsTypes').Split[]
  latestPoint: import('@/lib/run-tracking/gps/gpsTypes').GpsPoint | null

  // Submit progress
  isSubmitting: boolean
  submitResult: SubmitRunSessionResult | null

  // Cold-start + tracker mode
  /** ms from start() to first GPS sample with accuracy ≤ 30m. null while searching. */
  firstValidPointMs: number | null
  /** True when status === 'active' and no first-valid-point yet. */
  isSearchingGps: boolean
  /** True when search has exceeded 30s without first-valid. */
  searchingTimedOut: boolean
  trackerMode: TrackerMode
  /** User toggle for power-save (long-run) mode — accurate stats, stats-only UI. */
  powerSaveRequested: boolean

  // Actions
  requestPermission: () => Promise<void>
  /** Open the OS Settings app to recover a permanently denied location grant. */
  openLocationSettings: () => Promise<void>
  start: () => Promise<void>
  pause: () => void
  resume: () => void
  continueRun: () => Promise<void>
  stop: () => Promise<void>
  submit: () => Promise<void>
  /** Toggle power-save (long-run) mode. */
  togglePowerSave: (on: boolean) => void
  stopAndSubmit: () => Promise<void>
  /** Abort current run without submitting. Resolves true on success; false if
   * the local discard failed (error is surfaced, caller must not navigate away). */
  cancel: () => Promise<boolean>
  /** Clear the local submitResult / error after the user dismisses summary. */
  reset: () => void
  /** Mark a deferred match upload complete after submit-activity links it. */
  markUploaded: (sessionId: string) => Promise<void>
  /** Last known coordinate before/while the session is running (for camera seed). */
  warmStartLocation: { lat: number; lng: number } | null
  /** Heading in degrees (0 = north). Compass when sensor fix is good, otherwise GPS-derived bearing. */
  heading: number | null
  pauseBudgetUsedSeconds: number
  pauseBudgetRemainingSeconds: number
  pauseLimitSeconds: number
}

export function useRunSession(options: {
  matchId?: string | null
  challengeId?: string | null
} = {}): UseRunSessionResult {
  const matchId = options.matchId ?? null
  const challengeId = options.challengeId ?? null
  // ---- Subscribe to store slices (fine-grained re-renders) -------------
  const status = useRunSessionStore((s) => s.status)
  const sessionId = useRunSessionStore((s) => s.sessionId)
  const startedAt = useRunSessionStore((s) => s.startedAt)
  const endedAt = useRunSessionStore((s) => s.endedAt)
  const distanceMeters = useRunSessionStore((s) => s.distanceMeters)
  const integrityFlags = useRunSessionStore((s) => s.integrityFlags)
  const avgHeartRate = useRunSessionStore((s) => s.avgHeartRate)
  const path = useRunSessionStore((s) => s.path)
  const isAutoPaused = useRunSessionStore((s) => s.isAutoPaused)
  const isVehiclePaused = useRunSessionStore((s) => s.isVehiclePaused)
  const powerSaveRequested = useRunSessionStore((s) => s.powerSaveRequested)
  const gpsHealth = useRunSessionStore((s) => s.gpsHealth)
  const rawLatestPoint = path.length > 0 ? path[path.length - 1] : null
  // Display-only stationary clamp: `path` itself (and therefore distance)
  // still derives from the raw per-sample Kalman output — this only steadies
  // what the map marker / teammate presence broadcast show. See
  // liveMarkerClamp.ts for why raw Kalman output still jitters visibly.
  const stableMarkerAnchorRef = useRef<GpsPoint | null>(null)
  const latestPoint = useMemo(() => {
    if (!rawLatestPoint) {
      stableMarkerAnchorRef.current = null
      return null
    }
    const next = resolveStableLiveMarker(rawLatestPoint, stableMarkerAnchorRef.current)
    stableMarkerAnchorRef.current = next
    return next
  }, [rawLatestPoint])
  const pauseLimitAlertedRef = useRef(false)

  // ---- 1Hz tick to refresh duration while running ----------------------
  const [, setTick] = useState(0)
  useEffect(() => {
    if (status !== 'active' && status !== 'paused') return
    const id = setInterval(() => setTick((t) => (t + 1) & 0xffff), 1000)
    return () => clearInterval(id)
  }, [status])

  const nowMs = Date.now()

  // Pause budget: single source of truth is the service's pauseLedger (union of
  // manual + auto + vehicle spans). Polled each tick the same way as smoothed
  // pace — the hook only relays, no accounting lives here. Idle reports zero so
  // a prior session's ledger can never leak into a fresh run.
  const pauseBudgetUsedSeconds = useMemo(() => {
    if (status === 'idle') return 0
    return getRunSessionService().pauseBudgetUsedSeconds(nowMs)
  }, [status, nowMs])
  const pauseBudgetRemainingSeconds = Math.max(0, RUN_PAUSE_LIMIT_SECONDS - pauseBudgetUsedSeconds)
  const pauseLimitReached = pauseBudgetUsedSeconds >= RUN_PAUSE_LIMIT_SECONDS

  const durationSeconds = useMemo(
    () =>
      computeElapsedDurationSeconds({
        startedAt,
        endedAt,
        nowMs,
      }),
    [startedAt, endedAt, nowMs],
  )
  // Active duration = wall-clock elapsed minus the pause-budget union. All pause
  // kinds (manual, auto, vehicle) are already accounted in the budget, so the
  // timer freezes correctly during any of them.
  const activeDurationSeconds = Math.max(0, durationSeconds - pauseBudgetUsedSeconds)

  const paceSecondsPerKm = useMemo(
    () => computeLivePaceSecondsPerKm(distanceMeters, activeDurationSeconds),
    [distanceMeters, activeDurationSeconds],
  )
  const submittedDistanceMeters = useMemo(
    () => deriveSubmittedDistanceMeters(path),
    [path],
  )

  // Smoothed pace: polled from service on each tick.
  const smoothedPaceSecondsPerKm = useMemo(() => {
    if (status !== 'active' && status !== 'paused') return null
    return getRunSessionService().currentSmoothedPaceSecPerKm(nowMs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, nowMs])

  // ---- Cold-start + mode (observed from service) -----------------------
  const { track } = useAnalytics()
  const [firstValidPointMs, setFirstValidPointMs] = useState<number | null>(null)
  const [trackerMode, setTrackerMode] = useState<TrackerMode>('foreground_active')
  const [searchingTimedOut, setSearchingTimedOut] = useState(false)

  // GPS quality: relayed from the service-owned gpsHealth snapshot, with the
  // staleness watchdog applied at read time against the 1Hz tick (nowMs). The
  // watchdog is suppressed while counting is intentionally halted (auto/vehicle
  // pause) or while power-save samples by distance (legitimately sparse), so
  // 'lost' means a genuine mid-run signal drop.
  const gpsQuality = useMemo(
    () =>
      resolveLiveGpsQuality({
        status,
        lastAcceptedFixTs: gpsHealth.lastAcceptedFixTs,
        baseQuality: gpsHealth.quality,
        nowMs,
        watchdogEnabled: trackerMode !== 'power_save' && !isAutoPaused && !isVehiclePaused,
      }),
    [status, gpsHealth, nowMs, trackerMode, isAutoPaused, isVehiclePaused],
  )

  useEffect(() => {
    const service = getRunSessionService()
    service.setObservers({
      onFirstValidPoint: ({ latencyMs, accuracyM }) => {
        setFirstValidPointMs(latencyMs)
        track({
          name: 'gps_first_valid_point',
          properties: { latency_ms: latencyMs, accuracy_m: accuracyM },
        })
      },
      onModeChange: (mode) => setTrackerMode(mode),
      onAutoPause: () => {
        if (Platform.OS === 'ios') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        }
      },
      onAutoResume: () => {
        if (Platform.OS === 'ios') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        }
      },
      onPauseLimitReached: ({ totalPausedSeconds }) => {
        track({
          name: 'run_pause_limit_reached',
          properties: { total_paused_seconds: totalPausedSeconds },
        })
      },
      onKmMarker: ({ km }) => {
        if (Platform.OS === 'ios') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }
        const currentPath = useRunSessionStore.getState().path
        const splits = deriveSplits(currentPath)
        const split = splits.find((s) => s.km === km)
        const paceText = split ? formatPace(split.paceSecondsPerKm) : ''
        const utterance = `${km} kilometre${km > 1 ? 's' : ''}${paceText ? `, pace ${paceText}` : ''}`
        void speakRunVoiceCue(utterance)
      },
    })
  }, [track])

  // Reset cold-start state on every fresh start.
  useEffect(() => {
    if (status === 'active' && !firstValidPointMs) return
    if (status === 'idle') {
      setFirstValidPointMs(null)
      setSearchingTimedOut(false)
    }
  }, [status, firstValidPointMs])

  // Emit one-shot timeout event after the warning window.
  useEffect(() => {
    if (status !== 'active') return
    if (firstValidPointMs !== null) return
    const id = setTimeout(() => {
      if (firstValidPointMs === null) {
        setSearchingTimedOut(true)
        track({
          name: 'gps_searching_timeout',
          properties: { elapsed_ms: COLD_START_WARNING_THRESHOLD_MS },
        })
      }
    }, COLD_START_WARNING_THRESHOLD_MS)
    return () => clearTimeout(id)
  }, [status, firstValidPointMs, track])

  // ---- Permission state ------------------------------------------------
  const [permission, setPermission] = useState<LocationPermissionState>('unknown')
  const [backgroundPermission, setBackgroundPermission] =
    useState<LocationPermissionState>('unknown')
  // False once the OS will no longer show the system dialog (iOS after first
  // denial, Android "Don't ask again") — the screen routes to Settings instead.
  const [canAskAgain, setCanAskAgain] = useState(true)
  // Guards the foreground re-check from clobbering an in-flight request.
  const requestingRef = useRef(false)
  const requestPermission = useCallback(async () => {
    requestingRef.current = true
    setPermission('requesting')
    setBackgroundPermission('requesting')
    try {
      const result = await requestRunLocationPermissions()
      setPermission(result.foreground)
      setBackgroundPermission(result.background)
      setCanAskAgain(result.canAskAgain)
      track({
        name: 'run_permission_result',
        properties: {
          foreground: toAnalyticsPermissionStatus(result.foreground),
          background: toAnalyticsPermissionStatus(result.background),
        },
      })
    } finally {
      requestingRef.current = false
    }
  }, [track])
  // Send the user to the OS Settings app to grant a permanently denied
  // permission. The AppState re-check below picks up the change on return.
  const openLocationSettings = useCallback(async () => {
    track({ name: 'run_permission_open_settings' })
    await openAppSettings()
  }, [track])
  // Entering the run feature should surface the native permission dialog
  // itself — never-asked and re-askable denials both re-prompt on entry. A
  // permanently denied grant resolves silently, so the screen's Settings card
  // stays the recovery path. Latched once per mount so the foreground
  // re-checks below can never loop the dialog.
  const autoAskedRef = useRef(false)
  // Re-check (never re-prompt) the existing status on mount and whenever the app
  // returns to the foreground — so granting in Settings and coming back clears
  // the prompt without forcing the user to leave and re-enter the screen.
  useEffect(() => {
    let active = true
    const refresh = () => {
      if (requestingRef.current) return
      getRunLocationPermissionState().then((result) => {
        // Bail if unmounted, or if a request started while this read was in
        // flight (its fresher result must win).
        if (!active || requestingRef.current) return
        setPermission(result.foreground)
        setBackgroundPermission(result.background)
        setCanAskAgain(result.canAskAgain)
        if (!autoAskedRef.current && result.foreground !== 'granted' && result.canAskAgain) {
          autoAskedRef.current = true
          void requestPermission()
        }
      })
    }
    refresh()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh()
    })
    return () => {
      active = false
      subscription.remove()
    }
  }, [requestPermission])

  // Fire-once-per-episode analytics for the two "won't count" conditions. Each
  // ref latches on entry and clears when the condition lifts, so a re-entry
  // after recovery counts as a fresh episode. No raw UUIDs — match/challenge
  // presence is booleanized.
  const gpsLostFiredRef = useRef(false)
  useEffect(() => {
    if (gpsQuality === 'lost') {
      if (gpsLostFiredRef.current) return
      gpsLostFiredRef.current = true
      track({
        name: 'run_gps_lost',
        properties: { has_match: Boolean(matchId), has_challenge: Boolean(challengeId) },
      })
    } else {
      gpsLostFiredRef.current = false
    }
  }, [gpsQuality, matchId, challengeId, track])

  const permissionLostFiredRef = useRef(false)
  useEffect(() => {
    const isRunning = status === 'active' || status === 'paused'
    if (isRunning && permission === 'denied') {
      if (permissionLostFiredRef.current) return
      permissionLostFiredRef.current = true
      track({
        name: 'run_permission_lost_mid_run',
        properties: { has_match: Boolean(matchId), has_challenge: Boolean(challengeId) },
      })
    } else {
      permissionLostFiredRef.current = false
    }
  }, [status, permission, matchId, challengeId, track])

  // ---- Error / submit state -------------------------------------------
  const [error, setError] = useState<string | null>(null)
  const [stoppedRunBlockReason, setStoppedRunBlockReason] =
    useState<RunSessionSubmitBlockReason | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<SubmitRunSessionResult | null>(null)
  const [warmStartLocation, setWarmStartLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [idleHeading, setIdleHeading] = useState<number | null>(null)

  const submitSession = useCallback(async (id: string) => {
    setIsSubmitting(true)
    try {
      const service = getRunSessionService()
      const result = await service.submit(
        id,
        makeSubmitDeps(id, { matchId, challengeId }),
        { markUploaded: !matchId },
      )
      setSubmitResult(result)
    } finally {
      setIsSubmitting(false)
    }
  }, [challengeId, matchId])

  // Solo submit failure analytics — one event per failed attempt. Match runs
  // are tracked at the match-link surface (app/run/active.tsx) instead; codes
  // are enum-safe strings (never UUIDs/free text beyond the server code).
  const trackSoloSubmitFailed = useCallback((error: unknown, blockReason: RunSessionSubmitBlockReason | null) => {
    if (matchId) return
    const reason = blockReason ?? extractRunSubmitErrorCode(error)
      ?? (error instanceof Error && /network|fetch|timeout|timed out|econn|enotfound|offline/i.test(error.message)
        ? 'network_error'
        : 'unknown')
    track({
      name: 'run_submit_failed',
      properties: { mode: 'solo', has_match: false, reason },
    })
  }, [matchId, track])

  // ---- Actions ---------------------------------------------------------
  const start = useCallback(async () => {
    setError(null)
    setStoppedRunBlockReason(null)
    setSubmitResult(null)
    if (permission !== 'granted') {
      setError('อนุญาต Location ก่อนเริ่มวิ่ง')
      return
    }
    if (status === 'idle' && warmStartLocation === null) {
      setError('รอ GPS จับตำแหน่งก่อนเริ่มวิ่ง')
      return
    }
    try {
      const service = getRunSessionService()
      await service.start({ matchId, challengeId })
    } catch (e) {
      setError(humanizeRunError(e instanceof Error ? e.message : String(e)))
    }
  }, [challengeId, matchId, permission, status, warmStartLocation])

  const pause = useCallback(() => {
    try {
      getRunSessionService().pause()
    } catch (e) {
      setError(humanizeRunError(e instanceof Error ? e.message : String(e)))
    }
  }, [])

  const resume = useCallback(() => {
    if (pauseLimitReached) {
      setError('พักครบ 15 นาทีแล้ว เลือกส่งผลหรือออกจากการวิ่ง')
      return
    }
    try {
      setError(null)
      getRunSessionService().resume()
    } catch (e) {
      setError(humanizeRunError(e instanceof Error ? e.message : String(e)))
    }
  }, [pauseLimitReached])

  const togglePowerSave = useCallback((on: boolean) => {
    void getRunSessionService().setPowerSaveMode(on)
  }, [])

  const continueRun = useCallback(async () => {
    if (stoppedRunBlockReason) {
      setError(formatRunSessionSubmitBlockMessage(stoppedRunBlockReason))
      return
    }
    if (pauseLimitReached) {
      setError('พักครบ 15 นาทีแล้ว เลือกส่งผลหรือออกจากการวิ่ง')
      return
    }
    setError(null)
    setSubmitResult(null)
    try {
      await getRunSessionService().continueStopped()
    } catch (e) {
      setError(humanizeRunError(e instanceof Error ? e.message : String(e)))
    }
  }, [pauseLimitReached, stoppedRunBlockReason])

  const stop = useCallback(async () => {
    setError(null)
    try {
      await getRunSessionService().stop()
    } catch (e) {
      setError(humanizeRunError(e instanceof Error ? e.message : String(e)))
    }
  }, [])

  const submit = useCallback(async () => {
    const id = useRunSessionStore.getState().sessionId
    if (!id) {
      setError('ไม่มีเซสชันให้ส่งผล ลองเริ่มวิ่งใหม่')
      return
    }
    setError(null)
    try {
      await submitSession(id)
    } catch (e) {
      const blockReason = e instanceof RunSessionSubmitBlockedError
        ? e.reason
        : getRunSessionSubmitBlockReasonFromError(e)
      trackSoloSubmitFailed(e, blockReason)
      if (blockReason) {
        setStoppedRunBlockReason(blockReason)
        setError(formatRunSessionSubmitBlockMessage(blockReason))
        return
      }
      // Coded server rejections get the central Thai map; uncoded failures
      // (network/local) keep the offline "ถูกเก็บไว้ในเครื่อง" humanizer copy.
      setError(
        describeRunSubmitErrorWithFallback(e)
        ?? humanizeRunError(e instanceof Error ? e.message : String(e)),
      )
    }
  }, [submitSession, trackSoloSubmitFailed])

  const stopAndSubmit = useCallback(async () => {
    const id = useRunSessionStore.getState().sessionId
    if (!id) {
      setError('ไม่มีเซสชันที่กำลังวิ่งให้ส่งผล ลองเริ่มวิ่งใหม่')
      return
    }
    setError(null)
    setSubmitResult(null)
    try {
      await getRunSessionService().stop()
      await submitSession(id)
    } catch (e) {
      const blockReason = e instanceof RunSessionSubmitBlockedError
        ? e.reason
        : getRunSessionSubmitBlockReasonFromError(e)
      trackSoloSubmitFailed(e, blockReason)
      if (blockReason) {
        setStoppedRunBlockReason(blockReason)
        setError(formatRunSessionSubmitBlockMessage(blockReason))
        return
      }
      setError(
        describeRunSubmitErrorWithFallback(e)
        ?? humanizeRunError(e instanceof Error ? e.message : String(e)),
      )
    }
  }, [submitSession, trackSoloSubmitFailed])

  // Returns true only when the local discard actually succeeded. A failed
  // discard (e.g. SQLite write error) MUST be observable so the caller keeps
  // the user on-screen instead of navigating away — otherwise the buffer row
  // survives and the retry pipeline later auto-submits the discarded run. The
  // service leaves state intact on failure, so retrying cancel() can succeed.
  const cancel = useCallback(async (): Promise<boolean> => {
    setError(null)
    setStoppedRunBlockReason(null)
    setSubmitResult(null)
    try {
      await getRunSessionService().cancel()
      return true
    } catch (e) {
      setError(humanizeRunError(e instanceof Error ? e.message : String(e)))
      return false
    }
  }, [])

  // ---- Shared manual/auto pause budget ---------------------------------
  useEffect(() => {
    if (status === 'idle') {
      pauseLimitAlertedRef.current = false
    }
  }, [status, sessionId])

  useEffect(() => {
    if (status !== 'active' && status !== 'paused') return
    if (pauseLimitAlertedRef.current) return
    if (pauseBudgetUsedSeconds < RUN_PAUSE_LIMIT_SECONDS) return
    pauseLimitAlertedRef.current = true

    Alert.alert(
      'พักครบ 15 นาที',
      'Rally จำกัดเวลาพักสะสมจาก Pause และ Auto Pause รวมกัน 15 นาที เลือกส่งผลจากระยะที่บันทึกไว้ หรือออกจากการวิ่งนี้',
      [
        {
          text: 'ออก',
          style: 'destructive',
          onPress: () => { void cancel() },
        },
        {
          text: 'ส่งผล',
          onPress: () => { void stopAndSubmit() },
        },
      ],
    )
  }, [cancel, pauseBudgetUsedSeconds, status, stopAndSubmit])

  const reset = useCallback(() => {
    setError(null)
    setStoppedRunBlockReason(null)
    setSubmitResult(null)
    useRunSessionStore.getState().reset()
  }, [])

  const markUploaded = useCallback(async (id: string) => {
    await getRunSessionService().markUploaded(id)
  }, [])

  // ---- Pre-session GPS warm-up: starts at full accuracy as soon as permission
  // is granted so the chip is already locked by the time the user presses Start.
  // ExpoLocationTracker does a hot handoff on start() — no second cold search.
  useEffect(() => {
    if (permission !== 'granted' || status !== 'idle') return
    setWarmStartLocation(null)
    setIdleHeading(null)
    void getRunSessionService().prewarm((loc) => {
      if (loc.accuracy === null || loc.accuracy > START_READY_ACCURACY_M) return
      setWarmStartLocation({ lat: loc.lat, lng: loc.lng })
      setIdleHeading(loc.heading)
    })
    return () => {
      void getRunSessionService().cancelPrewarm()
    }
  }, [permission, status])

  // Compass beats GPS bearing when the sensor fix is good — it works while
  // stationary and updates in real time as the phone rotates. expo-location
  // accuracy on iOS: 0=high, 1=medium, 2=low, 3=none. Treat ≤1 as trusted.
  const compass = useCompassHeading(permission === 'granted')
  const heading = useMemo(() => {
    const compassTrusted = compass.heading != null && (compass.accuracy == null || compass.accuracy <= 1)
    if (compassTrusted) return compass.heading
    if (path.length >= 2) {
      return computeBearing(path[path.length - 2], path[path.length - 1])
    }
    return idleHeading
  }, [path, idleHeading, compass.heading, compass.accuracy])

  const splits = useMemo(() => deriveSplits(path), [path])

  return {
    status,
    sessionId,
    permission,
    backgroundPermission,
    canAskAgain,
    error,
    stoppedRunBlockReason,
    distanceMeters,
    submittedDistanceMeters,
    activeDurationSeconds,
    durationSeconds,
    paceSecondsPerKm,
    smoothedPaceSecondsPerKm,
    isAutoPaused,
    isVehiclePaused,
    powerSaveRequested,
    gpsQuality,
    integrityFlags,
    avgHeartRate,
    path,
    splits,
    latestPoint,
    isSubmitting,
    submitResult,
    requestPermission,
    openLocationSettings,
    start,
    pause,
    resume,
    continueRun,
    stop,
    submit,
    togglePowerSave,
    stopAndSubmit,
    cancel,
    reset,
    markUploaded,
    warmStartLocation,
    heading,
    pauseBudgetUsedSeconds,
    pauseBudgetRemainingSeconds,
    pauseLimitSeconds: RUN_PAUSE_LIMIT_SECONDS,
    firstValidPointMs,
    // warmStartLocation being set means the GPS chip is already locked.
    // latestPoint being null only means no points passed hygiene yet — not that GPS is lost.
    isSearchingGps:
      (status === 'idle' && permission === 'granted' && warmStartLocation === null) ||
      (status === 'active' && latestPoint === null && warmStartLocation === null),
    searchingTimedOut,
    trackerMode,
  }
}
