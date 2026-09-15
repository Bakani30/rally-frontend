import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Animated, Easing, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { usePreventRemove } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { MapLibreRunView } from '@/components/maps/MapLibreRunView'
import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { BatteryOptModal } from '@/components/run/BatteryOptModal'
import { StartCountdown } from '@/components/run/StartCountdown'
import {
  RallyPalette,
  RunArenaDark as RunArenaDarkPalette,
  RunArenaPalette as RunArenaLightPalette,
  type RunArenaPalette as RunArenaColors,
} from '@/constants/theme'
import type { MapStyleId } from '@/lib/maps/mapLibreConfig'
import { useRunArenaTheme, useThemeMode } from '@/hooks/useAppTheme'
import { useRunSession } from '@/hooks/useRunSession'
import { useAuth } from '@/hooks/useAuth'
import { useActiveGuildGoal, useContributeGuildGoal } from '@/hooks/useActiveGuildGoal'
import { useMatch } from '@/hooks/useMatch'
import { useMatchActions } from '@/hooks/useMatchActions'
import { useChallenge } from '@/hooks/useChallenge'
import { useRunRewardPolicy } from '@/hooks/useRunRewardPolicy'
import { useSubmitActivity } from '@/hooks/useSubmitActivity'
import { buildRunningSubmissionDataFromSession } from '@/lib/activities/submission/runningSessionSubmission'
import { useTeamRunPresence } from '@/hooks/useTeamRunPresence'
import { derivePresencePhase } from '@/lib/run-tracking/team/teamRunPresenceState'
import { assembleCrewMembers, buildCrewRoster, type CrewRosterRow } from '@/lib/run-tracking/team/crewRoster'
import { CrewRosterSheet } from '@/components/run/CrewRosterSheet'
import { CrewMemberCallout } from '@/components/run/CrewMemberCallout'
import { SyncedStartCountdown } from '@/components/run/SyncedStartCountdown'
import { resolveSyncedRunStart } from '@/lib/run-tracking/session/syncedRunStart'
import { useWearRunCompanion } from '@/hooks/useWearRunCompanion'
import { formatPace } from '@/lib/run-tracking/gps/paceSmoothing'
import { plannedRouteLengthMeters, verifyRouteMatch } from '@/lib/run-tracking/routes/routeMatcher'
import type { GeoJsonLineString } from '@/lib/run-tracking/routes/routeTypes'
import {
  formatDistance,
  formatDuration,
  resolveRunHudTitle,
} from '@/lib/run-tracking/session/runSessionFormat'
import {
  getRunRewardPreviewFromPolicy,
  resolveLiveRunRewardPreviewDistance,
} from '@/lib/run-tracking/session/runSessionRewards'
import { buildRunNotice, resolveRunPillState, type RunNotice } from '@/lib/run-tracking/session/runNotice'
import { setSimulatorRunRouteFixture } from '@/lib/run-tracking/session/runSessionServiceFactory'
import { RUN_SUBMIT_MIN_DISTANCE_METERS } from '@/lib/run-tracking/session/runSessionSubmitRules'
import {
  extractRunSubmitErrorCode,
  getRunSubmitErrorMessage,
  isKnownRunSubmitErrorCode,
} from '@/lib/run-tracking/session/runSubmitErrorMessages'
import { isEdgeFunctionError } from '@/lib/supabase/edgeError'
import { useBatteryOptPrompt } from '@/hooks/useBatteryOptPrompt'
import { useAnalytics } from '@/hooks/useAnalytics'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import {
  clearActiveMatchLock,
  setActiveMatchLock,
  shouldLockMatchForUser,
} from '@/lib/match/activeMatchLock'
import { isHeartRouteSmokeChallengeId } from '@/lib/challenges/heartRouteSmokeEvent'
import type { GeoJSONLineString } from '@/lib/maps/mapTypes'
import {
  canLeaveCoopRunMatch,
  canRequestMutualCancel,
  willCoopRunSubmitCompleteBelowMinimum,
} from '@/lib/match/matchRules'
import {
  matchParticipantToLobbyPreview,
  type LobbyPlayerPreviewParticipant,
} from '@/lib/match/lobbyPlayerPreview'

type ActiveRunStyles = ReturnType<typeof createStyles>
type RunMapChoice = 'standard' | 'light' | 'dark'

const RUN_MAP_CHOICES: {
  id: RunMapChoice
  label: string
  icon: keyof typeof MaterialCommunityIcons.glyphMap
}[] = [
  { id: 'standard', label: 'Standard', icon: 'map-outline' },
  { id: 'light', label: 'Light', icon: 'white-balance-sunny' },
  { id: 'dark', label: 'Dark', icon: 'weather-night' },
]

export default function ActiveRunScreen() {
  const { challengeId, matchId } = useLocalSearchParams<{ challengeId?: string; matchId?: string }>()
  const backendChallengeId = isHeartRouteSmokeChallengeId(challengeId) ? null : challengeId
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const themeMode = useThemeMode()
  const runTheme = useRunArenaTheme()
  const RunArenaPalette = runTheme
  const [mapChoice, setMapChoice] = useState<RunMapChoice>(() => themeMode === 'dark' ? 'dark' : 'standard')
  const [mapChoiceMenuOpen, setMapChoiceMenuOpen] = useState(false)
  const [teamSheetExpanded, setTeamSheetExpanded] = useState(false)
  const styles = useMemo(() => createStyles(runTheme, mapChoice), [mapChoice, runTheme])
  const mapTone = mapChoice === 'dark' ? 'runDark' : 'runLight'
  const mapStyleId: MapStyleId =
    mapChoice === 'dark' ? 'dark'
    : mapChoice === 'light' ? 'clean'
    : 'standard'
  const activeMapChoice = RUN_MAP_CHOICES.find((choice) => choice.id === mapChoice) ?? RUN_MAP_CHOICES[0]
  const mapLayerIconColor = mapChoice === 'dark'
    ? RunArenaLightPalette.surface
    : RunArenaLightPalette.text
  const topIconColor = mapChoice === 'dark' ? RunArenaDarkPalette.text : RunArenaLightPalette.text
  const gpsIconColor = mapChoice === 'dark' ? RunArenaDarkPalette.trust : RunArenaLightPalette.trust
  const quietGpsIconColor = mapChoice === 'dark' ? RunArenaDarkPalette.textMuted : RunArenaLightPalette.textMuted
  const metricPalette: RunArenaColors = mapChoice === 'dark' ? RunArenaDarkPalette : RunArenaPalette
  const teamSheetPanResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dy) > 12 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        Math.abs(gesture.dy) > 12 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy < -24 || gesture.vy < -0.45) {
          setTeamSheetExpanded(true)
          return
        }
        if (gesture.dy > 24 || gesture.vy > 0.45) setTeamSheetExpanded(false)
      },
    }),
    [],
  )
  const { user } = useAuth()
  const {
    status,
    sessionId,
    distanceMeters,
    submittedDistanceMeters,
    activeDurationSeconds,
    paceSecondsPerKm,
    smoothedPaceSecondsPerKm,
    isAutoPaused,
    isVehiclePaused,
    permission,
    backgroundPermission,
    canAskAgain,
    error,
    stoppedRunBlockReason,
    avgHeartRate,
    path,
    latestPoint,
    start,
    pause,
    resume,
    continueRun,
    stopAndSubmit,
    submit,
    cancel,
    warmStartLocation,
    requestPermission,
    openLocationSettings,
    isSubmitting,
    submitResult,
    reset,
    markUploaded,
    isSearchingGps,
    searchingTimedOut,
    trackerMode,
    powerSaveRequested,
    gpsQuality,
    togglePowerSave,
    pauseBudgetUsedSeconds,
    pauseBudgetRemainingSeconds,
    pauseLimitSeconds,
  } = useRunSession({ matchId, challengeId: backendChallengeId })

  const { track } = useAnalytics()

  // Power-save (long-run) mode hides the map to save battery while stats stay
  // accurate. `peekMap` lets the runner glance at the route on demand.
  const [peekMap, setPeekMap] = useState(false)
  const isPowerSaveMode = trackerMode === 'power_save'
  const showRunMap = !isPowerSaveMode || peekMap
  const [countdownActive, setCountdownActive] = useState(false)
  const [visibleNoticeId, setVisibleNoticeId] = useState<string | null>(null)
  // Measured so the top notice banner can sit just below the top cluster
  // regardless of layout (solo HUD+pill vs the taller team header).
  const [topClusterHeight, setTopClusterHeight] = useState(0)
  const { activeGoal } = useActiveGuildGoal(user?.id)
  const contributeGuildGoalMutation = useContributeGuildGoal(user?.id)
  const { data: matchForLeave } = useMatch(matchId)
  const { data: routeChallenge } = useChallenge(challengeId)
  const { leaveMutation, requestMutualCancelMutation } = useMatchActions(matchId)
  const exitConfirmedRef = useRef(false)
  const [runExitAllowed, setRunExitAllowed] = useState(false)
  const [calloutMember, setCalloutMember] = useState<CrewRosterRow | null>(null)
  const calloutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const presenceLocation = latestPoint ?? warmStartLocation
  const isMatchRun = Boolean(matchId)
  const isCoopRun = Boolean(matchId && matchForLeave?.is_coop)
  const runMode: 'solo' | 'coop' | 'ffa' | '1v1' = !matchId
    ? 'solo'
    : matchForLeave?.rule_params?.running_mode === 'ffa'
      ? 'ffa'
      : matchForLeave?.is_coop
        ? 'coop'
        : '1v1'
  const runExitLocked = shouldLockMatchForUser(matchForLeave, user?.id)
  const presencePhase = derivePresencePhase({ status, isAutoPaused, isVehiclePaused })
  const presenceParticipantUserIds = useMemo(
    () =>
      (matchForLeave?.match_participants ?? [])
        .filter((participant) => participant.accepted_at && (participant as { is_active?: boolean }).is_active !== false)
        .map((participant) => participant.user_id),
    [matchForLeave],
  )
  const { teammates, connectionStatus } = useTeamRunPresence({
    matchId,
    userId: user?.id,
    location: presenceLocation,
    phase: presencePhase,
    distanceMeters,
    paceSecondsPerKm: status === 'active' ? (smoothedPaceSecondsPerKm ?? paceSecondsPerKm) : null,
    enabled: isMatchRun && permission === 'granted' && Boolean(presenceLocation) && status !== 'stopped',
    participantUserIds: presenceParticipantUserIds,
  })
  const participantPreviewByUserId = useMemo(() => {
    if (!matchForLeave) return new Map<string, LobbyPlayerPreviewParticipant>()
    return new Map(
      matchForLeave.match_participants
        .filter((participant) => participant.is_active !== false)
        .map((participant) => [
          participant.user_id,
          matchParticipantToLobbyPreview(participant, matchForLeave, user?.id),
        ]),
    )
  }, [matchForLeave, user?.id])
  const crewRosterMembers = useMemo(() => {
    if (!isMatchRun || !user?.id) return []
    return assembleCrewMembers({
      self: {
        userId: user.id,
        distanceMeters,
        paceSecondsPerKm: status === 'active' ? (smoothedPaceSecondsPerKm ?? paceSecondsPerKm) : null,
        phase: presencePhase,
      },
      teammates,
      relationForTeammates: runMode === 'ffa' || runMode === '1v1' ? 'rival' : 'ally',
      profiles: Object.fromEntries(participantPreviewByUserId),
      now: Date.now(),
    })
  }, [isMatchRun, user?.id, distanceMeters, smoothedPaceSecondsPerKm, paceSecondsPerKm, status, presencePhase, teammates, runMode, participantPreviewByUserId])
  const crewRosterRows = useMemo(() => buildCrewRoster(crewRosterMembers), [crewRosterMembers])
  const handlePressTeammateMarker = useCallback((userId: string) => {
    const row = crewRosterRows.find((member) => member.userId === userId)
    if (!row) return
    if (calloutTimerRef.current) clearTimeout(calloutTimerRef.current)
    setCalloutMember(row)
    calloutTimerRef.current = setTimeout(() => setCalloutMember(null), 2600)
  }, [crewRosterRows])
  useEffect(() => () => {
    if (calloutTimerRef.current) clearTimeout(calloutTimerRef.current)
  }, [])
  const handleOpenCalloutProfile = useCallback((userId: string) => {
    if (calloutTimerRef.current) clearTimeout(calloutTimerRef.current)
    setCalloutMember(null)
    guardedRouter.push({
      pathname: '/user/[id]',
      params: { id: userId, fromMatchId: matchId ?? '', lockedProfile: '1' },
    }, { actionKey: `run-active:${matchId ?? 'solo'}:user:${userId}` })
  }, [matchId])
  const handleStartPress = useCallback(() => {
    if (isSearchingGps) {
      const message = 'รอ GPS จับตำแหน่งก่อนเริ่มวิ่ง'
      if (Platform.OS === 'web') globalThis.alert(message)
      else Alert.alert('ยังเริ่มไม่ได้', message)
      return
    }
    setCountdownActive(true)
  }, [isSearchingGps])
  const handlePickMapChoice = useCallback((choice: RunMapChoice) => {
    setMapChoice(choice)
    setMapChoiceMenuOpen(false)
  }, [])
  const handleCountdownComplete = useCallback(() => {
    setCountdownActive(false)
    track({
      name: 'run_started',
      properties: { mode: runMode, has_match: isMatchRun, has_challenge: Boolean(backendChallengeId) },
    })
    void start()
  }, [backendChallengeId, isMatchRun, runMode, start, track])
  const handleCountdownCancel = useCallback(() => setCountdownActive(false), [])

  // A started match run drives its own synchronized countdown, so the manual GO
  // button is suppressed in favor of the shared start.
  const isSyncedMatchStart = isMatchRun && Boolean(matchForLeave?.started_at) && status === 'idle'

  // Synchronized multiplayer start: all devices count down to the same
  // server-stamped moment (started_at + buffer). The absolute target is clamped
  // into [arrival+MIN, arrival+MAX] so device clock skew can never make a runner
  // start instantly (fast clock) or stall forever (slow clock / late arrival).
  const [syncNowMs, setSyncNowMs] = useState(() => Date.now())
  const syncArrivalRef = useRef<number | null>(null)
  const lastSyncAttemptRef = useRef(0)

  useEffect(() => {
    if (!isSyncedMatchStart) {
      syncArrivalRef.current = null
      return
    }
    if (syncArrivalRef.current == null) syncArrivalRef.current = Date.now()
  }, [isSyncedMatchStart])

  const serverTargetMs = resolveSyncedRunStart(matchForLeave?.started_at, syncNowMs).targetMs
  const syncArrivalMs = syncArrivalRef.current
  const effectiveTargetMs =
    isSyncedMatchStart && syncArrivalMs != null && serverTargetMs != null
      ? Math.min(syncArrivalMs + SYNC_START_MAX_MS, Math.max(syncArrivalMs + SYNC_START_MIN_MS, serverTargetMs))
      : null
  const syncRemainingMs = effectiveTargetMs != null ? effectiveTargetMs - syncNowMs : 0
  const syncSecondsRemaining = Math.max(0, Math.ceil(syncRemainingMs / 1000))
  const syncExpired = effectiveTargetMs != null && syncRemainingMs <= 0
  // Keep the overlay up through GPS acquisition so a synced runner always has
  // feedback and never faces a screen with no start affordance.
  const showSyncOverlay = effectiveTargetMs != null && (!syncExpired || isSearchingGps)

  useEffect(() => {
    if (!(isSyncedMatchStart && permission === 'granted')) return
    const timer = setInterval(() => setSyncNowMs(Date.now()), 250)
    return () => clearInterval(timer)
  }, [isSyncedMatchStart, permission])

  // Fire the run at the shared moment once GPS is ready. Retryable (guarded by a
  // 3s cooldown, not a permanent latch) so a transient start() failure recovers.
  useEffect(() => {
    if (!(isSyncedMatchStart && syncExpired && status === 'idle' && permission === 'granted' && !isSearchingGps)) return
    const nowMs = Date.now()
    if (nowMs - lastSyncAttemptRef.current <= SYNC_START_RETRY_MS) return
    lastSyncAttemptRef.current = nowMs
    handleCountdownComplete()
  }, [isSyncedMatchStart, syncExpired, status, permission, isSearchingGps, syncNowMs, handleCountdownComplete])
  // Only prompt once GPS permission is settled — the permission dialog and
  // the battery prompt otherwise stack on entry (and battery advice is
  // irrelevant while Rally can't read location at all).
  const batteryPrompt = useBatteryOptPrompt({ enabled: permission === 'granted' })

  useEffect(() => {
    if (!user?.id || !matchForLeave?.id) return
    if (runExitLocked) {
      void setActiveMatchLock(user.id, matchForLeave.id)
    } else {
      void clearActiveMatchLock(user.id, matchForLeave.id)
    }
  }, [matchForLeave?.id, runExitLocked, user?.id])

  // Vehicle-paused and auto-paused both halt counting; they share the amber
  // "not live" pill treatment but carry distinct labels.
  const isCountingPaused = status === 'active' && (isAutoPaused || isVehiclePaused)
  // Plain run-state pill (no GPS/permission detail — that copy lives in the
  // notice). See resolveRunPillState for the priority that mirrors the notice.
  const runPillState = resolveRunPillState({
    status,
    isAutoPaused,
    isVehiclePaused,
    permission,
    gpsQuality,
  })
  const showLiveHudDot = status === 'active' && !isAutoPaused && !isVehiclePaused
  const showStatusPill =
    (status === 'idle' && permission === 'granted') ||
    ((status === 'active' || status === 'paused') && permission !== 'granted') ||
    isCountingPaused ||
    status === 'paused' ||
    status === 'stopped' ||
    (status === 'active' && gpsQuality === 'lost')
  const gpsChipQuiet = permission === 'granted' && !isSearchingGps
  const gpsChipLabel =
    permission !== 'granted'
      ? 'OFF'
      : isSearchingGps
        ? 'LOCK'
        : 'GPS'
  const gpsChipIcon: keyof typeof MaterialCommunityIcons.glyphMap =
    permission !== 'granted'
      ? 'map-marker-off-outline'
      : isSearchingGps
        ? 'crosshairs-gps'
        : 'signal-cellular-3'
  const gpsChipIconColor =
    gpsChipQuiet
      ? quietGpsIconColor
      : permission !== 'granted' || isSearchingGps
        ? RunArenaPalette.warning
        : gpsIconColor
  const runHudTitle = resolveRunHudTitle({
    status,
    isMatchRun,
    permission,
    isSearchingGps,
    isAutoPaused,
    isVehiclePaused,
  })

  const plannedRunRouteGeoJson = useMemo<GeoJsonLineString | null>(() => {
    const routeGeoJson = routeChallenge?.planned_route_geojson
    if (!routeGeoJson || routeGeoJson.type !== 'LineString') return null
    if (routeGeoJson.coordinates.length < 2) return null
    return routeGeoJson
  }, [routeChallenge?.planned_route_geojson])

  const plannedRunRoute = useMemo<GeoJSONLineString | null>(() => {
    if (!plannedRunRouteGeoJson) return null
    return {
      type: 'Feature',
      properties: { challengeId: routeChallenge?.id ?? null },
      geometry: {
        type: 'LineString',
        coordinates: plannedRunRouteGeoJson.coordinates,
      },
    }
  }, [plannedRunRouteGeoJson, routeChallenge?.id])

  useEffect(() => {
    if (status !== 'idle') return
    const coordinates = plannedRunRoute?.geometry.coordinates
    if (!coordinates || coordinates.length < 2) return
    setSimulatorRunRouteFixture(coordinates.map(([lng, lat]) => ({ lat, lng })))
  }, [plannedRunRoute, status])

  const plannedRouteMatch = (() => {
    if (!plannedRunRouteGeoJson || path.length < 10) return null
    const totalLengthMeters = plannedRouteLengthMeters(plannedRunRouteGeoJson)
    if (totalLengthMeters <= 0) return null
    return verifyRouteMatch(path, {
      geojson: plannedRunRouteGeoJson,
      toleranceMeters: routeChallenge?.route_tolerance_m ?? 25,
      totalLengthMeters,
    })
  })()

  const routeEventRewardPoints = plannedRunRoute
    ? Math.max(0, routeChallenge?.reward_points ?? 0)
    : 0
  const routeEventRewardUnlocked = routeEventRewardPoints > 0 && plannedRouteMatch?.passed === true
  const routeEventProgressRatio = plannedRunRoute
    ? Math.min(1, Math.max(0, plannedRouteMatch?.lengthCoverage ?? 0))
    : null

  const canStart = status === 'idle' && permission === 'granted'
  const showPermPrompt = status === 'idle' && permission !== 'granted'
  const acceptedParticipantCount = (matchForLeave?.match_participants ?? []).filter(
    (participant) => participant.accepted_at && (participant as { is_active?: boolean }).is_active !== false,
  ).length
  const expectedTeamCount = isMatchRun ? Math.max(1, acceptedParticipantCount) : 1
  // Only teammates whose presence is still fresh (live/paused) count toward the
  // ready gate — a stale/dropped teammate must not make a short-handed crew look
  // full, so the host can't start on presence that lingers up to LOST_AFTER_MS.
  const readyTeammateCount = teammates.filter(
    (teammate) => teammate.liveness === 'live' || teammate.liveness === 'paused',
  ).length
  const selfReady =
    !isSearchingGps &&
    connectionStatus === 'subscribed' &&
    Boolean(presenceLocation)
  const readyTeamCount = (selfReady ? 1 : 0) + readyTeammateCount
  const needsTeamReady = isMatchRun && status === 'idle' && (!matchForLeave || expectedTeamCount > 1)
  const teamReady = !needsTeamReady || (Boolean(matchForLeave) && readyTeamCount >= expectedTeamCount)
  const startDisabled = canStart && (isSearchingGps || !teamReady)
  const pauseLimitReached = pauseBudgetUsedSeconds >= pauseLimitSeconds
  const stoppedRunBlocked = stoppedRunBlockReason !== null
  const runWouldFinishBelowSessionMinDistance =
    submittedDistanceMeters < RUN_SUBMIT_MIN_DISTANCE_METERS
  const teamRunWouldFinishBelowMinDistance = Boolean(
    isCoopRun &&
    matchForLeave &&
    user?.id &&
    willCoopRunSubmitCompleteBelowMinimum(matchForLeave, user.id, distanceMeters),
  )
  const teamMapOffline = isMatchRun && status === 'active' && connectionStatus !== 'subscribed'
  const activeMatchLabel = matchForLeave
    ? `วิ่ง ${matchForLeave.activity_type ?? 'แมตช์'}`
    : matchId
      ? 'วิ่งแมตช์'
      : null
  const activeRunNotice = buildRunNotice({
    error,
    isAutoPaused,
    isVehiclePaused,
    status,
    permission,
    backgroundPermission,
    isSearchingGps,
    searchingTimedOut,
    trackerMode,
    powerSaveRequested,
    teamMapOffline,
    teamRunWouldFinishBelowMinDistance,
    stoppedRunBlockReason,
    needsTeamReady,
    teamReady,
    matchForLeaveLoaded: Boolean(matchForLeave),
    readyTeamCount,
    expectedTeamCount,
    pauseBudgetUsedSeconds,
    pauseBudgetRemainingSeconds,
    pauseLimitSeconds,
    gpsQuality,
  })

  const activeRunNoticeId = activeRunNotice?.id ?? null
  useEffect(() => {
    if (!activeRunNoticeId) {
      setVisibleNoticeId(null)
      return
    }
    setVisibleNoticeId(activeRunNoticeId)
    const timer = setTimeout(() => {
      setVisibleNoticeId((current) => current === activeRunNoticeId ? null : current)
    }, 4200)
    return () => clearTimeout(timer)
  }, [activeRunNoticeId])

  const showRunNotice = Boolean(activeRunNotice && visibleNoticeId === activeRunNotice.id)
  const runRewardPolicyQuery = useRunRewardPolicy(matchId ?? null, user?.id)
  const runRewardPreviewDistanceMeters = resolveLiveRunRewardPreviewDistance({
    distanceMeters,
    submittedDistanceMeters,
  })
  const runRewardPreview = getRunRewardPreviewFromPolicy(
    runRewardPreviewDistanceMeters,
    runRewardPolicyQuery.data ?? null,
  )
  const currentRunPoints = runRewardPreview.estimateAvailable ? runRewardPreview.estimatedPoints : 0
  const rewardHudPoints = routeEventRewardUnlocked ? routeEventRewardPoints : currentRunPoints
  // Track each teammate's highest reported distance so the team total (and the
  // co-op goal bar) never regresses when a crewmate is pruned after a long
  // silence — cumulative distance already covered should not visibly vanish.
  const teammateMaxDistancesRef = useRef<Record<string, number>>({})
  const [teammateDistanceMeters, setTeammateDistanceMeters] = useState(0)
  useEffect(() => {
    let changed = false
    for (const teammate of teammates) {
      const meters = Math.max(0, teammate.location.distanceMeters ?? 0)
      if (meters > (teammateMaxDistancesRef.current[teammate.location.userId] ?? 0)) {
        teammateMaxDistancesRef.current[teammate.location.userId] = meters
        changed = true
      }
    }
    if (changed) {
      setTeammateDistanceMeters(
        Object.values(teammateMaxDistancesRef.current).reduce((sum, meters) => sum + meters, 0),
      )
    }
  }, [teammates])
  const teamDistanceMeters = distanceMeters + teammateDistanceMeters
  const teamDistanceLabel = formatDistance(teamDistanceMeters)

  const coopTargetMeters = isCoopRun ? Number(matchForLeave?.rule_params?.target_distance_meters) : NaN
  const crewTeamGoal = isCoopRun && Number.isFinite(coopTargetMeters) && coopTargetMeters > 0
    ? { currentMeters: teamDistanceMeters, targetMeters: coopTargetMeters }
    : null
  const pointsFly = useRef(new Animated.Value(0)).current
  const pointsPulse = useRef(new Animated.Value(1)).current
  const previousRunPoints = useRef(rewardHudPoints)
  const [pointGain, setPointGain] = useState<number | null>(null)

  useEffect(() => {
    const previous = previousRunPoints.current
    previousRunPoints.current = rewardHudPoints
    if (rewardHudPoints <= previous) return

    setPointGain(rewardHudPoints - previous)
    pointsFly.setValue(0)
    pointsPulse.setValue(1)
    Animated.parallel([
      Animated.sequence([
        Animated.timing(pointsPulse, {
          toValue: 1.08,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pointsPulse, {
          toValue: 1,
          duration: 330,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(pointsFly, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setPointGain(null)
    })
  }, [pointsFly, pointsPulse, rewardHudPoints])

  const pointsHudAnimatedStyle = useMemo(() => ({
    transform: [{ scale: pointsPulse }],
  }), [pointsPulse])
  const pointsFlyAnimatedStyle = useMemo(() => ({
    opacity: pointsFly.interpolate({
      inputRange: [0, 0.16, 0.78, 1],
      outputRange: [0, 1, 1, 0],
    }),
    transform: [
      {
        translateX: pointsFly.interpolate({
          inputRange: [0, 1],
          outputRange: [-54, 0],
        }),
      },
      {
        translateY: pointsFly.interpolate({
          inputRange: [0, 0.72, 1],
          outputRange: [94, 8, 0],
        }),
      },
      {
        scale: pointsFly.interpolate({
          inputRange: [0, 0.52, 1],
          outputRange: [0.74, 1.1, 0.48],
        }),
      },
    ],
  }), [pointsFly])
  const safeTopOffset = insets.top + 10
  const safeDockBottomOffset = Math.max(8, insets.bottom - 18)
  const dockLoweringOffset = insets.bottom + 14 - safeDockBottomOffset
  const teamSheetExtraOffset = isMatchRun && teamSheetExpanded ? 178 : 0
  const mapStyleBottomOffset = insets.bottom + 242 - dockLoweringOffset + teamSheetExtraOffset
  const mapEdgeBottomOffset = insets.bottom + 264 - dockLoweringOffset + teamSheetExtraOffset
  const mapControlBottomOffset = insets.bottom + 292 - dockLoweringOffset + teamSheetExtraOffset
  // Notice banner now sits at the TOP, just under the top cluster. Prefer the
  // measured cluster height; before first layout fall back to an estimate that
  // covers the solo HUD row + status pill (safeTopOffset + ~96). When the solo
  // live points HUD is showing (absolute at top:122, height 40) clamp below it
  // (162) so a full-width banner never lands on the points pill.
  const estimatedTopClusterHeight = safeTopOffset + 96
  const noticeTopBaseline = (topClusterHeight > 0 ? topClusterHeight : estimatedTopClusterHeight) + 12
  const runPointsHudVisible = !isMatchRun && status !== 'idle'
  const noticeTopOffset = runPointsHudVisible
    ? Math.max(noticeTopBaseline, 122 + 40 + 12)
    : noticeTopBaseline

  useWearRunCompanion({
    sessionId,
    status,
    distanceMeters,
    durationSeconds: activeDurationSeconds,
    paceSecondsPerKm: smoothedPaceSecondsPerKm ?? paceSecondsPerKm,
    heartRate: avgHeartRate,
    matchLabel: activeMatchLabel,
    guildGoalLabel: activeGoal?.label ?? null,
    guildGoalProgress: activeGoal?.progressRatio ?? null,
    activeMatchId: matchId ?? null,
    activeMatchLabel,
    joinCode: null,
    activeGuildGoalId: activeGoal?.id ?? null,
    activeGuildGoalLabel: activeGoal?.label ?? null,
    healthSummary: {
      steps: null,
      distanceMeters: Math.round(distanceMeters),
      calories: null,
      heartRate: avgHeartRate,
    },
    scoreDraft: null,
    partnerCampaign: activeGoal?.partner ?? null,
    start,
    pause,
    resume,
    stopAndSubmit,
  })

  const contributedGuildSessionRef = useRef<string | null>(null)
  const queueGuildGoalContribution = useCallback((activitySessionId: string) => {
    if (!activeGoal?.id) return
    if (contributedGuildSessionRef.current === activitySessionId) return
    contributedGuildSessionRef.current = activitySessionId
    contributeGuildGoalMutation.mutate({
      guildGoalId: activeGoal.id,
      activitySessionId,
    })
  }, [activeGoal?.id, contributeGuildGoalMutation])

  const shouldConfirmMapExit =
    !exitConfirmedRef.current &&
    !runExitAllowed &&
    !isSubmitting &&
    !submitResult &&
    (
      status === 'stopped'
        ? true
        : (Boolean(matchId) || status !== 'idle')
    )

  const confirmExitMap = useCallback((onConfirm: () => void) => {
    const continueExit = () => {
      exitConfirmedRef.current = true
      setCountdownActive(false)
      setRunExitAllowed(true)
      track({
        name: 'run_abandoned',
        properties: { status, has_match: isMatchRun },
      })
      setTimeout(onConfirm, 0)
    }

    const exitLocalRun = async () => {
      // Only navigate away once the local discard actually succeeded. On
      // failure the hook surfaces the error and the user stays on-screen, so
      // the surviving buffer row can never be auto-submitted by the retry pass.
      if (await cancel()) continueExit()
    }

    const exitMatchRun = () => {
      if (!matchForLeave || !user?.id) {
        const message = 'กำลังโหลดสถานะแมตช์ ลองอีกครั้ง'
        if (Platform.OS === 'web') globalThis.alert(message)
        else Alert.alert('ยังออกไม่ได้', message)
        return
      }

      if (canLeaveCoopRunMatch(matchForLeave, user.id)) {
        leaveMutation.mutate(
          { match: matchForLeave, userId: user.id },
          {
            onSuccess: async () => {
              // Gate on a successful local discard for the same reason as
              // exitLocalRun: a failed discard must keep the user on-screen
              // rather than leave a resurrectable buffer row behind.
              if (!(await cancel())) return
              void clearActiveMatchLock(user.id, matchForLeave.id)
              continueExit()
            },
            onError: (e) => {
              const message = e instanceof Error ? e.message : 'ออกจากแมตช์ไม่สำเร็จ'
              if (Platform.OS === 'web') globalThis.alert(message)
              else Alert.alert('ออกจากแมตช์ไม่สำเร็จ', message)
            },
          },
        )
        return
      }

      if (canRequestMutualCancel(matchForLeave, user.id)) {
        requestMutualCancelMutation.mutate(
          { match: matchForLeave, userId: user.id },
          {
            onError: (e) => {
              const message = e instanceof Error ? e.message : 'ขอยกเลิกไม่สำเร็จ'
              if (Platform.OS === 'web') globalThis.alert(message)
              else Alert.alert('ขอยกเลิกไม่สำเร็จ', message)
            },
          },
        )
        return
      }

      const message = 'แมตช์นี้กำลังล็อกอยู่ ต้องส่งผลหรือจบแมตช์ก่อนออกจากหน้านี้'
      if (Platform.OS === 'web') globalThis.alert(message)
      else Alert.alert('ออกจากแมตช์ไม่ได้', message)
    }

    if (matchId) {
      const canLeaveMatchRun = !!matchForLeave && !!user?.id && canLeaveCoopRunMatch(matchForLeave, user.id)
      const message = canLeaveMatchRun
        ? 'ถ้ายืนยัน คุณจะออกจากแมตช์และยกเลิก run ในเครื่องนี้'
        : 'แมตช์เริ่ม/ล็อกแต้มแล้ว ออกทันทีไม่ได้ ถ้าต้องการหยุดให้ส่งคำขอยกเลิกให้อีกฝั่งยืนยัน'
      if (Platform.OS === 'web') {
        if (globalThis.confirm(`ออกจากหน้า match run?\n\n${message}`)) exitMatchRun()
        return
      }

      Alert.alert(
        'ออกจากหน้า match run?',
        message,
        [
          { text: 'อยู่ต่อ', style: 'cancel' },
          {
            text: canLeaveMatchRun ? 'ออกจากแมตช์' : 'ขอยกเลิกแมตช์',
            style: 'destructive',
            onPress: exitMatchRun,
          },
        ],
      )
      return
    }

    if (Platform.OS === 'web') {
      if (globalThis.confirm('ออกจากหน้า map? การออกจากหน้านี้จะถือว่าออกจากการวิ่ง และข้อมูล run ในเครื่องจะถูกยกเลิก')) {
        void exitLocalRun()
      }
      return
    }

    Alert.alert(
      'ออกจากหน้า map?',
      'การออกจากหน้านี้จะถือว่าออกจากการวิ่ง และข้อมูล run ในเครื่องจะถูกยกเลิก',
      [
        { text: 'อยู่ต่อ', style: 'cancel' },
        { text: 'ออกจากการวิ่ง', style: 'destructive', onPress: () => void exitLocalRun() },
      ],
    )
  }, [cancel, isMatchRun, leaveMutation, matchForLeave, matchId, requestMutualCancelMutation, status, track, user?.id])

  usePreventRemove(shouldConfirmMapExit, ({ data }) => {
    confirmExitMap(() => navigation.dispatch(data.action))
  })

  const leaveRunScreen = useCallback(() => {
    if (matchId) {
      guardedRouter.replace(
        { pathname: '/match/new', params: { activity: 'running' } },
        { actionKey: `run-active:${matchId}:exit-running-category` },
      )
      return
    }
    guardedRouter.replace('/(tabs)', { actionKey: 'run-active:fallback-home' })
  }, [matchId])

  const handleExitRunPress = useCallback(() => {
    confirmExitMap(leaveRunScreen)
  }, [confirmExitMap, leaveRunScreen])

  const handleBackPress = useCallback(() => {
    if (!matchId && status === 'idle') {
      leaveRunScreen()
      return
    }
    confirmExitMap(leaveRunScreen)
  }, [confirmExitMap, leaveRunScreen, matchId, status])

  const handleFinishPress = useCallback(() => {
    if (teamRunWouldFinishBelowMinDistance) {
      const message = 'ทีมที่ยังอยู่ต้องมีระยะรวมอย่างน้อย 1 กม. ก่อนส่งผล วิ่งต่ออีกนิดแล้วลองใหม่'
      if (Platform.OS === 'web') globalThis.alert(message)
      else Alert.alert('ยังส่งผลไม่ได้', message)
      return
    }
    if (runWouldFinishBelowSessionMinDistance) {
      const message = 'จบตอนนี้จะส่งผลไม่ได้ และต้องเริ่มใหม่'
      const submitShortRun = () => void stopAndSubmit()
      if (Platform.OS === 'web') {
        if (globalThis.confirm(`ระยะยังไม่ถึง 100 ม.\n\n${message}`)) submitShortRun()
        return
      }
      Alert.alert(
        'ระยะยังไม่ถึง 100 ม.',
        message,
        [
          { text: 'วิ่งต่อ', style: 'cancel' },
          { text: 'จบและเริ่มใหม่', style: 'destructive', onPress: submitShortRun },
        ],
      )
      return
    }
    void stopAndSubmit()
  }, [runWouldFinishBelowSessionMinDistance, stopAndSubmit, teamRunWouldFinishBelowMinDistance])

  const handleStoppedSubmitPress = useCallback(() => {
    if (teamRunWouldFinishBelowMinDistance) {
      const message = 'ทีมที่ยังอยู่ต้องมีระยะรวมอย่างน้อย 1 กม. ก่อนส่งผล'
      if (Platform.OS === 'web') globalThis.alert(message)
      else Alert.alert('ยังส่งผลไม่ได้', message)
      return
    }
    void submit()
  }, [submit, teamRunWouldFinishBelowMinDistance])

  const finishLabel = isSubmitting
    ? 'Saving'
    : routeEventRewardUnlocked
      ? `จบ +${routeEventRewardPoints} pts`
      : 'จบ'
  const finishAccessibilityLabel = routeEventRewardUnlocked
    ? `จบการวิ่งและปลดล็อกรางวัลเส้นทาง ${routeEventRewardPoints} แต้ม`
    : 'จบการวิ่ง'

  const navigateToRunSummary = useCallback((sessionId: string) => {
    reset()
    const localRouteRewardParams =
      isHeartRouteSmokeChallengeId(challengeId) && routeEventRewardUnlocked
        ? {
          routeRewardPoints: String(routeEventRewardPoints),
          routeRewardTitle: routeChallenge?.title ?? 'Route event',
        }
        : {}
    guardedRouter.replace({
      pathname: '/run/summary/[sessionId]',
      params: {
        sessionId,
        ...(matchId ? {} : { moment: '1' }),
        ...(backendChallengeId ? { challengeId: backendChallengeId } : {}),
        ...(matchId ? { matchId } : {}),
        ...localRouteRewardParams,
      },
    }, { actionKey: `run-active:summary:${sessionId}` })
  }, [
    backendChallengeId,
    challengeId,
    matchId,
    reset,
    routeChallenge?.title,
    routeEventRewardPoints,
    routeEventRewardUnlocked,
  ])

  const soloSummarySessionId = !matchId ? submitResult?.activitySessionId ?? null : null
  const handleSoloSummaryPress = useCallback(() => {
    if (!soloSummarySessionId) return
    navigateToRunSummary(soloSummarySessionId)
  }, [navigateToRunSummary, soloSummarySessionId])
  const canOpenHealthSync =
    (status === 'idle' || status === 'stopped') &&
    !isSubmitting &&
    Boolean(matchId || backendChallengeId)
  const openHealthSync = useCallback(() => {
    if (!canOpenHealthSync) return
    guardedRouter.push({
      pathname: '/run/sync',
      params: {
        ...(matchId ? { matchId } : {}),
        ...(backendChallengeId ? { challengeId: backendChallengeId } : {}),
      },
    }, {
      actionKey: matchId
        ? `run-active:${matchId}:health-sync`
        : `run-active:${backendChallengeId}:health-sync`,
    })
  }, [backendChallengeId, canOpenHealthSync, matchId])

  const linkMatchMutation = useSubmitActivity(matchId, user?.id)
  const linkedSessionRef = useRef<string | null>(null)
  useEffect(() => {
    const sessionId = submitResult?.activitySessionId
    if (!sessionId) return

    const goToMatchDetail = () => {
      reset()
      guardedRouter.replace(`/match/${matchId}`, { actionKey: `run-active:match:${matchId}` })
    }

    if (!matchId) {
      track({
        name: 'run_submit_success',
        properties: { mode: runMode, has_match: false, distance_meters: Math.round(submitResult?.serverDistanceMeters ?? 0) },
      })
      queueGuildGoalContribution(sessionId)
      if (backendChallengeId || routeEventRewardUnlocked) {
        navigateToRunSummary(sessionId)
      }
      return
    }

    // Link the verified run session to the match before showing summary.
    // Server (submit_match_activity_atomic) decides winner / tie based on
    // the session and match.is_coop / rule_params; isTie here is a default
    // that the server overrides for sensor-running.
    if (linkedSessionRef.current === sessionId) return
    linkedSessionRef.current = sessionId
    const data = buildRunningSubmissionDataFromSession({
      serverDistanceMeters: submitResult?.serverDistanceMeters,
      serverPaceSecondsPerKm: submitResult?.serverPaceSecondsPerKm,
    })
    linkMatchMutation.mutate(
      {
        matchId,
        activityType: 'running',
        activitySessionId: sessionId,
        // server reads metrics from the linked session — these are required
        // by the edge schema but ignored when activitySessionId is present.
        data,
        isTie: true,
      },
      {
        onSuccess: async (data) => {
          track({
            name: 'run_submit_success',
            properties: { mode: runMode, has_match: true, distance_meters: Math.round(submitResult?.serverDistanceMeters ?? 0) },
          })
          queueGuildGoalContribution(sessionId)
          try {
            await markUploaded(sessionId)
          } catch (error) {
            console.warn('failed to mark match run uploaded', error)
          }
          // Co-op / multi-runner sensor matches return pendingSubmissions until
          // every accepted participant has linked their run. Bounce back to the
          // match detail so the user sees the team status instead of a misleading
          // solo summary; the run summary is still reachable from history.
          const pending = data?.pendingSubmissions
          if (pending && pending.submitted < pending.required) {
            const message =
              `รอเพื่อนวิ่งจบ ${pending.submitted}/${pending.required} — แมตช์จะปิดอัตโนมัติเมื่อทุกคนส่งครบ`
            if (Platform.OS === 'web') {
              globalThis.alert(message)
            } else {
              Alert.alert('ส่งผลแล้ว', message)
            }
            goToMatchDetail()
            return
          }
          navigateToRunSummary(sessionId)
        },
        onError: (err) => {
          const errCode = isEdgeFunctionError(err) ? (err.code ?? null) : extractRunSubmitErrorCode(err)
          const errReason = errCode ?? (isEdgeFunctionError(err) ? 'edge_error' : err instanceof Error ? err.message : 'unknown')
          track({
            name: 'run_submit_failed',
            properties: { mode: runMode, has_match: true, reason: errReason },
          })
          // Terminal rule rejections (coop distance, session-rule, referee
          // matches, …) get their mapped Thai explanation so the runner knows
          // WHY. Retryable/uncoded failures keep the auto-retry copy — the
          // upload pipeline re-links the run on next app open.
          if (errCode && isKnownRunSubmitErrorCode(errCode)) {
            const mapped = getRunSubmitErrorMessage(errCode)
            if (!mapped.retryable) {
              if (Platform.OS === 'web') globalThis.alert(`${mapped.title} ${mapped.detail}`)
              else Alert.alert(mapped.title, mapped.detail)
              goToMatchDetail()
              return
            }
          }
          const message =
            'บันทึก run สำเร็จแล้ว แต่ยังส่งเข้า match ไม่สำเร็จ Rally จะ retry อัตโนมัติเมื่อเปิดแอพอีกครั้ง'
          if (Platform.OS === 'web') globalThis.alert(message)
          else Alert.alert('ยังส่ง match ไม่สำเร็จ', message)
          goToMatchDetail()
        },
      },
    )
    // linkMatchMutation.mutate is stable (TanStack Query v5).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    backendChallengeId,
    submitResult,
    reset,
    matchId,
    markUploaded,
    queueGuildGoalContribution,
    navigateToRunSummary,
    routeEventRewardUnlocked,
    runMode,
    track,
  ])

  return (
    <View style={styles.container}>
      <BatteryOptModal
        visible={batteryPrompt.visible}
        onDismiss={() => void batteryPrompt.dismiss()}
        onRequestNoRestrictions={() => void batteryPrompt.requestNoRestrictions()}
      />
      <StartCountdown
        visible={countdownActive}
        onComplete={handleCountdownComplete}
        onCancel={handleCountdownCancel}
      />
      <SyncedStartCountdown
        visible={showSyncOverlay}
        seconds={syncSecondsRemaining}
        waitingForGps={syncExpired && isSearchingGps}
        palette={runTheme}
      />

      <View style={styles.mapLayer}>
        {showRunMap ? (
          <MapLibreRunView
            path={path}
            liveLocation={latestPoint}
            warmStartLocation={warmStartLocation}
            isLive={status === 'active'}
            lockCameraToUser={Boolean(matchId) && status === 'idle'}
            teammates={teammates}
            teammateRelation={runMode === 'ffa' || runMode === '1v1' ? 'rival' : 'ally'}
            onPressTeammate={handlePressTeammateMarker}
            tone={mapTone}
            preferCockpitDefaultStyle
            showStylePicker={false}
            controlBottomOffset={mapControlBottomOffset}
            styleIdOverride={mapStyleId}
            plannedRoute={plannedRunRoute}
            plannedRouteProgressPath={path}
            plannedRouteToleranceM={routeChallenge?.route_tolerance_m ?? 25}
          />
        ) : (
          <View style={styles.powerSaveBackdrop}>
            <MaterialCommunityIcons name="leaf" size={34} color={RunArenaDarkPalette.trust} />
            <Text style={styles.powerSaveTitle}>โหมดประหยัด</Text>
            <Text style={styles.powerSaveHint}>ระยะ/เวลา/PACE ยังแม่น (GPS จับทุก 6 ม.)</Text>
            <Text style={styles.powerSaveHint}>ซ่อนแมพเพื่อยืดแบตสำหรับวิ่งระยะไกล</Text>
            <Pressable
              style={styles.powerSavePeekButton}
              onPress={() => setPeekMap(true)}
              accessibilityRole="button"
              accessibilityLabel="ดูแผนที่ชั่วคราว"
            >
              <MaterialCommunityIcons name="map-outline" size={16} color={RunArenaDarkPalette.text} />
              <Text style={styles.powerSavePeekText}>ดูแมพ</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View
        style={[styles.topCluster, { paddingTop: safeTopOffset }]}
        onLayout={(event) => setTopClusterHeight(event.nativeEvent.layout.height)}
      >
        {isMatchRun ? (
          <TeamRunActiveHeader
            title={isCoopRun ? 'วิ่งทีม' : 'แข่งวิ่ง'}
            connected={connectionStatus === 'subscribed'}
            teamDistanceLabel={isCoopRun ? teamDistanceLabel : null}
            gpsLabel={showStatusPill ? runPillState.label : gpsChipLabel}
            gpsIcon={gpsChipIcon}
            gpsIconColor={gpsChipIconColor}
            palette={runTheme}
            styles={styles}
            onBack={handleBackPress}
          />
        ) : (
          <View style={styles.topHud}>
            <Pressable
              style={styles.hudButton}
              onPress={handleBackPress}
              accessibilityRole="button"
              accessibilityLabel="ย้อนกลับจากการวิ่ง"
            >
              <MaterialCommunityIcons name="chevron-left" size={26} color={topIconColor} />
            </Pressable>
            <View style={styles.hudTitleWrap} pointerEvents="none">
              <View style={styles.hudKickerRow}>
                {showLiveHudDot && <View style={styles.hudLiveDot} />}
                <Text style={styles.hudKicker} numberOfLines={1}>
                  Rally Run
                </Text>
              </View>
              <Text style={styles.hudTitle} numberOfLines={1}>
                {runHudTitle}
              </Text>
            </View>
            <View style={styles.topHudRight}>
              <View style={[styles.gpsChip, styles.gpsChipQuiet]}>
                <MaterialCommunityIcons
                  name={gpsChipIcon}
                  size={18}
                  color={gpsChipIconColor}
                />
              </View>
              <Pressable
                style={[styles.powerSaveHudButton, powerSaveRequested && styles.powerSaveHudButtonActive]}
                onPress={() => { togglePowerSave(!powerSaveRequested); setPeekMap(false) }}
                accessibilityRole="button"
                accessibilityState={{ selected: powerSaveRequested }}
                accessibilityLabel="โหมดประหยัดแบต เก็บสถิติแม่น ซ่อนแมพ"
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name="leaf"
                  size={17}
                  color={powerSaveRequested ? RunArenaDarkPalette.trust : quietGpsIconColor}
                />
              </Pressable>
            </View>
          </View>
        )}

        {!isMatchRun && showStatusPill && (
          <View style={styles.topStatusRow}>
            <View style={[
              styles.statusPill,
              runPillState.tone === 'live' && styles.statusPillLive,
              runPillState.tone === 'paused' && styles.statusPillAutoPaused,
            ]}>
              <View style={[
                styles.statusDot,
                runPillState.tone === 'ready' && styles.statusDotReady,
                runPillState.tone === 'live' && styles.statusDotLive,
                runPillState.tone === 'paused' && styles.statusDotAmber,
              ]} />
              <Text style={styles.statusText}>{runPillState.label}</Text>
            </View>
          </View>
        )}
      </View>

      {!isMatchRun && (
        <View style={[styles.mapEdgeLayer, { bottom: mapEdgeBottomOffset }]}>
          <MapEdgeStatusChips
            readyLabel={undefined}
            palette={RunArenaPalette}
            styles={styles}
          />
        </View>
      )}

      <View style={[styles.mapStyleControl, { bottom: mapStyleBottomOffset }]} pointerEvents="box-none">
        {mapChoiceMenuOpen && (
          <View style={styles.mapStyleMenu}>
            {RUN_MAP_CHOICES.map((choice) => {
              const active = choice.id === mapChoice
              return (
                <Pressable
                  key={choice.id}
                  style={[styles.mapStyleMenuItem, active && styles.mapStyleMenuItemActive]}
                  onPress={() => handlePickMapChoice(choice.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`ใช้แผนที่ ${choice.label}`}
                >
                  <MaterialCommunityIcons
                    name={choice.icon}
                    size={17}
                    color={active ? RunArenaLightPalette.text : RunArenaLightPalette.textMuted}
                  />
                  <Text style={[
                    styles.mapStyleMenuText,
                    active && styles.mapStyleMenuTextActive,
                  ]}>
                    {choice.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        )}
        {isPowerSaveMode && peekMap && (
          <Pressable
            style={styles.mapLayerButton}
            onPress={() => setPeekMap(false)}
            accessibilityRole="button"
            accessibilityLabel="ซ่อนแผนที่ กลับโหมดประหยัด"
            hitSlop={8}
          >
            <MaterialCommunityIcons name="eye-off-outline" size={22} color={mapLayerIconColor} />
          </Pressable>
        )}
        <Pressable
          style={[styles.mapLayerButton, mapChoiceMenuOpen && styles.mapLayerButtonOpen]}
          onPress={() => setMapChoiceMenuOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: mapChoiceMenuOpen }}
          accessibilityLabel={`เปลี่ยนแผนที่ ตอนนี้ ${activeMapChoice.label}`}
          accessibilityHint="กดเพื่อเปิดตัวเลือกแผนที่"
          hitSlop={8}
        >
          <MaterialCommunityIcons name="layers-outline" size={24} color={mapLayerIconColor} />
        </Pressable>
      </View>

      {!isMatchRun && status !== 'idle' && (
        <Animated.View style={[styles.runPointsHud, pointsHudAnimatedStyle]} pointerEvents="none">
          <MaterialCommunityIcons name="star-four-points-outline" size={15} color={RallyPalette.amber} />
          <View style={styles.runPointsHudValue}>
            <AnimatedNumber
              value={rewardHudPoints}
              duration={560}
              style={styles.runPointsHudNumber}
            />
            <Text style={styles.runPointsHudUnit}>pts</Text>
          </View>
        </Animated.View>
      )}
      {pointGain !== null && pointGain > 0 && (
        <Animated.View style={[styles.runPointsFly, pointsFlyAnimatedStyle]} pointerEvents="none">
          <View style={styles.runPointsFlyCoin} />
          <Text style={styles.runPointsFlyText}>{pointGain}</Text>
        </Animated.View>
      )}

      <View
        style={[
          styles.bottomDock,
          isMatchRun && styles.bottomDockTeam,
          isMatchRun && teamSheetExpanded && styles.bottomDockTeamExpanded,
          { bottom: safeDockBottomOffset },
        ]}
        {...(isMatchRun ? teamSheetPanResponder.panHandlers : {})}
      >
        <View style={styles.dockHandleRow}>
          <View style={styles.dockHandleSide} />
          <View style={styles.dockHandleCluster}>
            <View style={styles.dockHandle} />
            {isMatchRun ? (
              <MaterialCommunityIcons
                name={teamSheetExpanded ? 'chevron-down' : 'chevron-up'}
                size={15}
                color={RunArenaPalette.textMuted}
              />
            ) : null}
          </View>
          <View style={styles.dockHandleSide}>
            {isMatchRun && canOpenHealthSync ? (
              <Pressable
                style={styles.dockIconButton}
                onPress={openHealthSync}
                accessibilityRole="button"
                accessibilityLabel="นำเข้า workout จาก Health"
                hitSlop={8}
              >
                <MaterialCommunityIcons name="watch-import" size={18} color={RunArenaPalette.text} />
              </Pressable>
            ) : null}
          </View>
        </View>
        {isMatchRun && teamSheetExpanded ? (
          <View style={styles.teamStatusSheet}>
            <CrewRosterSheet
              rows={crewRosterRows}
              connected={connectionStatus === 'subscribed'}
              palette={runTheme}
              teamGoal={crewTeamGoal}
            />
          </View>
        ) : null}
        <View style={styles.dockHeroRow}>
          <View style={styles.dockHeroCopy}>
            <Text style={styles.heroLabel}>เวลาวิ่ง</Text>
            <Text style={styles.heroValue} numberOfLines={1}>
              {formatDuration(activeDurationSeconds)}
            </Text>
          </View>
          {status === 'active' && !pauseLimitReached && (
            <Pressable
              style={styles.heroActionButton}
              onPress={pause}
              accessibilityRole="button"
              accessibilityLabel="หยุดพักการวิ่ง"
            >
              <MaterialCommunityIcons name="pause" size={24} color={RunArenaLightPalette.text} />
            </Pressable>
          )}
        </View>

        <View style={styles.secondaryRow}>
          <MetricSecondary
            label="ระยะทาง"
            value={formatDistance(distanceMeters)}
            icon="map-marker-distance"
            palette={metricPalette}
            styles={styles}
          />
          <MetricSecondary
            label="PACE"
            value={formatPace(smoothedPaceSecondsPerKm ?? paceSecondsPerKm)}
            icon="speedometer"
            palette={metricPalette}
            styles={styles}
          />
        </View>

        {routeEventProgressRatio !== null && routeEventRewardPoints > 0 && (
          <View style={[
            styles.routeRewardCard,
            routeEventRewardUnlocked && styles.routeRewardCardComplete,
          ]}>
            <View style={styles.routeRewardRow}>
              <View style={styles.routeRewardLabelRow}>
                <MaterialCommunityIcons
                  name={routeEventRewardUnlocked ? 'gift-open-outline' : 'map-marker-path'}
                  size={15}
                  color={routeEventRewardUnlocked ? RallyPalette.amber : RunArenaPalette.trust}
                />
                <Text style={styles.routeRewardLabel}>
                  {routeEventRewardUnlocked ? 'เส้นทางครบแล้ว' : 'รางวัลเส้นทาง'}
                </Text>
              </View>
              <Text style={styles.routeRewardValue}>
                {routeEventRewardUnlocked
                  ? `+${routeEventRewardPoints} pts`
                  : `${Math.round(routeEventProgressRatio * 100)}%`}
              </Text>
            </View>
            <View style={styles.routeRewardTrack}>
              <View
                style={[
                  styles.routeRewardTrackFill,
                  routeEventRewardUnlocked && styles.routeRewardTrackFillComplete,
                  { width: `${routeEventProgressRatio * 100}%` },
                ]}
              />
            </View>
          </View>
        )}

        {showPermPrompt && (
          <View style={styles.permissionCard}>
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color={RunArenaPalette.warning} />
            <Text style={styles.permHint}>
              {permission === 'denied' && !canAskAgain
                ? 'อนุญาต Location ในการตั้งค่าระบบ แล้วกลับมาที่หน้านี้'
                : 'Rally ต้องใช้ Location เพื่อบันทึกเส้นทางวิ่ง'}
            </Text>
            {permission === 'denied' && !canAskAgain ? (
              <Pressable style={[styles.button, styles.btnPrimary]} onPress={openLocationSettings}>
                <MaterialCommunityIcons name="cog-outline" size={18} color={RunArenaPalette.onPrimary} />
                <Text style={[styles.buttonText, styles.primaryButtonText]}>เปิดการตั้งค่า</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.button, styles.btnPrimary]} onPress={requestPermission}>
                <MaterialCommunityIcons name="map-marker-check-outline" size={18} color={RunArenaPalette.onPrimary} />
                <Text style={[styles.buttonText, styles.primaryButtonText]}>อนุญาต Location</Text>
              </Pressable>
            )}
          </View>
        )}

        {canStart && !isSyncedMatchStart && (
          <Pressable
            style={[styles.button, styles.btnPrimary, startDisabled && styles.buttonDisabled]}
            onPress={handleStartPress}
            disabled={startDisabled}
            accessibilityRole="button"
            accessibilityLabel={startDisabled ? 'รอ GPS ก่อนเริ่มวิ่ง' : 'เริ่มวิ่ง'}
          >
            <MaterialCommunityIcons
              name={isSearchingGps ? 'crosshairs-gps' : startDisabled ? 'account-clock-outline' : 'play'}
              size={20}
              color={RunArenaPalette.onPrimary}
            />
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              {isSearchingGps
                ? 'กำลังจับ GPS...'
                : startDisabled
                  ? (matchForLeave ? `รอทีม ${readyTeamCount}/${expectedTeamCount}` : 'โหลดผู้เล่น...')
                  : 'เริ่มวิ่ง'}
            </Text>
          </Pressable>
        )}

        {canOpenHealthSync && !isMatchRun && (
          <Pressable
            style={[styles.button, styles.btnSecondary]}
            onPress={openHealthSync}
            accessibilityRole="button"
            accessibilityLabel="นำเข้า workout จาก Health สำหรับการวิ่งนี้"
          >
            <MaterialCommunityIcons name="watch-import" size={20} color={RunArenaPalette.text} />
            <Text style={styles.secondaryButtonText}>นำเข้า workout จาก Health</Text>
          </Pressable>
        )}

        {status === 'active' && !pauseLimitReached && (
          <Pressable
            disabled={isSubmitting}
            style={[styles.button, styles.btnPrimary, isSubmitting && styles.buttonDisabled]}
            onPress={handleFinishPress}
            accessibilityRole="button"
            accessibilityLabel={finishAccessibilityLabel}
          >
            <MaterialCommunityIcons name="stop" size={20} color={RunArenaPalette.onPrimary} />
            <Text style={[styles.buttonText, styles.primaryButtonText]}>{finishLabel}</Text>
          </Pressable>
        )}

        {(status === 'active' || status === 'paused') && pauseLimitReached && (
          <View style={styles.controlRow}>
            <Pressable style={[styles.button, styles.btnSecondary, styles.flexButton]} onPress={handleExitRunPress}>
              <MaterialCommunityIcons name="exit-to-app" size={20} color={RunArenaPalette.text} />
              <Text style={styles.secondaryButtonText}>ออก</Text>
            </Pressable>
            <Pressable
              disabled={isSubmitting}
              style={[styles.button, styles.btnPrimary, styles.flexButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleFinishPress}
              accessibilityRole="button"
              accessibilityLabel={finishAccessibilityLabel}
            >
              <MaterialCommunityIcons name="stop" size={20} color={RunArenaPalette.onPrimary} />
              <Text style={[styles.buttonText, styles.primaryButtonText]}>
                {isSubmitting ? 'Saving' : routeEventRewardUnlocked ? `+${routeEventRewardPoints} pts` : 'ส่งผล'}
              </Text>
            </Pressable>
          </View>
        )}

        {status === 'paused' && !pauseLimitReached && (
          <View style={styles.controlRow}>
            <Pressable
              style={[styles.button, styles.btnPrimary, styles.flexButton]}
              onPress={resume}
              accessibilityRole="button"
              accessibilityLabel="วิ่งต่อ"
            >
              <MaterialCommunityIcons name="play" size={20} color={RunArenaPalette.onPrimary} />
              <Text style={[styles.buttonText, styles.primaryButtonText]}>วิ่งต่อ</Text>
            </Pressable>
            <Pressable
              disabled={isSubmitting}
              style={[styles.button, styles.btnPrimarySoft, styles.flexButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleFinishPress}
              accessibilityRole="button"
              accessibilityLabel={finishAccessibilityLabel}
            >
              <MaterialCommunityIcons name="stop" size={20} color={topIconColor} />
              <Text style={styles.primarySoftButtonText}>{finishLabel}</Text>
            </Pressable>
          </View>
        )}

        {status === 'stopped' && !submitResult && !pauseLimitReached && !stoppedRunBlocked && (
          <Pressable
            disabled={isSubmitting}
            style={[styles.button, styles.btnPrimary, isSubmitting && styles.buttonDisabled]}
            onPress={() => void continueRun()}
          >
            <MaterialCommunityIcons name="play" size={20} color={RunArenaPalette.onPrimary} />
            <Text style={[styles.buttonText, styles.primaryButtonText]}>วิ่งต่อ</Text>
          </Pressable>
        )}

        {status === 'stopped' && soloSummarySessionId && (
          <Pressable
            style={[styles.button, styles.btnPrimary]}
            onPress={handleSoloSummaryPress}
            accessibilityRole="button"
            accessibilityLabel="เปิดสรุปผลการวิ่ง"
          >
            <MaterialCommunityIcons name="chart-timeline-variant" size={20} color={RunArenaPalette.onPrimary} />
            <Text style={[styles.buttonText, styles.primaryButtonText]}>สรุปผล</Text>
          </Pressable>
        )}

        {status === 'stopped' && !submitResult && !pauseLimitReached && stoppedRunBlocked && (
          <Pressable style={[styles.button, styles.btnSecondary]} onPress={handleExitRunPress}>
            <MaterialCommunityIcons name="exit-to-app" size={20} color={RunArenaPalette.text} />
            <Text style={styles.secondaryButtonText}>ออกจากการวิ่ง</Text>
          </Pressable>
        )}

        {status === 'stopped' && !submitResult && pauseLimitReached && (
          <View style={styles.controlRow}>
            <Pressable style={[styles.button, styles.btnSecondary, styles.flexButton]} onPress={handleExitRunPress}>
              <MaterialCommunityIcons name="exit-to-app" size={20} color={RunArenaPalette.text} />
              <Text style={styles.secondaryButtonText}>ออก</Text>
            </Pressable>
            <Pressable
              disabled={isSubmitting}
              style={[styles.button, styles.btnPrimary, styles.flexButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleStoppedSubmitPress}
            >
              <MaterialCommunityIcons name="send-check-outline" size={20} color={RunArenaPalette.onPrimary} />
              <Text style={[styles.buttonText, styles.primaryButtonText]}>{isSubmitting ? 'Saving' : 'ส่งผล'}</Text>
            </Pressable>
          </View>
        )}
      </View>

      {activeRunNotice && (
        <View style={[styles.noticeOverlay, { top: noticeTopOffset }]} pointerEvents="box-none">
          {showRunNotice ? (
            <RunNoticeToast
              notice={activeRunNotice}
              palette={RunArenaPalette}
              styles={styles}
              onDismiss={() => setVisibleNoticeId(null)}
              onAction={() => {
                if (activeRunNotice.action?.kind === 'open_settings') {
                  void openLocationSettings()
                }
              }}
            />
          ) : (
            <Pressable
              style={[
                styles.noticeDock,
                activeRunNotice.tone === 'danger' && styles.noticeDockDanger,
              ]}
              onPress={() => setVisibleNoticeId(activeRunNotice.id)}
              accessibilityRole="button"
              accessibilityLabel="ดูการแจ้งเตือนการวิ่ง"
            >
              <MaterialCommunityIcons
                name={activeRunNotice.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={18}
                color={activeRunNotice.tone === 'danger' ? RunArenaPalette.danger : RunArenaPalette.warning}
              />
            </Pressable>
          )}
        </View>
      )}
      {calloutMember ? (
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', top: insets.top + 96, left: 0, right: 0, alignItems: 'center', zIndex: 40 }}
        >
          <Pressable
            onPress={() => handleOpenCalloutProfile(calloutMember.userId)}
            accessibilityRole="button"
            accessibilityLabel={`เปิดโปรไฟล์ ${calloutMember.name}`}
          >
            <CrewMemberCallout member={calloutMember} palette={runTheme} />
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

type MetricCardProps = {
  label: string
  value: string
  icon: keyof typeof MaterialCommunityIcons.glyphMap
}

/** Bright "online" green for the crew connection dot. */
const TEAM_ONLINE_GREEN = '#2fe39a'

// Clock-skew guard rails for the synchronized start: the shared target is
// clamped so every device counts down at least MIN and at most MAX from arrival.
const SYNC_START_MIN_MS = 3_000
const SYNC_START_MAX_MS = 12_000
const SYNC_START_RETRY_MS = 3_000

function TeamRunActiveHeader({
  title,
  connected,
  teamDistanceLabel,
  gpsLabel,
  gpsIcon,
  gpsIconColor,
  palette,
  styles,
  onBack,
}: {
  title: string
  connected: boolean
  teamDistanceLabel: string | null
  gpsLabel: string
  gpsIcon: keyof typeof MaterialCommunityIcons.glyphMap
  gpsIconColor: string
  palette: RunArenaColors
  styles: ActiveRunStyles
  onBack: () => void
}) {
  return (
    <View style={styles.teamActiveHeader}>
      <View style={styles.teamHeaderTopRow}>
        <Pressable
          style={styles.teamHeaderBackButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="ย้อนกลับจากการวิ่ง"
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color={palette.text} />
        </Pressable>
        <View style={styles.teamHeaderTitleBlock}>
          <Text style={styles.teamHeaderTitle} numberOfLines={1}>{title}</Text>
        </View>
        <View style={styles.teamHeaderRightRail}>
          <View
            style={{ width: 11, height: 11, borderRadius: 999, backgroundColor: connected ? TEAM_ONLINE_GREEN : palette.textMuted }}
            accessibilityLabel={connected ? 'เชื่อมต่อแล้ว' : 'หลุดการเชื่อมต่อ'}
          />
        </View>
      </View>
      <View style={styles.teamHeaderChipRow}>
        <TeamHeaderChip
          icon={gpsIcon}
          label={gpsLabel}
          value={null}
          iconColor={gpsIconColor}
          styles={styles}
          tone="quiet"
        />
        {teamDistanceLabel ? (
          <TeamHeaderChip
            icon="map-marker-distance"
            label="รวม"
            value={teamDistanceLabel}
            iconColor={palette.trust}
            styles={styles}
            tone="accent"
          />
        ) : null}
      </View>
    </View>
  )
}

function TeamHeaderChip({
  icon,
  label,
  value,
  iconColor,
  styles,
  tone,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  label: string
  value: string | null
  iconColor: string
  styles: ActiveRunStyles
  tone: 'quiet' | 'accent' | 'plain'
}) {
  return (
    <View style={[
      styles.teamHeaderChip,
      tone === 'accent' && styles.teamHeaderChipAccent,
      tone === 'plain' && styles.teamHeaderChipPlain,
      tone === 'quiet' && styles.teamHeaderChipQuiet,
    ]}>
      <MaterialCommunityIcons name={icon} size={13} color={iconColor} />
      <Text style={styles.teamHeaderChipLabel} numberOfLines={1}>{label}</Text>
      {value ? <Text style={styles.teamHeaderChipValue} numberOfLines={1}>{value}</Text> : null}
    </View>
  )
}

function RunNoticeToast({
  notice,
  palette,
  styles,
  onDismiss,
  onAction,
}: {
  notice: RunNotice
  palette: RunArenaColors
  styles: ActiveRunStyles
  onDismiss: () => void
  onAction: () => void
}) {
  return (
    <View style={[
      styles.noticeToast,
      notice.tone === 'danger' && styles.noticeToastDanger,
    ]}>
      <View style={[
        styles.noticeIconWrap,
        notice.tone === 'danger' && styles.noticeIconDanger,
      ]}>
        <MaterialCommunityIcons
          name={notice.icon as keyof typeof MaterialCommunityIcons.glyphMap}
          size={19}
          color={notice.tone === 'danger' ? palette.danger : palette.warning}
        />
      </View>
      <View style={styles.noticeBody}>
        <View style={styles.noticeTitleRow}>
          <Text style={styles.noticeTitle} numberOfLines={1}>{notice.title}</Text>
          {notice.value && <Text style={styles.noticeValue}>{notice.value}</Text>}
        </View>
        <Text style={styles.noticeDetail} numberOfLines={2}>{notice.detail}</Text>
        {notice.progress !== undefined && (
          <View style={styles.noticeTrack}>
            <View style={[
              styles.noticeTrackFill,
              { width: `${notice.progress * 100}%` },
              notice.tone === 'danger' && styles.noticeTrackFillDanger,
            ]} />
          </View>
        )}
        {notice.action && (
          <Pressable
            style={styles.noticeAction}
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={notice.action.label}
          >
            <Text style={styles.noticeActionText}>{notice.action.label}</Text>
          </Pressable>
        )}
      </View>
      <Pressable
        style={styles.noticeCloseButton}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="ซ่อนการแจ้งเตือนการวิ่ง"
      >
        <MaterialCommunityIcons name="close" size={16} color={palette.textMuted} />
      </Pressable>
    </View>
  )
}

const MetricSecondary = memo(function MetricSecondary({
  label,
  value,
  icon,
  palette,
  styles,
}: MetricCardProps & { palette: RunArenaColors; styles: ActiveRunStyles }) {
  return (
    <View style={styles.secondaryItem}>
      <View style={styles.metricLabelRow}>
        <MaterialCommunityIcons name={icon} size={15} color={palette.primary} />
        <Text style={styles.secondaryLabel}>{label}</Text>
      </View>
      <Text style={styles.secondaryValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  )
})

type MapEdgeStatusChipsProps = {
  readyLabel?: string
  palette: RunArenaColors
  styles: ActiveRunStyles
}

const MapEdgeStatusChips = memo(function MapEdgeStatusChips({
  readyLabel,
  palette,
  styles,
}: MapEdgeStatusChipsProps) {
  if (!readyLabel) return null

  return (
    <View style={styles.mapEdgeChips} pointerEvents="none">
      <MapStatusChip
        icon="account-group-outline"
        label={`${readyLabel} พร้อม`}
        palette={palette}
        styles={styles}
      />
    </View>
  )
})

function MapStatusChip({
  label,
  icon,
  palette,
  styles,
}: {
  label: string
  icon?: keyof typeof MaterialCommunityIcons.glyphMap
  palette: RunArenaColors
  styles: ActiveRunStyles
}) {
  return (
    <View style={styles.mapStatusChip}>
      {icon ? <MaterialCommunityIcons name={icon} size={12} color={palette.text} /> : null}
      <Text style={styles.mapStatusText}>{label}</Text>
    </View>
  )
}

function createStyles(palette: RunArenaColors, mapChoice: RunMapChoice) {
  const RunArenaPalette = palette
  const isDarkMap = mapChoice === 'dark'
  const cockpitSurface = isDarkMap ? '#e6e8e1' : RunArenaLightPalette.surfaceRaised
  const cockpitSurfaceSoft = isDarkMap ? '#f0f1ec' : RunArenaLightPalette.surface
  const cockpitBorder = isDarkMap ? 'rgba(22,22,22,0.15)' : RunArenaLightPalette.primaryLine
  const cockpitHandle = isDarkMap ? 'rgba(22,22,22,0.15)' : RunArenaLightPalette.primaryLine
  const topSurface = isDarkMap ? '#2a2d2a' : cockpitSurface
  const topBorder = isDarkMap ? 'rgba(243,246,238,0.18)' : cockpitBorder
  const topText = isDarkMap ? RunArenaDarkPalette.text : RunArenaLightPalette.text
  const topTextMuted = isDarkMap ? 'rgba(243,246,238,0.72)' : RunArenaLightPalette.textMuted
  const topShadow = isDarkMap ? 'rgba(0,0,0,0.36)' : RunArenaPalette.shadow
  const gpsSurface = isDarkMap ? RunArenaDarkPalette.trustSoft : RunArenaLightPalette.trustSoft
  const gpsBorder = isDarkMap ? `${RunArenaDarkPalette.trust}61` : `${RunArenaLightPalette.trust}3d`
  const dockSurface = isDarkMap ? '#2a2d2a' : cockpitSurface
  const dockSurfaceSoft = isDarkMap ? '#343734' : cockpitSurfaceSoft
  const dockBorder = isDarkMap ? 'rgba(243,246,238,0.18)' : cockpitBorder
  const dockHandle = isDarkMap ? 'rgba(243,246,238,0.28)' : cockpitHandle
  const dockText = isDarkMap ? RunArenaDarkPalette.text : RunArenaLightPalette.text
  const dockTextMuted = isDarkMap ? RunArenaDarkPalette.textMuted : RunArenaLightPalette.textMuted

  return StyleSheet.create({
  container: { flex: 1, backgroundColor: RunArenaPalette.background, position: 'relative' },
  mapLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: RunArenaPalette.background,
  },
  topCluster: {
    paddingHorizontal: 20,
    gap: 6,
    zIndex: 4,
  },
  topHud: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  hudButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: topSurface,
    borderWidth: 1,
    borderColor: topBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: `0 10px 24px ${topShadow}` },
      default: {
        shadowColor: isDarkMap ? '#000000' : RunArenaPalette.ink,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDarkMap ? 0.24 : 0.12,
        shadowRadius: 18,
        elevation: 4,
      },
    }),
  },
  topHudRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  powerSaveHudButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: isDarkMap ? 'rgba(243,246,238,0.1)' : 'rgba(22,22,22,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  powerSaveHudButtonActive: {
    backgroundColor: `${RunArenaLightPalette.trust}33`,
  },
  hudTitleWrap: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: topBorder,
    backgroundColor: topSurface,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 1,
    ...Platform.select({
      web: { boxShadow: `0 10px 24px ${topShadow}` },
      default: {
        shadowColor: isDarkMap ? '#000000' : RunArenaPalette.ink,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDarkMap ? 0.22 : 0.11,
        shadowRadius: 18,
        elevation: 4,
      },
    }),
  },
  hudKickerRow: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hudLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: RunArenaPalette.trust,
    opacity: 0.78,
  },
  hudKicker: {
    color: topTextMuted,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  hudTitle: {
    color: topText,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: 0,
  },
  gpsChip: {
    minWidth: 76,
    minHeight: 48,
    paddingHorizontal: 11,
    borderRadius: 16,
    backgroundColor: gpsSurface,
    borderWidth: 1,
    borderColor: gpsBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...Platform.select({
      web: { boxShadow: `0 10px 24px ${topShadow}` },
      default: {
        shadowColor: isDarkMap ? '#000000' : RunArenaPalette.ink,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDarkMap ? 0.18 : 0.1,
        shadowRadius: 18,
        elevation: 3,
      },
    }),
  },
  gpsChipQuiet: {
    width: 48,
    minWidth: 48,
    paddingHorizontal: 0,
    backgroundColor: topSurface,
    borderColor: topBorder,
  },
  topStatusRow: {
    minHeight: 34,
    paddingLeft: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
  },
  statusPill: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: topSurface,
    borderWidth: 1,
    borderColor: topBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusPillReady: { borderColor: topBorder, backgroundColor: topSurface },
  statusPillLive: { borderColor: gpsBorder, backgroundColor: gpsSurface },
  statusPillAutoPaused: {
    borderColor: RunArenaPalette.warning,
    backgroundColor: RunArenaPalette.warningSoft,
  },
  statusPillStopped: { borderColor: topBorder, backgroundColor: topSurface },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: RunArenaPalette.textMuted },
  statusDotReady: { backgroundColor: RunArenaPalette.primary },
  statusDotLive: { backgroundColor: RunArenaPalette.trust },
  statusDotAmber: { backgroundColor: RunArenaPalette.warning },
  statusText: { color: topText, fontSize: 12, fontWeight: '800' },
  teamActiveHeader: {
    gap: 8,
  },
  teamHeaderTopRow: {
    minHeight: 66,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: topBorder,
    backgroundColor: topSurface,
    paddingLeft: 8,
    paddingRight: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...Platform.select({
      web: { boxShadow: `0 10px 24px ${topShadow}` },
      default: {
        shadowColor: isDarkMap ? '#000000' : RunArenaPalette.ink,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDarkMap ? 0.2 : 0.1,
        shadowRadius: 18,
        elevation: 4,
      },
    }),
  },
  teamHeaderBackButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: isDarkMap ? 'rgba(255,255,255,0.08)' : 'rgba(22,22,22,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamHeaderTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  teamHeaderTitle: {
    color: topText,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: 0,
  },
  teamHeaderRightRail: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  teamReadyPill: {
    minHeight: 25,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: topBorder,
    backgroundColor: cockpitSurfaceSoft,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  teamReadyText: {
    color: RunArenaLightPalette.text,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  teamCodePill: {
    maxWidth: 108,
    minHeight: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(22,22,22,0.05)',
    backgroundColor: isDarkMap ? 'rgba(255,255,255,0.08)' : 'rgba(247,248,243,0.58)',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  teamCodeText: {
    color: RunArenaLightPalette.textMuted,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    fontVariant: ['tabular-nums'],
  },
  teamHeaderChipRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamHeaderChip: {
    flex: 1,
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(22,22,22,0.08)',
    backgroundColor: topSurface,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  teamHeaderChipAccent: {
    flex: 1.25,
    backgroundColor: RunArenaLightPalette.primary,
    borderColor: 'rgba(22,22,22,0.1)',
  },
  teamHeaderChipPlain: {
    flex: 1.1,
    backgroundColor: topSurface,
  },
  teamHeaderChipQuiet: {
    flex: 0.58,
    paddingHorizontal: 7,
  },
  teamHeaderChipLabel: {
    color: RunArenaLightPalette.text,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
  },
  teamHeaderChipValue: {
    color: RunArenaLightPalette.text,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  crewHud: {
    marginLeft: 56,
    marginRight: 0,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: topBorder,
    backgroundColor: topSurface,
    gap: 7,
    ...Platform.select({
      web: { boxShadow: `0 10px 24px ${topShadow}` },
      default: {
        shadowColor: isDarkMap ? '#000000' : RunArenaPalette.ink,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDarkMap ? 0.18 : 0.09,
        shadowRadius: 18,
        elevation: 3,
      },
    }),
  },
  crewHudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  crewHudDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  crewHudTitle: {
    flex: 1,
    color: topText,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  crewHudSeen: {
    color: topTextMuted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  crewHudStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  crewHudMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  crewHudStatus: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  crewHudPrivacy: {
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: isDarkMap ? 'rgba(255,255,255,0.08)' : `${RunArenaLightPalette.trust}1a`,
    color: topTextMuted,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
  },
  crewHudStat: {
    flexGrow: 1,
    flexBasis: 70,
    minHeight: 25,
    paddingHorizontal: 7,
    borderRadius: 999,
    backgroundColor: isDarkMap ? 'rgba(255,255,255,0.08)' : 'rgba(22,22,22,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  crewHudStatLabel: {
    color: topTextMuted,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
  },
  crewHudStatValue: {
    color: topText,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  mapStyleControl: {
    position: 'absolute',
    right: 12,
    alignItems: 'flex-end',
    gap: 4,
    zIndex: 5,
  },
  mapLayerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLayerButtonOpen: {
    opacity: 0.72,
  },
  powerSaveBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0d1411',
  },
  powerSaveTitle: {
    color: RunArenaDarkPalette.text,
    fontSize: 18,
    fontWeight: '800',
  },
  powerSaveHint: {
    color: RunArenaDarkPalette.textMuted,
    fontSize: 13,
  },
  powerSavePeekButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(243,246,238,0.2)',
  },
  powerSavePeekText: {
    color: RunArenaDarkPalette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  mapStyleMenu: {
    minWidth: 132,
    padding: 6,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: cockpitBorder,
    backgroundColor: cockpitSurface,
    gap: 5,
    ...Platform.select({
      web: { boxShadow: `0 14px 32px ${RunArenaPalette.shadow}` },
      default: {
        shadowColor: RunArenaPalette.ink,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.16,
        shadowRadius: 20,
        elevation: 6,
      },
    }),
  },
  mapStyleMenuItem: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: cockpitSurfaceSoft,
    borderWidth: 1,
    borderColor: cockpitBorder,
  },
  mapStyleMenuItemActive: {
    backgroundColor: RunArenaLightPalette.primary,
    borderColor: RunArenaLightPalette.text,
  },
  mapStyleMenuText: {
    color: RunArenaLightPalette.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  mapStyleMenuTextActive: {
    color: RunArenaLightPalette.text,
  },
  runPointsHud: {
    position: 'absolute',
    top: 122,
    right: 20,
    minWidth: 82,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(22,22,22,0.08)',
    backgroundColor: cockpitSurface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 4,
    ...Platform.select({
      web: { boxShadow: `0 12px 28px ${RunArenaPalette.shadow}` },
      default: {
        shadowColor: RunArenaPalette.ink,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 7,
      },
    }),
  },
  runPointsHudValue: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  runPointsHudNumber: {
    color: RunArenaLightPalette.text,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  runPointsHudUnit: {
    color: RunArenaLightPalette.text,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '900',
  },
  runPointsFly: {
    position: 'absolute',
    top: 126,
    right: 26,
    minWidth: 48,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(234,195,26,0.72)',
    backgroundColor: RallyPalette.brown,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    zIndex: 5,
  },
  runPointsFlyCoin: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: RallyPalette.amber,
  },
  runPointsFlyText: {
    color: RallyPalette.amber,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  mapEdgeLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  mapEdgeChips: {
    marginHorizontal: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  mapStatusChip: {
    minHeight: 26,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: RunArenaPalette.surfaceRaised,
    borderWidth: 1,
    borderColor: RunArenaPalette.primaryLine,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  mapStatusText: {
    color: RunArenaPalette.text,
    fontSize: 11,
    fontWeight: '800',
  },
  bottomDock: {
    position: 'absolute',
    left: 18,
    right: 18,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: dockBorder,
    backgroundColor: dockSurface,
    gap: 10,
    ...Platform.select({
      web: { boxShadow: `0 18px 42px ${RunArenaPalette.shadow}` },
      default: {
        shadowColor: RunArenaPalette.ink,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.14,
        shadowRadius: 28,
        elevation: 8,
      },
    }),
  },
  bottomDockTeam: {
    gap: 8,
  },
  bottomDockTeamExpanded: {
    paddingTop: 9,
  },
  dockHandleRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dockHandleSide: {
    width: 44,
    minHeight: 24,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  dockHandleCluster: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dockHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: dockHandle,
  },
  dockIconButton: {
    width: 34,
    height: 34,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: dockBorder,
    backgroundColor: dockSurfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamStatusSheet: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dockBorder,
    backgroundColor: dockSurfaceSoft,
    gap: 10,
  },
  teamStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  teamStatusTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  teamStatusTitle: {
    color: dockText,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
  },
  teamStatusMeta: {
    marginTop: 2,
    color: dockTextMuted,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '800',
  },
  teamStatusDistancePill: {
    minWidth: 82,
    minHeight: 38,
    borderRadius: 15,
    backgroundColor: RunArenaLightPalette.primary,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamStatusDistanceValue: {
    color: RunArenaLightPalette.text,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  teamStatusDistanceLabel: {
    color: RunArenaLightPalette.text,
    opacity: 0.72,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
  },
  teamStatusStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dockHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  dockHeroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroLabel: {
    color: dockTextMuted,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
  },
  heroValue: {
    color: dockText,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  heroActionButton: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: RunArenaPalette.primary,
    borderWidth: 1,
    borderColor: cockpitBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStartButton: {
    minWidth: 92,
    height: 54,
    borderRadius: 16,
    backgroundColor: RunArenaPalette.primary,
    borderWidth: 1,
    borderColor: RunArenaPalette.primaryLine,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 14,
  },
  heroStartButtonText: {
    color: RunArenaPalette.onPrimary,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 10,
  },
  secondaryItem: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: dockSurfaceSoft,
    borderWidth: 1,
    borderColor: dockBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  secondaryLabel: { color: dockTextMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  secondaryValue: {
    color: dockText,
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  metricLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  routeRewardCard: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: dockSurfaceSoft,
    borderWidth: 1,
    borderColor: dockBorder,
    gap: 7,
  },
  routeRewardCardComplete: {
    backgroundColor: 'rgba(234,195,26,0.2)',
    borderColor: 'rgba(234,195,26,0.38)',
  },
  routeRewardRow: {
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  routeRewardLabelRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeRewardLabel: {
    color: dockText,
    fontSize: 12,
    fontWeight: '900',
  },
  routeRewardValue: {
    color: RallyPalette.amber,
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  routeRewardTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: RunArenaPalette.primarySoft,
    overflow: 'hidden',
  },
  routeRewardTrackFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: RunArenaPalette.trust,
  },
  routeRewardTrackFillComplete: {
    backgroundColor: RallyPalette.amber,
  },
  controlRow: { flexDirection: 'row', gap: 10 },
  flexButton: { flex: 1 },
  button: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnPrimary: {
    backgroundColor: RunArenaPalette.primary,
    borderWidth: 1,
    borderColor: RunArenaPalette.primary,
  },
  btnPrimarySoft: {
    backgroundColor: isDarkMap ? 'rgba(217,255,79,0.22)' : 'rgba(217,255,79,0.55)',
    borderWidth: 1.5,
    borderColor: isDarkMap ? 'rgba(217,255,79,0.5)' : 'rgba(92,108,62,0.55)',
  },
  btnSecondary: {
    backgroundColor: RunArenaPalette.surface,
    borderWidth: 1,
    borderColor: RunArenaPalette.primaryLine,
  },
  btnDanger: {
    backgroundColor: RunArenaPalette.danger,
    borderWidth: 1,
    borderColor: RunArenaPalette.danger,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: RunArenaPalette.onDanger, fontSize: 16, fontWeight: '900' },
  primaryButtonText: { color: RunArenaPalette.onPrimary },
  primarySoftButtonText: {
    color: isDarkMap ? RunArenaDarkPalette.text : RunArenaLightPalette.text,
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryButtonText: { color: RunArenaPalette.text, fontSize: 16, fontWeight: '900' },
  noticeOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'stretch',
  },
  noticeToast: {
    minHeight: 68,
    padding: 12,
    borderRadius: 18,
    backgroundColor: RunArenaPalette.surfaceSoft,
    borderWidth: 1,
    borderColor: RunArenaPalette.warning,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noticeToastDanger: {
    backgroundColor: RunArenaPalette.dangerSoft,
    borderColor: RunArenaPalette.danger,
  },
  noticeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: RunArenaPalette.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeIconDanger: { backgroundColor: RunArenaPalette.dangerSoft },
  noticeBody: { flex: 1, minWidth: 0 },
  noticeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noticeTitle: { flex: 1, color: RunArenaPalette.text, fontSize: 14, fontWeight: '900' },
  noticeValue: {
    color: RunArenaPalette.warning,
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  noticeDetail: {
    marginTop: 2,
    color: RunArenaPalette.textMuted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  noticeTrack: {
    marginTop: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: RunArenaPalette.primarySoft,
    overflow: 'hidden',
  },
  noticeTrackFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: RunArenaPalette.warning,
  },
  noticeTrackFillDanger: { backgroundColor: RunArenaPalette.danger },
  noticeAction: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: RunArenaPalette.danger,
  },
  noticeActionText: {
    color: RunArenaPalette.onDanger,
    fontSize: 12,
    fontWeight: '800',
  },
  noticeCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeDock: {
    alignSelf: 'flex-end',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: RunArenaPalette.surfaceRaised,
    borderWidth: 1,
    borderColor: RunArenaPalette.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeDockDanger: { borderColor: RunArenaPalette.danger },
  permissionCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: dockSurfaceSoft,
    borderWidth: 1,
    borderColor: dockBorder,
    gap: 12,
  },
  permHint: { color: dockText, fontSize: 13, fontWeight: '700', lineHeight: 19 },
  })
}
