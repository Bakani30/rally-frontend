import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { RunReplayMap, type ReplayMapProvider } from '@/components/maps/RunReplayMap'
import type { ReplayCamera } from '@/components/maps/MapLibreRunReplayView'
import { ReplayElevationChart } from '@/components/run/ReplayElevationChart'
import { ReplayVideoPreview } from '@/components/run/replay/ReplayVideoPreview'
import { GlassRecapSheet } from '@/components/run/replay/GlassRecapSheet'
import { ReplayMapWarmupOverlay } from '@/components/run/replay/ReplayMapWarmupOverlay'
import { ReplayMarkerPicker } from '@/components/run/replay/ReplayMarkerPicker'
import { RallyBrandMark } from '@/components/run/brand/RallyBrandMark'
import { RallyPalette } from '@/constants/theme'
import { useActivityDetail } from '@/hooks/useActivityDetail'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useProfile } from '@/hooks/useProfile'
import { useReplayRouteData } from '@/hooks/useReplayRouteData'
import { useRunBodyMetrics } from '@/hooks/useRunBodyMetrics'
import { FINALE_HOLD_MS, useReplayVideoShare } from '@/hooks/useReplayVideoShare'
import type { GpsPoint } from '@/lib/run-tracking/gps/gpsTypes'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { pickAvatarFromLibrary } from '@/lib/profile/avatarService'
import { defaultReplayMapProvider, toggleReplayMapProvider } from '@/lib/maps/replayMapProvider'
import { formatDistance, formatDuration } from '@/lib/run-tracking/session/runSessionFormat'
import {
  buildElevationProfile,
  buildReplayTrack,
  elapsedFractionAtProgress,
  offsetCoordinate,
  preparePath,
  revealedCoordinatesAtProgress,
  sampleAtProgress,
} from '@/lib/replay/replayPath'
import {
  initialReplayIntroPhase,
  nextReplayIntroPhase,
  REPLAY_DIVE_DURATION_MS,
  REPLAY_OVERVIEW_HOLD_MS,
  shouldAdvanceReplayProgress,
} from '@/lib/replay/replayIntro'
import {
  localMotionAtProgress,
  nextReplayCameraMode,
  orbitZoomForSpread,
  type ReplayCameraMode,
} from '@/lib/replay/replayCameraMotion'
import {
  clearReplayMarkerCustomization,
  loadReplayMarkerCustomization,
  persistReplayMarkerImage,
  replayMarkerInitials,
  saveReplayMarkerCustomization,
  type ReplayMarkerCustomization,
} from '@/lib/replay/replayMarkerCustomization'
import {
  boundsCenter,
  summaryRouteCameraBounds,
  summaryRouteCameraMetrics,
  zoomForSummaryRoute,
  type RouteBounds,
} from '@/lib/maps/routeCamera'
import {
  prepareReplayMapCompanions,
  revealReplayMapCompanions,
} from '@/lib/activities/detail/activityReplayCompanionMapper'

declare const __DEV__: boolean

/**
 * Full-screen 3D fly-over replay of a solo run. The camera walks the route by
 * distance fraction (see lib/replay/replayPath) at a steady visual speed; all
 * geometry lives in that pure module so this screen only orchestrates playback
 * state + controls.
 *
 */

// Reveal speed model: the camera sweeps the route at a real ground speed that
// eases in from V_START to a capped V_MAX over the first RAMP_METERS. This keeps
// short runs slow/legible and long runs from flying by, and makes two replays
// of different lengths feel proportionally different (a long run plays longer).
const REPLAY_V_START = 35 // m/s of route revealed at the start (slow, detailed)
const REPLAY_V_MAX = 150 // m/s reveal-speed cap — prevents the "too fast" fly-by
const REPLAY_RAMP_METERS = 400 // distance over which speed eases V_START -> V_MAX
const SPEEDS = [1, 2, 4, 8] as const
const TICK_MS = 33 // 30 Hz targets; native display-link interpolation fills 60 fps
// Street-level framing matched to the Apple Maps 3D replay reference.
const CAMERA_ZOOM = 17.4
const CAMERA_PITCH = 60
const LOOK_AHEAD_METERS = 50
const FINALE_PITCH = 0
const FINALE_DURATION_MS = 2_600
const BEARING_SNAP_THRESHOLD_DEG = 30
const BEARING_EASE_MS = 700
const APPLE_WARMUP_WATCHDOG_MS = 14_000

export default function RunReplayScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>()
  const { data: activity, isPending } = useActivityDetail(sessionId)
  const { data: profile } = useProfile(activity?.user_id)
  const { data: replayRouteData } = useReplayRouteData(activity?.id)
  const { width } = useWindowDimensions()

  const runDetails = activity?.running_activity_details ?? null
  const movingTimeSeconds = runDetails?.moving_time_seconds ?? 0
  const { track: trackEvent } = useAnalytics()

  // Body metrics (HR zones, calories) need the run's real wall-clock window
  // to read HealthKit/Health Connect samples — same wiring as the summary
  // screen's finale card (app/run/summary/[sessionId].tsx).
  const activityWindow = useMemo(() => {
    if (!activity?.started_at || !activity?.ended_at) return null
    return { start: new Date(activity.started_at), end: new Date(activity.ended_at) }
  }, [activity?.started_at, activity?.ended_at])
  const bodyMetrics = useRunBodyMetrics({
    sessionId,
    window: activityWindow,
    movingTimeSeconds: runDetails?.moving_time_seconds ?? null,
    distanceMeters: runDetails?.distance_meters ?? null,
    paceSecondsPerKm: runDetails?.pace_seconds_per_km ?? null,
    pedometerSteps: runDetails?.steps ?? null,
    deviceCalories: runDetails?.calories ?? null,
  })

  const track = useMemo(() => {
    const rawPath = (runDetails?.route_summary as { path?: GpsPoint[] } | null)?.path ?? []
    const prepared = preparePath(
      rawPath.map((p) => ({ lat: p.lat, lng: p.lng, altitude: p.altitude, timestamp: p.timestamp })),
      { toleranceMeters: 4, smoothRadius: 1 },
    )
    return buildReplayTrack(prepared)
  }, [runDetails])

  const fullCoordinates = useMemo<[number, number][]>(
    () => track.points.map((p) => [p.lng, p.lat]),
    [track],
  )
  const elevation = useMemo(() => buildElevationProfile(track), [track])
  const hasRoute = track.totalMeters > 0 && track.points.length >= 2

  const routeBounds = useMemo<RouteBounds | null>(() => {
    if (track.points.length === 0) return null
    let west = Infinity
    let south = Infinity
    let east = -Infinity
    let north = -Infinity
    for (const p of track.points) {
      if (p.lng < west) west = p.lng
      if (p.lng > east) east = p.lng
      if (p.lat < south) south = p.lat
      if (p.lat > north) north = p.lat
    }
    return [west, south, east, north]
  }, [track])

  const initialProvider = defaultReplayMapProvider(Platform.OS)
  const [progress, setProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(initialProvider !== 'apple')
  const [followBearing, setFollowBearing] = useState(true)
  const [speedIndex, setSpeedIndex] = useState(0)
  const [isFinale, setIsFinale] = useState(false)
  const [replayProvider, setReplayProvider] = useState<ReplayMapProvider>(
    initialProvider,
  )
  const [introPhase, setIntroPhase] = useState(
    () => initialReplayIntroPhase(Platform.OS, initialProvider),
  )
  const [warmupProgress, setWarmupProgress] = useState({ completed: 0, total: 0 })
  const [markerCustomization, setMarkerCustomization] = useState<ReplayMarkerCustomization | null>(null)
  const [markerPickerVisible, setMarkerPickerVisible] = useState(false)
  const speed = SPEEDS[speedIndex]

  const markerUserId = activity?.user_id
  const markerInitials = replayMarkerInitials(profile?.display_name, profile?.handle)
  const markerAvatarUrl = markerCustomization?.kind === 'image'
    ? markerCustomization.value
    : markerCustomization?.kind === 'emoji'
      ? null
      : profile?.avatar_url ?? null
  const markerEmoji = markerCustomization?.kind === 'emoji' ? markerCustomization.value : null

  useEffect(() => {
    let cancelled = false
    setMarkerCustomization(null)
    void loadReplayMarkerCustomization(markerUserId).then((customization) => {
      if (!cancelled) setMarkerCustomization(customization)
    })
    return () => {
      cancelled = true
    }
  }, [markerUserId])

  const persistMarkerCustomization = useCallback((customization: ReplayMarkerCustomization) => {
    setMarkerCustomization(customization)
    void saveReplayMarkerCustomization(markerUserId, customization).catch(() => {})
  }, [markerUserId])

  const pickMarkerPhoto = useCallback(async () => {
    try {
      const picked = await pickAvatarFromLibrary()
      if (!picked) return
      const savedUri = persistReplayMarkerImage(picked.uri, markerUserId)
      persistMarkerCustomization({ kind: 'image', value: savedUri })
      setMarkerPickerVisible(false)
    } catch (error) {
      Alert.alert('เลือกรูปไม่ได้', error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง')
    }
  }, [markerUserId, persistMarkerCustomization])

  const resetMarkerCustomization = useCallback(() => {
    setMarkerCustomization(null)
    void clearReplayMarkerCustomization(markerUserId).catch(() => {})
    setMarkerPickerVisible(false)
  }, [markerUserId])

  const progressRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)
  const lastPushRef = useRef(0)
  const lastBearingRef = useRef(0)
  const cameraModeRef = useRef<ReplayCameraMode>('chase')
  const replayProviderRef = useRef(replayProvider)
  const introPhaseRef = useRef(introPhase)
  replayProviderRef.current = replayProvider
  introPhaseRef.current = introPhase

  useEffect(() => {
    if (!isPlaying || !hasRoute || !shouldAdvanceReplayProgress(introPhase)) return
    let mounted = true
    const step = (ts: number) => {
      if (!mounted) return
      if (lastTsRef.current == null) lastTsRef.current = ts
      const dt = ts - lastTsRef.current
      lastTsRef.current = ts
      const totalMeters = track.totalMeters
      if (totalMeters > 0) {
        const traveled = progressRef.current * totalMeters
        // Ease-in (quadratic) from V_START up to the V_MAX ceiling.
        const rampT = Math.min(1, traveled / REPLAY_RAMP_METERS)
        const velocity = REPLAY_V_START + (REPLAY_V_MAX - REPLAY_V_START) * rampT * rampT
        const deltaMeters = velocity * speed * (dt / 1000)
        progressRef.current = Math.min(1, progressRef.current + deltaMeters / totalMeters)
      } else {
        progressRef.current = 1
      }
      if (ts - lastPushRef.current >= TICK_MS || progressRef.current >= 1) {
        lastPushRef.current = ts
        setProgress(progressRef.current)
      }
      if (progressRef.current >= 1) {
        setIsPlaying(false)
        setIsFinale(true)
        return
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      mounted = false
      lastTsRef.current = null
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [hasRoute, introPhase, isPlaying, speed, track])

  useEffect(() => {
    if (introPhase !== 'overview' || isFinale) return
    const timer = setTimeout(() => {
      setIntroPhase((phase) => nextReplayIntroPhase(phase))
    }, REPLAY_OVERVIEW_HOLD_MS)
    return () => clearTimeout(timer)
  }, [introPhase, isFinale])

  useEffect(() => {
    if (introPhase !== 'dive' || isFinale) return
    const timer = setTimeout(() => {
      setIntroPhase((phase) => nextReplayIntroPhase(phase))
    }, REPLAY_DIVE_DURATION_MS)
    return () => clearTimeout(timer)
  }, [introPhase, isFinale])

  useEffect(() => {
    if (Platform.OS !== 'ios' || replayProvider !== 'apple' || introPhase !== 'preloading') return
    const timer = setTimeout(() => {
      setReplayProvider('maplibre')
      setIntroPhase('chase')
      setIsPlaying(true)
    }, APPLE_WARMUP_WATCHDOG_MS)
    return () => clearTimeout(timer)
  }, [introPhase, replayProvider])

  const restart = () => {
    progressRef.current = 0
    lastTsRef.current = null
    setProgress(0)
    setIsFinale(false)
    setIntroPhase('chase')
    setIsPlaying(true)
  }

  const togglePlay = () => {
    if (progressRef.current >= 1) {
      restart()
      return
    }
    lastTsRef.current = null
    setIsPlaying((v) => !v)
  }

  const cycleSpeed = () => setSpeedIndex((i) => (i + 1) % SPEEDS.length)

  const toggleReplayProvider = () => {
    setReplayProvider((provider) => {
      const nextProvider = toggleReplayMapProvider(Platform.OS, provider)
      setWarmupProgress({ completed: 0, total: 0 })
      setIntroPhase(initialReplayIntroPhase(Platform.OS, nextProvider))
      setIsPlaying(nextProvider !== 'apple')
      return nextProvider
    })
  }

  const skipToFinale = () => {
    progressRef.current = 1
    lastTsRef.current = null
    setProgress(1)
    setIsPlaying(false)
    setIntroPhase('chase')
    setIsFinale(true)
  }

  const handleAppleReady = useCallback(() => {
    if (replayProviderRef.current !== 'apple' || introPhaseRef.current !== 'preloading') return
    setWarmupProgress((current) => ({
      completed: current.total > 0 ? current.total : current.completed,
      total: current.total,
    }))
    setIntroPhase('overview')
    setIsPlaying(true)
  }, [])

  const handleAppleUnavailable = useCallback(() => {
    if (replayProviderRef.current !== 'apple') return
    setReplayProvider('maplibre')
    setIntroPhase('chase')
    setIsPlaying(true)
  }, [])

  const close = () => {
    if (router.canGoBack()) {
      router.back()
      return
    }
    guardedRouter.replace('/(tabs)', { actionKey: `run-replay:${sessionId}:fallback-home` })
  }

  const video = useReplayVideoShare()
  const prevVideoStateRef = useRef(video.state)

  // Cinematic playback for the recording: stay paused at progress 0 through
  // the countdown, then restart() the moment recording actually begins so
  // the captured clip starts exactly on the fly-over, not the countdown.
  useEffect(() => {
    const prevState = prevVideoStateRef.current
    if (prevState !== video.state) {
      if (video.state === 'countdown' && prevState === 'idle') {
        setIsPlaying(false)
      }
      if (video.state === 'recording' && prevState === 'countdown') {
        restart()
      }
      prevVideoStateRef.current = video.state
    }
  }, [video.state])

  const beginVideoShare = () => {
    setSpeedIndex(0)
    setFollowBearing(true)
    void video.begin()
  }

  // Finale camera settles for FINALE_DURATION_MS; hold a beat longer so the
  // recorded clip includes the settled shot before we stop the recorder.
  const isVideoCapturing = video.isCapturing
  const onVideoFinaleComplete = video.onFinaleComplete
  useEffect(() => {
    if (!isFinale || !isVideoCapturing) return
    const timer = setTimeout(() => {
      void onVideoFinaleComplete()
    }, FINALE_DURATION_MS + FINALE_HOLD_MS)
    return () => clearTimeout(timer)
  }, [isFinale, isVideoCapturing, onVideoFinaleComplete])

  // Glass recap sheet appears once the finale camera has settled — never
  // while a video capture is in progress (so it can't show up in the
  // recorded clip) and never under the post-capture preview ('ready').
  const [finaleDone, setFinaleDone] = useState(false)
  const videoState = video.state
  useEffect(() => {
    if (!isFinale || isVideoCapturing || videoState === 'ready') {
      setFinaleDone(false)
      return
    }
    const timer = setTimeout(() => setFinaleDone(true), FINALE_DURATION_MS + 200)
    return () => clearTimeout(timer)
  }, [isFinale, isVideoCapturing, videoState])

  const glassSheetShownRef = useRef(false)
  const showGlassSheet = finaleDone && !video.chromeHidden
  useEffect(() => {
    if (!showGlassSheet || glassSheetShownRef.current) return
    glassSheetShownRef.current = true
    trackEvent({ name: 'replay_glass_sheet_shown', properties: { has_hr: bodyMetrics.data?.avgBpm != null } })
  }, [showGlassSheet, bodyMetrics.data, trackEvent])

  const sample = useMemo(() => sampleAtProgress(track, progress), [track, progress])
  const replayTiming = useMemo(() => ({
    startedAt: activity?.started_at ?? null,
    endedAt: activity?.ended_at ?? null,
  }), [activity?.ended_at, activity?.started_at])
  const preparedCompanions = useMemo(
    () => prepareReplayMapCompanions({
      primarySessionId: activity?.id ?? '',
      primaryUserId: activity?.user_id ?? '',
      primaryTrack: track,
      sources: replayRouteData?.routes ?? [],
      useFixture: __DEV__ && !!replayRouteData?.matchId,
    }),
    [activity?.id, activity?.user_id, replayRouteData?.matchId, replayRouteData?.routes, track],
  )
  const companions = useMemo(
    () => revealReplayMapCompanions({
      primaryTiming: replayTiming,
      prepared: preparedCompanions,
      replayProgress: progress,
    }),
    [preparedCompanions, progress, replayTiming],
  )
  const revealedCoordinates = useMemo(
    () => replayProvider === 'apple' ? [] : revealedCoordinatesAtProgress(track, progress),
    [replayProvider, track, progress],
  )
  const lookAhead = useMemo(
    () => offsetCoordinate(sample.lng, sample.lat, sample.bearing, LOOK_AHEAD_METERS),
    [sample],
  )

  const elapsedFraction = useMemo(
    () => elapsedFractionAtProgress(track, progress),
    [track, progress],
  )
  const hudTimeText = formatDuration(Math.round(movingTimeSeconds * (elapsedFraction ?? progress)))

  const camera = useMemo<ReplayCamera>(() => {
    if (isFinale && routeBounds) {
      const finaleBounds = summaryRouteCameraBounds(routeBounds, track.totalMeters)
      const metrics = summaryRouteCameraMetrics(finaleBounds, track.totalMeters)
      return {
        center: boundsCenter(finaleBounds),
        zoom: zoomForSummaryRoute(metrics),
        pitch: FINALE_PITCH,
        bearing: 0,
        durationMs: FINALE_DURATION_MS,
        easing: 'fly',
      }
    }
    if ((introPhase === 'preloading' || introPhase === 'overview') && routeBounds) {
      const overviewBounds = summaryRouteCameraBounds(routeBounds, track.totalMeters)
      const metrics = summaryRouteCameraMetrics(overviewBounds, track.totalMeters)
      return {
        center: boundsCenter(overviewBounds),
        zoom: zoomForSummaryRoute(metrics),
        pitch: 0,
        bearing: 0,
        durationMs: 0,
        easing: 'linear',
      }
    }

    // Adaptive framing during live playback: lock to an overhead orbit when the
    // runner is churning in one spot (tight loops / GPS jitter), otherwise chase.
    const motion = introPhase === 'chase' ? localMotionAtProgress(track, progress) : null
    const previousMode = cameraModeRef.current
    cameraModeRef.current = motion
      ? nextReplayCameraMode(previousMode, motion)
      : 'chase'
    // Leaving the overhead lock changes pitch and zoom at once, so it always
    // needs the eased duration — the bearing delta alone can be small enough to
    // fall through to a tick-length tween and snap the camera down.
    const leftOrbit = previousMode === 'orbit' && cameraModeRef.current === 'chase'

    if (motion && cameraModeRef.current === 'orbit') {
      // Top-down, north-up, no rotation — reveals the whole looping pattern and
      // holds until the runner breaks out of the cluster (hysteresis in the mode).
      lastBearingRef.current = 0
      return {
        center: [motion.centroid.lng, motion.centroid.lat],
        zoom: orbitZoomForSpread(motion.spreadMeters),
        pitch: 0,
        bearing: 0,
        durationMs: 900,
        easing: 'ease',
      }
    }

    // Chase: follow a smoothed net heading, not the raw per-sample GPS bearing,
    // so wiggly segments no longer spin the camera.
    const chaseBearing = followBearing ? (motion?.netBearing ?? sample.bearing) : 0
    const delta = Math.abs(((chaseBearing - lastBearingRef.current + 540) % 360) - 180)
    lastBearingRef.current = chaseBearing
    return {
      center: [lookAhead.lng, lookAhead.lat],
      zoom: CAMERA_ZOOM,
      pitch: CAMERA_PITCH,
      bearing: chaseBearing,
      durationMs: introPhase === 'dive'
        ? REPLAY_DIVE_DURATION_MS
        : leftOrbit || delta > BEARING_SNAP_THRESHOLD_DEG ? BEARING_EASE_MS : TICK_MS + 40,
      easing: introPhase === 'dive'
        ? 'fly'
        : leftOrbit || delta > BEARING_SNAP_THRESHOLD_DEG ? 'ease' : 'linear',
    }
  }, [followBearing, introPhase, isFinale, lookAhead, progress, routeBounds, sample.bearing, track])

  if (isPending && !activity) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={RallyPalette.blue} />
      </View>
    )
  }

  if (!hasRoute) {
    return (
      <SafeAreaView style={[styles.root, styles.center]} edges={['top', 'bottom']}>
        <MaterialCommunityIcons name="map-marker-off-outline" size={30} color="#5a6b63" />
        <Text style={styles.emptyText}>ไม่มีข้อมูล GPS พอสำหรับดู 3D Replay</Text>
        <Pressable style={styles.emptyButton} onPress={close}>
          <Text style={styles.emptyButtonText}>ปิด</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  return (
    <View style={styles.root}>
      <RunReplayMap
        key={replayProvider}
        provider={replayProvider}
        fullCoordinates={fullCoordinates}
        revealedCoordinates={revealedCoordinates}
        revealedProgress={progress}
        marker={{ lat: sample.lat, lng: sample.lng }}
        markerAvatarUrl={markerAvatarUrl}
        markerEmoji={markerEmoji}
        markerInitials={markerInitials}
        companions={companions}
        camera={camera}
        followBearing={isFinale ? true : followBearing}
        onMarkerPress={(playerId) => {
          if (playerId !== 'self') return
          if (!video.chromeHidden) setMarkerPickerVisible(true)
        }}
        onAppleUnavailable={handleAppleUnavailable}
        onAppleReady={handleAppleReady}
        onAppleWarmupProgress={setWarmupProgress}
      />

      <ReplayMapWarmupOverlay
        visible={Platform.OS === 'ios' && replayProvider === 'apple' && introPhase === 'preloading'}
        completed={warmupProgress.completed}
        total={warmupProgress.total}
        onClose={close}
      />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none" edges={['top', 'bottom']}>
        {!video.chromeHidden && (
          <>
            {/* Top controls */}
            <View style={styles.topRow} pointerEvents="box-none">
              <ControlButton icon="close" label="ปิด" onPress={close} />
              <View style={styles.topRight}>
                {Platform.OS === 'ios' && (
                  <ControlButton
                    icon={replayProvider === 'apple' ? 'apple' : 'cube-outline'}
                    label={replayProvider === 'apple' ? 'ใช้ Apple 3D' : 'ใช้ Rally 3D'}
                    active={replayProvider === 'apple'}
                    onPress={toggleReplayProvider}
                  />
                )}
                <ControlButton icon="compass-outline" label="หมุนตามทิศ" active={followBearing} onPress={() => setFollowBearing((v) => !v)} />
                <ControlButton icon="restart" label="เริ่มใหม่" onPress={restart} />
                <ControlButton
                  icon="video-outline"
                  label="แชร์วิดีโอ"
                  disabled={!hasRoute}
                  onPress={beginVideoShare}
                />
              </View>
            </View>

            {/* Bottom panel — hidden while the glass recap sheet covers it,
                so its duplicate readouts/controls can't sit underneath. */}
            {!showGlassSheet && (
            <View style={styles.bottomPanel} pointerEvents="box-none">
              {elevation.hasAltitude && (
                <View style={styles.chartCard}>
                  <ReplayElevationChart
                    profile={elevation}
                    progressDistanceMeters={sample.distanceMeters}
                    totalMeters={track.totalMeters}
                    width={Math.max(1, width - 64)}
                  />
                </View>
              )}

              <View style={styles.hudRow}>
                <View style={styles.hudMetric}>
                  <Text style={styles.hudValue}>{formatDistance(sample.distanceMeters)}</Text>
                  <Text style={styles.hudLabel}>ระยะทาง</Text>
                </View>
                <View style={styles.hudMetric}>
                <Text style={styles.hudValue}>{hudTimeText}</Text>
                  <Text style={styles.hudLabel}>เวลา</Text>
                </View>
              </View>

              <View style={styles.transport}>
                <Pressable style={styles.speedChip} onPress={cycleSpeed} hitSlop={8}>
                  <Text style={styles.speedText}>{speed}x</Text>
                </Pressable>
                <Pressable style={styles.playButton} onPress={togglePlay} hitSlop={8}>
                  <MaterialCommunityIcons
                    name={progress >= 1 ? 'restart' : isPlaying ? 'pause' : 'play'}
                    size={28}
                    color="#ffffff"
                  />
                </Pressable>
                {!isFinale ? (
                  <Pressable
                    style={styles.speedChip}
                    onPress={skipToFinale}
                    accessibilityRole="button"
                    accessibilityLabel="ข้ามไปสรุป"
                    hitSlop={8}
                  >
                    <Text style={styles.skipText}>ข้าม</Text>
                  </Pressable>
                ) : (
                  <View style={styles.speedChip} />
                )}
              </View>
            </View>
            )}
          </>
        )}

        {video.chromeHidden && (
          <>
            <View style={styles.brandWatermark} pointerEvents="none">
              <RallyBrandMark treatment="on-dark" size={34} />
            </View>
            {video.state === 'countdown' && (
              <View style={styles.countdownOverlay} pointerEvents="none">
                <Text style={styles.countdownNumber}>{video.countdownValue}</Text>
                <Text style={styles.countdownNote}>
                  ระบบจะถามสิทธิ์บันทึกหน้าจอ · Rally อัดเฉพาะช่วงรีเพลย์นี้เท่านั้น
                </Text>
              </View>
            )}
          </>
        )}
      </SafeAreaView>

      <GlassRecapSheet
        visible={showGlassSheet}
        body={bodyMetrics.data}
        distanceMeters={runDetails?.distance_meters ?? null}
        movingTimeSeconds={runDetails?.moving_time_seconds ?? null}
        paceSecondsPerKm={runDetails?.pace_seconds_per_km ?? null}
        pointDelta={activity?.point_delta ?? null}
        onOpenSummary={() => {
          guardedRouter.push({
            pathname: '/run/summary/[sessionId]',
            params: { sessionId },
          }, { actionKey: `run-replay:${sessionId}:open-summary` })
        }}
        onShareVideo={beginVideoShare}
      />

      <ReplayMarkerPicker
        visible={markerPickerVisible}
        avatarUrl={markerAvatarUrl}
        emoji={markerEmoji}
        initials={markerInitials}
        hasCustom={markerCustomization != null}
        onClose={() => setMarkerPickerVisible(false)}
        onPickPhoto={() => void pickMarkerPhoto()}
        onPickEmoji={(value) => {
          persistMarkerCustomization({ kind: 'emoji', value })
          setMarkerPickerVisible(false)
        }}
        onReset={resetMarkerCustomization}
      />

      {video.state === 'ready' && video.videoUri && (
        <ReplayVideoPreview
          uri={video.videoUri}
          showInstagram={Platform.OS === 'android' && Boolean(process.env.EXPO_PUBLIC_FACEBOOK_APP_ID)}
          busy={video.busy}
          onShare={() => void video.shareVideo()}
          onSave={() => void video.saveVideo()}
          onShareInstagram={() => void video.shareToInstagram()}
          onCancel={video.reset}
        />
      )}

      {video.state === 'failed' && video.errorMessage && (
        <View style={styles.errorBanner} pointerEvents="box-none">
          <Text style={styles.errorBannerText}>{video.errorMessage}</Text>
          <Pressable style={styles.errorBannerDismiss} onPress={video.reset} hitSlop={8}>
            <Text style={styles.errorBannerDismissText}>ปิด</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

function ControlButton({
  icon,
  label,
  active,
  disabled,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  label: string
  active?: boolean
  disabled?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      style={[styles.controlButton, active && styles.controlButtonActive, disabled && styles.controlButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
    >
      <MaterialCommunityIcons name={icon} size={20} color={active ? '#ffffff' : '#233'} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#eef2ec' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  topRight: { flexDirection: 'row', gap: 10 },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonActive: { backgroundColor: RallyPalette.blue },
  controlButtonDisabled: { opacity: 0.4 },
  bottomPanel: { gap: 12 },
  brandWatermark: { position: 'absolute', left: 16, bottom: 16 },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  countdownNumber: { color: '#ffffff', fontSize: 96, fontWeight: '900' },
  countdownNote: { color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  errorBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: 'rgba(20,20,20,0.92)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorBannerText: { flex: 1, color: '#ffffff', fontSize: 13, fontWeight: '700' },
  errorBannerDismiss: { paddingHorizontal: 10, paddingVertical: 6 },
  errorBannerDismissText: { color: RallyPalette.blue, fontSize: 13, fontWeight: '900' },
  chartCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  hudRow: { flexDirection: 'row', gap: 10 },
  hudMetric: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  hudValue: { color: '#1c2321', fontSize: 20, fontWeight: '900' },
  hudLabel: { color: '#5a6b63', fontSize: 11, fontWeight: '700', marginTop: 2 },
  transport: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  speedChip: {
    minWidth: 56,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedText: { color: '#1c2321', fontSize: 15, fontWeight: '900' },
  skipText: { color: RallyPalette.blue, fontSize: 13, fontWeight: '900' },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: RallyPalette.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { color: '#5a6b63', fontSize: 14, fontWeight: '700', textAlign: 'center', paddingHorizontal: 24 },
  emptyButton: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: RallyPalette.blue,
  },
  emptyButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
})
