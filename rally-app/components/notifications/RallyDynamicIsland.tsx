import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AppState,
  Animated,
  Easing,
  Image,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSegments } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme, useThemeMode } from '@/hooks/useAppTheme'
import { useAcceptFriendRequest } from '@/hooks/useFriends'
import { useRallyIslandCapabilities } from '@/hooks/useRallyIslandCapabilities'
import {
  cancelAndroidSystemSurface,
  showAndroidSystemSurface,
} from '@/lib/overlay/androidOverlayBridge'
import {
  endIosLiveActivity,
  startOrUpdateIosLiveActivity,
} from '@/lib/overlay/iosLiveActivityBridge'
import {
  createOverlayActionUrl,
  nativeUrlToRoute,
  selectRallyIslandHost,
  toAndroidOverlaySurface,
  type RallyIslandAction,
  type RallyIslandSurface,
} from '@/lib/overlay/rallyIslandSurface'
import {
  computeElapsedDurationSeconds,
  computeLivePaceSecondsPerKm,
  formatDistance,
  formatDuration,
} from '@/lib/run-tracking/session/runSessionFormat'
import { formatPace } from '@/lib/run-tracking/gps/paceSmoothing'
import { acceptInviteAndOpenMatch } from '@/lib/notifications/inviteAcceptNavigation'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { getRunSessionService } from '@/lib/run-tracking/session/runSessionServiceFactory'
import { useRunSessionStore } from '@/lib/run-tracking/session/runSessionStore'
import { useNotificationBannerStore } from '@/stores/notificationBannerStore'

const DISPLAY_MS = 10_000
const COLLAPSE_MS = 2_800

// Lock-screen run surface, gated per platform because the two sides ship the
// redesign separately. Both were parked together on 2026-07-13 (the visuals
// were not ready), but only the iOS card has been rebuilt so far.
//
// iOS: un-parked — the ActivityKit widget now implements
// docs/design/2026-07-21-run-live-activity-redesign.md (distance hero, three
// states, brand lockup, Dynamic Island).
const LIVE_RUN_IOS_SURFACE_ENABLED = true
// Android: still parked — the spec's ongoing-notification and overlay-island
// layouts are not built yet, so enabling this would put the old, unstyled
// surface back on the lock screen. Flip once that work lands.
const LIVE_RUN_ANDROID_SURFACE_ENABLED = false

const ACTIVITY_ICON: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  running: 'run-fast',
  basketball: 'basketball',
  badminton: 'badminton',
  match: 'trophy-award',
}

const ACTIVITY_LABEL: Record<string, string> = {
  running: 'Running',
  basketball: 'Basketball',
  badminton: 'Badminton',
  match: 'Match',
}

export function RallyDynamicIsland() {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const segments = useSegments()
  const theme = useSportTheme()
  const mode = useThemeMode()
  const styles = useMemo(() => createStyles(theme, mode === 'light'), [mode, theme])
  const banner = useNotificationBannerStore((state) => state.current)
  const requestedExpandedBannerId = useNotificationBannerStore((state) => state.requestedExpandedBannerId)
  const expandedBannerMode = useNotificationBannerStore((state) => state.expandedBannerMode)
  const dismissBanner = useNotificationBannerStore((state) => state.dismissBanner)
  const consumeExpandedRequest = useNotificationBannerStore((state) => state.consumeExpandedRequest)
  const queuedBannerCount = useNotificationBannerStore((state) => state.queue.length)
  const pruneExpiredBanners = useNotificationBannerStore((state) => state.pruneExpired)
  const acceptFriendRequest = useAcceptFriendRequest()
  const runStatus = useRunSessionStore((state) => state.status)
  const sessionId = useRunSessionStore((state) => state.sessionId)
  const startedAt = useRunSessionStore((state) => state.startedAt)
  const endedAt = useRunSessionStore((state) => state.endedAt)
  const distanceMeters = useRunSessionStore((state) => state.distanceMeters)
  const avgHeartRate = useRunSessionStore((state) => state.avgHeartRate)
  const isAutoPaused = useRunSessionStore((state) => state.isAutoPaused)
  const [surfaceNowMs, setSurfaceNowMs] = useState(Date.now())
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const {
    systemLiveActivityAvailable,
    systemNotificationAvailable,
    systemSurfaceInteractionAvailable,
    androidSystemSurfaceCapabilityTier,
    androidOverlayPermissionGranted,
    notificationPermissionGranted,
    refresh: refreshSystemCapabilities,
  } = useRallyIslandCapabilities()
  const translateY = useRef(new Animated.Value(-120)).current
  const translateX = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.88)).current
  const [appState, setAppState] = useState(AppState.currentState)

  const segmentList = segments as string[]
  const isRunActiveScreen = segmentList[0] === 'run' && segmentList[1] === 'active'

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppState(state)
    })
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (banner || (runStatus !== 'active' && runStatus !== 'paused')) return undefined
    const interval = setInterval(() => setSurfaceNowMs(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [banner, runStatus])

  useEffect(() => {
    if (!banner?.expiresAt && queuedBannerCount === 0) return undefined
    const interval = setInterval(() => pruneExpiredBanners(), 1000)
    return () => clearInterval(interval)
  }, [banner?.expiresAt, pruneExpiredBanners, queuedBannerCount])

  const surface = useMemo<RallyIslandSurface | null>(() => {
    if (banner) {
      const isMatchInvite = banner.kind === 'match_invited'
      const activityType = banner.activityType ?? 'match'
      const activityLabel = describeActivity(activityType)
      const iconName = isMatchInvite
        ? ACTIVITY_ICON[activityType] ?? ACTIVITY_ICON.match
        : 'account-plus'
      const accentColor = isMatchInvite ? theme.orange : theme.green
      const matchId = banner.matchId ?? null
      const inviteId = banner.inviteId ?? null
      const actorName = banner.actorName ?? banner.body
      const title = banner.headline ?? actorName
      const body = banner.subtitle ?? banner.title
      const compactTitle = compactNameFromTitle(title)

      if (isMatchInvite) {
        return {
          key: banner.id,
          surfaceType: 'match_invite',
          presentation: 'compact',
          eyebrow: 'MATCH INVITE',
          title,
          headline: title,
          actorName,
          subtitle: body,
          body,
          compactTitle,
          compactBody: '',
          expandedTitle: title,
          expandedSubtitle: body,
          accentColor,
          iconName,
          activityType,
          avatarUrl: banner.avatarUrl ?? null,
          route: '/notifications',
          statusLabel: 'PENDING CONSENT',
          primaryMetric: { label: 'MODE', value: activityLabel },
          secondaryMetric: { label: 'ACTION', value: 'Accept or decline' },
          autoDismissMs: DISPLAY_MS,
          primaryAction: {
            type: 'accept_invite',
            label: 'Accept',
            style: 'primary',
            route: '/notifications',
            matchId,
            inviteId,
          },
          secondaryAction: {
            type: 'decline_invite',
            label: 'Decline',
            style: 'destructive',
            route: '/notifications',
            matchId,
            inviteId,
          },
          accessibilityLabel: `${body}. ${title}`,
        }
      }

      return {
        key: banner.id,
        surfaceType: 'friend_request',
        presentation: 'compact',
        eyebrow: 'FRIEND REQUEST',
        title,
        headline: title,
        actorName,
        subtitle: body,
        body,
        compactTitle,
        compactBody: '',
        expandedTitle: title,
        expandedSubtitle: body,
        accentColor,
        iconName,
        activityType: null,
        avatarUrl: banner.avatarUrl ?? null,
        route: banner.route,
        statusLabel: 'SOCIAL',
          primaryMetric: { label: 'REQUEST', value: 'Pending' },
          secondaryMetric: { label: 'FROM', value: banner.activityType ?? 'Rally' },
          autoDismissMs: DISPLAY_MS,
          primaryAction: {
            type: 'accept_friend_request',
            label: 'Accept',
            style: 'primary',
            route: banner.route,
            requesterId: banner.requesterId ?? null,
          },
          secondaryAction: {
            type: 'dismiss_friend_request',
            label: 'Dismiss',
            style: 'secondary',
          },
          accessibilityLabel: `${body}. ${title}`,
        }
    }

    // Built even while the run screen itself is visible: ActivityKit only
    // allows STARTING a Live Activity from the foreground, and the runner is
    // on /run/active when they lock the phone — gating on the screen meant
    // the lock-screen surface never existed. The screen gate now applies only
    // to the React fallback render below (avoids duplicating the run UI).
    const hasRunSurface =
      sessionId !== null &&
      (runStatus === 'active' || runStatus === 'paused' || runStatus === 'stopped')
    if (!hasRunSurface) return null

    const elapsedDurationSeconds = computeElapsedDurationSeconds({
      startedAt,
      endedAt,
      nowMs: surfaceNowMs,
    })
    const runPaused = runStatus === 'paused' || isAutoPaused
    const runStopped = runStatus === 'stopped'
    const eyebrow = runStopped ? 'READY TO SAVE' : runPaused ? (isAutoPaused ? 'AUTO PAUSE' : 'PAUSED') : 'LIVE RUN'
    const durationLabel = formatDuration(elapsedDurationSeconds)
    const signalLabel = avgHeartRate ? `${avgHeartRate} bpm` : 'GPS lock'
    const distanceLabel = formatDistance(distanceMeters)

    // Structured fields for the redesigned lock-screen card / Dynamic Island.
    // formatDistance returns "8.34 km"; the card renders the unit separately so
    // the number can carry the display voice on its own.
    const [distanceValue, distanceUnit] = distanceLabel.split(' ')
    // Paused freezes pace rather than showing a decaying average.
    // Match the run HUD: pace must exclude the pause-ledger union (manual,
    // auto, and vehicle pauses), otherwise a pause/resume makes the lock-screen
    // pace look slower even though the runner's moving pace did not change.
    const pauseBudgetUsedSeconds = getRunSessionService().pauseBudgetUsedSeconds(surfaceNowMs)
    const activeDurationSeconds = Math.max(0, elapsedDurationSeconds - pauseBudgetUsedSeconds)
    const paceSecondsPerKm = computeLivePaceSecondsPerKm(distanceMeters, activeDurationSeconds)
    const paceLabel = runPaused ? '-- /km' : formatPace(paceSecondsPerKm)

    return {
      // Stable per-session key: ActivityKit keys activities on surfaceId, so
      // folding status into the key spawned a NEW activity on every
      // pause/resume flip and orphaned the previous one on the lock screen.
      key: `run-${sessionId}`,
      surfaceType: 'live_run',
      presentation: 'expanded',
      eyebrow,
      title: distanceLabel,
      body: `${durationLabel} · ${signalLabel}`,
      compactTitle: distanceLabel,
      compactBody: durationLabel,
      expandedTitle: distanceLabel,
      expandedSubtitle: signalLabel,
      accentColor: runStopped ? theme.red : runPaused ? theme.blue : theme.orange,
      iconName: runStopped ? 'send-check-outline' : runPaused ? 'pause' : 'run-fast',
      // The ActivityKit widget's avatar circle shows initials of actorName and
      // falls back to the title (the distance string → "1K") when absent.
      actorName: 'Rally Run',
      avatarUrl: null,
      route: '/run/active',
      statusLabel: eyebrow,
      primaryMetric: { label: 'TIME', value: durationLabel },
      secondaryMetric: {
        label: runStopped ? 'AVG PACE' : 'PACE',
        value: paceLabel,
      },
      runState: runStopped ? 'finished' : runPaused ? 'paused' : 'active',
      distanceValue,
      distanceUnit,
      // Free run: no target distance exists anywhere in the run session yet, so
      // this row carries a real secondary metric instead of an empty bar. Set
      // progressFraction/progressLabel here once goal or event routes land.
      contextLabel: signalLabel,
      progressLabel: null,
      progressFraction: null,
      // Run controls. Current binaries hardcode a single Open button for
      // live_run and ignore these payloads; binaries built after the native
      // pause/end support render them as lock-screen buttons.
      primaryAction: runStopped
        ? { type: 'open', label: 'Open run', style: 'primary', route: '/run/active' }
        : runPaused
          ? { type: 'resume_run', label: 'Resume', style: 'primary', route: '/run/active' }
          : { type: 'pause_run', label: 'Pause', style: 'primary', route: '/run/active' },
      secondaryAction: runStopped
        ? null
        : { type: 'end_run', label: 'End', style: 'destructive', route: '/run/active' },
      accessibilityLabel: `${eyebrow}. ${distanceLabel}. ${durationLabel}, ${signalLabel}`,
    }
  }, [
    avgHeartRate,
    banner,
    distanceMeters,
    endedAt,
    isAutoPaused,
    runStatus,
    sessionId,
    startedAt,
    surfaceNowMs,
    theme.blue,
    theme.green,
    theme.orange,
    theme.red,
  ])

  // Live-run system surface lifecycle — keyed on the run STORE, not on
  // `surface` (a transient banner temporarily replaces the surface and must
  // not tear down the lock-screen activity). When the session ends (saved or
  // discarded) or changes, close the previous activity on both platforms;
  // nothing else ever ends a live_run activity, so skipping this strands a
  // stale widget on the lock screen indefinitely.
  const liveRunSurfaceKey =
    sessionId !== null &&
    (runStatus === 'active' || runStatus === 'paused' || runStatus === 'stopped')
      ? `run-${sessionId}`
      : null
  const previousLiveRunKeyRef = useRef<string | null>(null)
  useEffect(() => {
    const previousKey = previousLiveRunKeyRef.current
    if (previousKey && previousKey !== liveRunSurfaceKey) {
      if (Platform.OS === 'ios') {
        void endIosLiveActivity(previousKey).catch(() => undefined)
      }
      void cancelAndroidSystemSurface(previousKey).catch(() => undefined)
    }
    previousLiveRunKeyRef.current = liveRunSurfaceKey
  }, [liveRunSurfaceKey])

  const surfaceKey = surface?.key
  const surfaceType = surface?.surfaceType
  const isPinnedExpanded =
    banner !== null &&
    surfaceKey !== undefined &&
    expandedBannerMode === 'pinned' &&
    banner.id === surfaceKey
  const isExpanded = surfaceKey !== undefined && expandedKey === surfaceKey
  const isVisuallyExpanded = isExpanded || isPinnedExpanded
  const shouldForceReactExpanded =
    banner !== null &&
    surfaceKey !== undefined &&
    (requestedExpandedBannerId === surfaceKey || isVisuallyExpanded)
  // With system surfaces denied, live_run resolves to the react fallback
  // (in-app island) in the foreground and to no surface in the background.
  // Only live_run is gated; every other surface keeps its existing hosts.
  const isLiveRun = surfaceType === 'live_run'
  const allowLiveActivity = !isLiveRun || LIVE_RUN_IOS_SURFACE_ENABLED
  const allowSystemNotification = !isLiveRun || LIVE_RUN_ANDROID_SURFACE_ENABLED
  const islandHost = selectRallyIslandHost({
    hasSurface: surface !== null,
    surfaceType,
    appState,
    platform: Platform.OS,
    systemLiveActivityAvailable: systemLiveActivityAvailable && allowLiveActivity,
    systemNotificationAvailable: systemNotificationAvailable && allowSystemNotification,
    systemSurfaceInteractionAvailable,
    androidSystemSurfaceCapabilityTier,
    androidOverlayPermissionGranted,
    notificationPermissionGranted,
  })
  const effectiveIslandHost = shouldForceReactExpanded ? 'react_fallback' : islandHost

  useEffect(() => {
    if (!surface) return undefined
    if (
      (effectiveIslandHost === 'system_notification' || effectiveIslandHost === 'system_capsule_app_expand') &&
      Platform.OS === 'android'
    ) {
      void showAndroidSystemSurface(toAndroidOverlaySurface(surface)).catch(() => {
        void refreshSystemCapabilities()
      })
    }
    if (effectiveIslandHost === 'system_live_activity' && Platform.OS === 'ios') {
      void startOrUpdateIosLiveActivity(surface).catch(() => {
        void refreshSystemCapabilities()
      })
    }
    return undefined
  }, [
    appState,
    effectiveIslandHost,
    refreshSystemCapabilities,
    surface,
  ])

  const handleActionPress = useCallback((action: RallyIslandAction) => {
    if (!surface) return
    if (action.type === 'pause_run' || action.type === 'resume_run' || action.type === 'end_run') {
      const service = getRunSessionService()
      if (action.type === 'pause_run') service.pause()
      else if (action.type === 'resume_run') service.resume()
      else void service.stop().catch((error) => console.warn('Failed to end run from Rally Island', error))
      return
    }
    if (action.type === 'dismiss' || action.type === 'dismiss_friend_request') {
      if (surface.surfaceType !== 'live_run') dismissBanner(surface.key)
      void cancelAndroidSystemSurface(surface.key).catch(() => undefined)
      return
    }
    if (action.type === 'accept_friend_request') {
      if (surface.surfaceType !== 'live_run') dismissBanner(surface.key)
      void cancelAndroidSystemSurface(surface.key).catch(() => undefined)
      const requesterId = action.requesterId ?? null
      if (!requesterId) {
        guardedRouter.push('/friends', { actionKey: 'island:friends' })
        return
      }
      void acceptFriendRequest.mutateAsync(requesterId).catch((error) => {
        console.warn('Failed to accept friend request from Rally Island', error)
        guardedRouter.push('/friends', { actionKey: 'island:friends-error' })
      })
      return
    }

    if (surface.surfaceType !== 'live_run') dismissBanner(surface.key)
    void cancelAndroidSystemSurface(surface.key).catch(() => undefined)
    if (action.type === 'accept_invite' && action.matchId) {
      void acceptInviteAndOpenMatch({
        matchId: action.matchId,
        inviteId: action.inviteId,
        stake: action.stake,
      })
      return
    }
    const actionUrl = action.url ?? createOverlayActionUrl(action, surface)
    const targetRoute = actionUrl
      ? nativeUrlToRoute(actionUrl)
      : action.route ?? surface.route
    const isOverlayAction = targetRoute.startsWith('/overlay-action')
    if (isOverlayAction) {
      guardedRouter.replace(targetRoute as never, { actionKey: `island-action:${surface.key}` })
      return
    }
    guardedRouter.push(targetRoute as never, { actionKey: `island-route:${surface.key}` })
  }, [acceptFriendRequest, dismissBanner, surface])

  const handleSurfacePress = useCallback(() => {
    if (!surface) return
    if (!isVisuallyExpanded) {
      setExpandedKey(surface.key)
      return
    }
    if (surface.primaryAction?.type === 'open') {
      handleActionPress(surface.primaryAction)
      return
    }
    guardedRouter.push(surface.route as never, { actionKey: `island-surface:${surface.key}` })
  }, [handleActionPress, isVisuallyExpanded, surface])

  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        surfaceType !== 'live_run' &&
        ((Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy)) ||
          (gesture.dy < -12 && Math.abs(gesture.dy) > Math.abs(gesture.dx))),
      onPanResponderMove: (_event, gesture) => {
        if (surfaceType === 'live_run') return
        if (gesture.dy < -12 && Math.abs(gesture.dy) > Math.abs(gesture.dx)) {
          translateY.setValue(Math.min(0, gesture.dy))
          return
        }
        translateX.setValue(gesture.dx)
      },
      onPanResponderRelease: (_event, gesture) => {
        if (surfaceType === 'live_run' || !surface) return
        const shouldDismissUp = gesture.dy < -56 || gesture.vy < -0.7
        const shouldDismissSide = Math.abs(gesture.dx) > 76 || Math.abs(gesture.vx) > 0.8
        const shouldDismiss = shouldDismissUp || shouldDismissSide
        if (!shouldDismiss) {
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              damping: 20,
              stiffness: 240,
              useNativeDriver: true,
            }),
            Animated.spring(translateY, {
              toValue: 0,
              damping: 20,
              stiffness: 240,
              useNativeDriver: true,
            }),
          ]).start()
          return
        }

        const direction = gesture.dx >= 0 ? 1 : -1
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: shouldDismissUp ? 0 : direction * width,
            duration: 150,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: shouldDismissUp ? -120 : 0,
            duration: 150,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 110,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(() => {
          dismissBanner(surface.key)
          translateX.setValue(0)
          translateY.setValue(-120)
        })
      },
      onPanResponderTerminate: () => {
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            damping: 20,
            stiffness: 240,
            useNativeDriver: true,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            damping: 20,
            stiffness: 240,
            useNativeDriver: true,
          }),
        ]).start()
      },
    }),
    [dismissBanner, opacity, surface, surfaceType, translateX, translateY, width],
  )

  useEffect(() => {
    if (!surfaceKey) {
      setExpandedKey(null)
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -120,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 110,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.88,
          duration: 130,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start()
      return undefined
    }

    translateX.setValue(0)
    setExpandedKey(isPinnedExpanded ? surfaceKey : null)
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 20,
        stiffness: 280,
        mass: 0.68,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 16,
        stiffness: 300,
        mass: 0.62,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start()

    if (isPinnedExpanded) return undefined

    const dismissTimeout = setTimeout(() => dismissBanner(surfaceKey), DISPLAY_MS)
    return () => {
      clearTimeout(dismissTimeout)
    }
  }, [dismissBanner, isPinnedExpanded, opacity, scale, surfaceKey, surfaceType, translateX, translateY])

  useEffect(() => {
    if (!surfaceKey || expandedKey !== surfaceKey || isPinnedExpanded) return undefined
    const collapseTimeout = setTimeout(() => {
      setExpandedKey((current) => (current === surfaceKey ? null : current))
    }, COLLAPSE_MS)
    return () => clearTimeout(collapseTimeout)
  }, [expandedKey, isPinnedExpanded, surfaceKey])

  useEffect(() => {
    if (!surfaceKey || requestedExpandedBannerId !== surfaceKey) return
    setExpandedKey(surfaceKey)
    consumeExpandedRequest(surfaceKey)
  }, [consumeExpandedRequest, requestedExpandedBannerId, surfaceKey])

  if (!surface) return null
  if (effectiveIslandHost !== 'react_fallback') return null
  // The run screen already shows all of these stats — the in-app fallback
  // pill would just duplicate it. System surfaces (Live Activity /
  // notification) are unaffected; they are driven by the effect above.
  if (surface.surfaceType === 'live_run' && isRunActiveScreen) return null

  const shellWidth = Math.min(
    width - (Spacing.lg * 2),
    isVisuallyExpanded ? 364 : surface.surfaceType === 'live_run' ? 164 : 156,
  )
  const iconName = surface.iconName as keyof typeof MaterialCommunityIcons.glyphMap
  const compactTitle = surface.compactTitle ?? surface.title
  const avatarInitials = getInitials(compactTitle)

  return (
    <View pointerEvents="box-none" style={[styles.portal, { paddingTop: Math.max(insets.top, 8) + Spacing.xs }]}>
      <Animated.View
        style={[
          styles.animatedWrap,
          { width: shellWidth },
          {
            opacity,
            transform: [{ translateY }, { translateX }, { scale }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View
          accessibilityRole="button"
          accessibilityLabel={surface.accessibilityLabel}
          style={[
            styles.island,
            isVisuallyExpanded ? styles.expandedIsland : styles.compactIsland,
            { borderColor: isVisuallyExpanded ? surface.accentColor : 'rgba(255,255,255,0.12)' },
          ]}
        >
          {isVisuallyExpanded ? <View style={[styles.accentRail, { backgroundColor: surface.accentColor }]} /> : null}

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={surface.accessibilityLabel}
            hitSlop={isVisuallyExpanded ? undefined : { top: 8, bottom: 10, left: 14, right: 14 }}
            onPress={handleSurfacePress}
            scaleTo={0.985}
            style={isVisuallyExpanded ? styles.primaryPressAreaExpanded : styles.primaryPressAreaCompact}
          >
            <View style={[
              styles.avatarWrap,
              isVisuallyExpanded ? styles.avatarWrapExpanded : styles.avatarWrapCompact,
              { backgroundColor: surface.accentColor },
            ]}>
              {surface.avatarUrl ? (
                <Image source={{ uri: surface.avatarUrl }} style={isVisuallyExpanded ? styles.avatarExpanded : styles.avatarCompact} />
              ) : (
                <Text style={styles.avatarInitials}>{avatarInitials}</Text>
              )}
            </View>
            <View style={isVisuallyExpanded ? styles.textWrapExpanded : styles.textWrapCompact}>
              {isVisuallyExpanded ? (
                <View style={styles.eyebrowRow}>
                  <View style={[styles.liveDot, { backgroundColor: surface.accentColor }]} />
                  <Text style={[styles.eyebrow, { color: surface.accentColor }]} numberOfLines={1}>
                    {surface.eyebrow}
                  </Text>
                </View>
              ) : null}
              <Text
                style={[styles.title, !isVisuallyExpanded && styles.titleCompact]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                {isVisuallyExpanded ? surface.expandedTitle ?? surface.title : compactTitle}
              </Text>
              {isVisuallyExpanded ? (
                <Text style={styles.body} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.84}>
                  {surface.expandedSubtitle ?? surface.body}
                </Text>
              ) : null}
            </View>
            <View style={[
              styles.statusCapsule,
              !isVisuallyExpanded && styles.statusCapsuleCompact,
              { borderColor: surface.accentColor },
            ]}>
              <MaterialCommunityIcons name={iconName} size={isVisuallyExpanded ? 18 : 17} color={surface.accentColor} />
            </View>
          </PressableScale>

          {isVisuallyExpanded ? (
            <View style={styles.expandedPanel}>
              <View style={styles.metricsRow}>
                {surface.primaryMetric ? (
                  <MetricPill metric={surface.primaryMetric} accentColor={surface.accentColor} styles={styles} />
                ) : null}
                {surface.secondaryMetric ? (
                  <MetricPill metric={surface.secondaryMetric} accentColor={surface.accentColor} styles={styles} />
                ) : null}
                {surface.statusLabel ? (
                  <View style={styles.statusPill}>
                    <Text style={[styles.metricLabel, { color: surface.accentColor }]}>STATUS</Text>
                    <Text style={styles.metricValue} numberOfLines={1}>{surface.statusLabel}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.actionsRow}>
                {surface.secondaryAction ? (
                  <ActionButton
                    action={surface.secondaryAction}
                    accentColor={surface.accentColor}
                    styles={styles}
                    onPress={handleActionPress}
                  />
                ) : null}
                {surface.primaryAction ? (
                  <ActionButton
                    action={surface.primaryAction}
                    accentColor={surface.accentColor}
                    styles={styles}
                    onPress={handleActionPress}
                  />
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </View>
  )
}

function MetricPill({
  metric,
  accentColor,
  styles,
}: {
  metric: NonNullable<RallyIslandSurface['primaryMetric']>
  accentColor: string
  styles: ReturnType<typeof createStyles>
}) {
  return (
    <View style={styles.metricPill}>
      <Text style={[styles.metricLabel, { color: accentColor }]}>{metric.label}</Text>
      <Text style={styles.metricValue} numberOfLines={1}>{metric.value}</Text>
    </View>
  )
}

function ActionButton({
  action,
  accentColor,
  styles,
  onPress,
}: {
  action: RallyIslandAction
  accentColor: string
  styles: ReturnType<typeof createStyles>
  onPress: (action: RallyIslandAction) => void
}) {
  const destructive = action.style === 'destructive'
  const primary = action.style === 'primary'
  const iconColor = primary ? '#161616' : destructive ? '#c73f41' : '#ffffff'
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPress={() => onPress(action)}
      scaleTo={0.96}
      style={[
        styles.actionButton,
        primary && { backgroundColor: accentColor, borderColor: accentColor },
        destructive && styles.actionButtonDestructive,
      ]}
    >
      <MaterialCommunityIcons
        name={actionIconName(action.type)}
        size={17}
        color={iconColor}
      />
      <Text style={[
        styles.actionText,
        primary && styles.actionTextPrimary,
        destructive && styles.actionTextDestructive,
      ]}>
        {action.label}
      </Text>
    </PressableScale>
  )
}

function actionIconName(actionType: RallyIslandAction['type']): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (actionType) {
    case 'accept_friend_request':
      return 'check-circle-outline'
    case 'accept_invite':
      return 'check-bold'
    case 'expand_in_app':
      return 'arrow-expand'
    case 'decline_invite':
    case 'dismiss':
    case 'dismiss_friend_request':
      return 'close'
    case 'open':
    default:
      return 'arrow-expand'
  }
}

function describeActivity(activityType: string): string {
  return ACTIVITY_LABEL[activityType] ?? 'Match'
}

function compactNameFromTitle(title: string): string {
  return title
    .replace(/\s+(invited|added|challenged|sent|wants)\b.*$/i, '')
    .trim() || title
}

function getInitials(value: string): string {
  const parts = value
    .replace(/[^a-z0-9 ]/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return 'RY'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function createStyles(theme: SportPalette, isLightMode: boolean) {
  const islandBg = isLightMode ? theme.ink : theme.arcadePanel
  const islandSurface = isLightMode ? 'rgba(209,224,221,0.18)' : theme.surfaceStrong
  const islandLine = isLightMode ? 'rgba(209,224,221,0.26)' : theme.lineStrong
  const bodyColor = isLightMode ? theme.bgElevated : theme.inkSoft

  return StyleSheet.create({
    portal: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1100,
      elevation: 1100,
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
    },
    animatedWrap: {
      maxWidth: '100%',
    },
    island: {
      borderRadius: 34,
      backgroundColor: islandBg,
      borderWidth: 1,
      overflow: 'hidden',
      shadowColor: theme.ink,
      shadowOpacity: 0.28,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 13 },
      elevation: 12,
    },
    compactIsland: {
      minHeight: 44,
      borderRadius: Radius.pill,
    },
    expandedIsland: {
      minHeight: 156,
      borderRadius: 30,
    },
    primaryPressAreaExpanded: {
      minHeight: 68,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    primaryPressAreaCompact: {
      minHeight: 44,
      paddingHorizontal: 8,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    accentRail: {
      position: 'absolute',
      left: Spacing.lg,
      right: Spacing.lg,
      bottom: 7,
      height: 3,
      borderRadius: Radius.pill,
      opacity: 0.52,
    },
    avatarWrap: {
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.26)',
      overflow: 'hidden',
    },
    avatarWrapExpanded: {
      width: 48,
      height: 48,
      marginTop: Spacing.xs,
    },
    avatarWrapCompact: {
      width: 32,
      height: 32,
    },
    avatarExpanded: {
      width: 48,
      height: 48,
    },
    avatarCompact: {
      width: 32,
      height: 32,
    },
    avatarInitials: {
      color: theme.ink,
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 0,
    },
    textWrapExpanded: {
      flex: 1,
      minWidth: 0,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xs,
    },
    textWrapCompact: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
    },
    eyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginBottom: 1,
    },
    liveDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    eyebrow: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0,
    },
    title: {
      color: theme.chalk,
      fontSize: 19,
      fontWeight: '900',
      letterSpacing: 0,
    },
    titleCompact: {
      fontSize: 15,
      lineHeight: 18,
    },
    body: {
      color: bodyColor,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0,
      marginTop: 1,
    },
    statusCapsule: {
      width: 42,
      height: 42,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: islandSurface,
      borderWidth: 1,
      marginTop: Spacing.xs,
    },
    statusCapsuleCompact: {
      width: 30,
      height: 30,
      marginTop: 0,
    },
    expandedPanel: {
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
      gap: Spacing.sm,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
    },
    metricPill: {
      minHeight: 44,
      flex: 1,
      borderRadius: Radius.pill,
      backgroundColor: islandSurface,
      borderWidth: 1,
      borderColor: islandLine,
      paddingHorizontal: Spacing.sm,
      justifyContent: 'center',
    },
    statusPill: {
      minHeight: 44,
      flex: 1,
      borderRadius: Radius.pill,
      backgroundColor: islandSurface,
      borderWidth: 1,
      borderColor: islandLine,
      paddingHorizontal: Spacing.sm,
      justifyContent: 'center',
    },
    metricLabel: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0,
    },
    metricValue: {
      color: theme.chalk,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0,
      marginTop: 1,
    },
    actionsRow: {
      minHeight: 44,
      flexDirection: 'row',
      gap: Spacing.sm,
      paddingBottom: Spacing.xs,
    },
    actionButton: {
      minHeight: 44,
      flex: 1,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: islandLine,
      backgroundColor: islandSurface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.md,
    },
    actionButtonDestructive: {
      borderColor: 'rgba(199,63,65,0.72)',
      backgroundColor: 'rgba(199,63,65,0.16)',
    },
    actionText: {
      color: theme.chalk,
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 0,
    },
    actionTextPrimary: {
      color: theme.ink,
    },
    actionTextDestructive: {
      color: theme.red,
    },
  })
}
