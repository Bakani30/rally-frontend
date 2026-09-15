import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { Stack, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo } from 'react'
import { ActivityIndicator, InteractionManager, StyleSheet, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import 'react-native-reanimated'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFonts, Orbitron_800ExtraBold, Orbitron_900Black } from '@expo-google-fonts/orbitron'
import { Prompt_600SemiBold, Prompt_700Bold } from '@expo-google-fonts/prompt'
import {
  IBMPlexSansThai_400Regular,
  IBMPlexSansThai_500Medium,
} from '@expo-google-fonts/ibm-plex-sans-thai'

import { useSportTheme, useThemeMode } from '@/hooks/useAppTheme'
import { useReactQueryAppState } from '@/hooks/useReactQueryAppState'
import { useAuthSession } from '@/hooks/useAuthSession'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useDeviceRegistration } from '@/hooks/useDeviceRegistration'
import { usePushRegistration } from '@/hooks/usePushRegistration'
import { useRunSessionRetryQueue } from '@/hooks/useRunSessionRetryQueue'
import { useHealthAutoSyncBootstrap } from '@/hooks/useHealthAutoSyncBootstrap'
import { useActiveMatchResume } from '@/hooks/useActiveMatchResume'
import { useIncomingFriendRequestAlerts } from '@/hooks/useIncomingFriendRequestAlerts'
import { useIncomingMatchInviteAlerts } from '@/hooks/useIncomingMatchInviteAlerts'
import { useIncomingRefereeAssignmentAlerts } from '@/hooks/useIncomingRefereeAssignmentAlerts'
import { useMatchEntryStore } from '@/stores/matchEntryStore'
import { useRallyCoinEntryStore } from '@/stores/rallyCoinEntryStore'
import { useThemeStore } from '@/stores/themeStore'
import { useLanguageStore } from '@/stores/languageStore'
import { RallyDynamicIsland } from '@/components/notifications/RallyDynamicIsland'
import { PromotionMomentGate } from '@/components/ranks/PromotionMomentGate'
import { notificationProvider } from '@/lib/notifications/notificationProvider'
import { initAnalytics } from '@/lib/analytics/client'
import { ensureBackgroundLocationTaskRegistered } from '@/lib/run-tracking/gps/backgroundLocationTask'
import { toMatchEntryParams } from '@/lib/match/matchEntry'
import { toRallyCoinEntryRoute } from '@/lib/rally-coin/rallyCoinEntry'
import { setTileFailoverObserver } from '@/lib/maps/mapLibreConfig'
import { analytics } from '@/lib/analytics/analytics-service'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { RallyPalette } from '@/constants/theme'

declare const __DEV__: boolean

// Root render-error fallback for expo-router (graceful retry, not a white screen).
export { AppErrorBoundary as ErrorBoundary } from '@/components/system/AppErrorBoundary'

// expo-task-manager requires defineTask at module load, before any
// startLocationUpdatesAsync call. Side-effect import keeps that contract.
ensureBackgroundLocationTaskRegistered()

setTileFailoverObserver((event) => {
  analytics.track({
    name: 'tile_provider_failover',
    properties: {
      from_provider: event.fromProvider,
      to_provider: event.toProvider,
      reason: event.reason,
    },
  })
})

const queryClient = new QueryClient()

function AuthGate() {
  const { session, isLoading, mustReRegister, setMustReRegister } = useAuth()
  const segments = useSegments()
  const profileQuery = useProfile(session?.user?.id)
  const { data: profile, isLoading: profileLoading } = profileQuery
  const consumePendingEntry = useMatchEntryStore((state) => state.consumePendingEntry)
  const consumePendingCoinEntry = useRallyCoinEntryStore((state) => state.consumePendingEntry)
  const needsUsername = !!session && !!profile && profile.username_set_at === null
  // New-signup onboarding wizard gate. Checked BEFORE needsUsername: the
  // wizard's step 1 handles the username claim itself, so OAuth users must
  // never be double-asked via set-username. Existing users are backfilled
  // non-null by migration 20260711120000.
  const needsOnboarding = !!session && !!profile && profile.onboarding_completed_at === null
  useIncomingMatchInviteAlerts(session?.user?.id)
  useIncomingFriendRequestAlerts(session?.user?.id)
  useIncomingRefereeAssignmentAlerts(session?.user?.id)
  useHealthAutoSyncBootstrap({
    userId: session?.user?.id,
    enabled: !isLoading && !!session && !!profile && !needsUsername && !needsOnboarding,
  })

  useEffect(() => {
    if (isLoading || (!!session && profileLoading)) return
    const segmentList = segments as string[]
    const inAuthGroup = segmentList[0] === '(auth)'
    const isPublicEntryRoute = segmentList[0] === 'join' || segmentList[0] === 'coin'
    const isDevPreviewRoute = __DEV__ && segmentList[0] === 'dev' && segmentList[1] === 'arena-session-preview'
    const isDevArenaMatchPreviewRoute = __DEV__ && segmentList[0] === 'dev' && segmentList[1] === 'arena-match-preview'
    const isPasswordRecoveryRoute = inAuthGroup && segmentList[1] === 'reset-password'
    const isSignUpRoute = inAuthGroup && segmentList[1] === 'sign-up'
    const isSetUsernameRoute = inAuthGroup && segmentList[1] === 'set-username'
    const isOnboardingRoute = segmentList[0] === 'onboarding'

    if (!session && mustReRegister) {
      if (isSignUpRoute) {
        setMustReRegister(false)
      } else {
        guardedRouter.replace(
          { pathname: '/(auth)/sign-up', params: { accountDeleted: '1' } },
          { actionKey: 'auth:re-register' },
        )
      }
    } else if (!session && !inAuthGroup && !isPublicEntryRoute && !isDevPreviewRoute && !isDevArenaMatchPreviewRoute) {
      guardedRouter.replace('/(auth)/sign-in', { actionKey: 'auth:sign-in' })
    } else if (session && needsOnboarding && !isOnboardingRoute && !isPasswordRecoveryRoute) {
      // No reverse redirect out of /onboarding: the wizard exits itself via
      // the celebration CTA after useCompleteOnboarding flips the flag in cache.
      guardedRouter.replace('/onboarding', { actionKey: 'auth:onboarding' })
    } else if (session && needsUsername && !isSetUsernameRoute && !isOnboardingRoute) {
      // !isOnboardingRoute: the wizard's step 1 owns username during
      // onboarding — without it, new signups (needsUsername + needsOnboarding
      // both true) bounce onboarding <-> set-username.
      guardedRouter.replace('/(auth)/set-username', { actionKey: 'auth:set-username' })
    } else if (session && inAuthGroup && !isPasswordRecoveryRoute && !needsUsername && !needsOnboarding) {
      const pendingCoinEntry = consumePendingCoinEntry()
      if (pendingCoinEntry) {
        guardedRouter.replace(toRallyCoinEntryRoute(pendingCoinEntry), { actionKey: 'auth:coin-entry' })
        return
      }
      const pendingEntry = consumePendingEntry()
      guardedRouter.replace(
        pendingEntry
          ? { pathname: '/(tabs)', params: toMatchEntryParams(pendingEntry) }
          : '/(tabs)',
        { actionKey: 'auth:home-entry' },
      )
    }
  }, [consumePendingCoinEntry, consumePendingEntry, session, isLoading, profileLoading, segments, needsUsername, needsOnboarding, mustReRegister, setMustReRegister])

  // Keep this after the auth redirect effect so a restored session's
  // "go home" redirect cannot win over the active match lock.
  useActiveMatchResume({
    userId: session?.user?.id,
    enabled: !isLoading && !!session && !needsUsername && !needsOnboarding,
  })

  const inAuthGroup = (segments as string[])[0] === '(auth)'
  const isPublicEntryRoute = segments[0] === 'join' || segments[0] === 'coin'
  const isDevPreviewRoute = __DEV__ && (segments as string[])[0] === 'dev' && (segments as string[])[1] === 'arena-session-preview'
  const isDevArenaMatchPreviewRoute = __DEV__ && (segments as string[])[0] === 'dev' && (segments as string[])[1] === 'arena-match-preview'
  const isPasswordRecoveryRoute = inAuthGroup && segments[1] === 'reset-password'
  const isSetUsernameRoute = inAuthGroup && segments[1] === 'set-username'
  const isOnboardingRoute = segments[0] === 'onboarding'
  const shouldRedirectToAuth = !session && !inAuthGroup && !isPublicEntryRoute && !isDevPreviewRoute && !isDevArenaMatchPreviewRoute
  const shouldRedirectToOnboarding = !!session && needsOnboarding && !isOnboardingRoute && !isPasswordRecoveryRoute
  const shouldRedirectToUsername = !!session && needsUsername && !isSetUsernameRoute && !isOnboardingRoute
  const shouldRedirectToHome = !!session && inAuthGroup && !isPasswordRecoveryRoute && !needsUsername && !needsOnboarding
  const shouldBlockContent =
    isLoading ||
    (!!session && profileLoading) ||
    (!session && mustReRegister && segments[1] !== 'sign-up') ||
    shouldRedirectToAuth ||
    shouldRedirectToOnboarding ||
    shouldRedirectToUsername ||
    shouldRedirectToHome

  if (!shouldBlockContent) return null
  return (
    <View style={[StyleSheet.absoluteFillObject, styles.authLoadingOverlay]}>
      <ActivityIndicator color={RallyPalette.orange} />
    </View>
  )
}

const styles = StyleSheet.create({
  authLoadingOverlay: {
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
})

function RunSessionRetryQueueGate() {
  useRunSessionRetryQueue()
  return null
}

export default function RootLayout() {
  const theme = useSportTheme()
  const themeMode = useThemeMode()
  const hydrateTheme = useThemeStore((state) => state.hydrate)
  const hydrateLanguage = useLanguageStore((state) => state.hydrate)
  useAuthSession()
  useReactQueryAppState()
  usePushRegistration()
  useDeviceRegistration()
  // Orbitron powers the cyberpunk title-frame cosmetic. Prompt (Thai headings)
  // and IBM Plex Thai (Thai body) back the bilingual typography system. Loaded
  // non-blocking: the app renders immediately and text falls back to a system
  // font until each family is ready, so font loading can never stall cold start.
  useFonts({
    Orbitron_800ExtraBold,
    Orbitron_900Black,
    Prompt_600SemiBold,
    Prompt_700Bold,
    IBMPlexSansThai_400Regular,
    IBMPlexSansThai_500Medium,
  })

  const navTheme = useMemo(() => {
    const baseTheme = themeMode === 'dark' ? DarkTheme : DefaultTheme
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        background: theme.bg,
        card: theme.bgElevated,
        text: theme.ink,
        border: theme.line,
        primary: theme.red,
        notification: theme.red,
      },
    }
  }, [theme, themeMode])

  useEffect(() => {
    void hydrateTheme()
  }, [hydrateTheme])

  useEffect(() => {
    void hydrateLanguage()
  }, [hydrateLanguage])

  // Defer non-critical init until after the first interaction settles —
  // measurably faster cold start than setTimeout(0). InteractionManager
  // waits for touch handlers + animations + Stack screen mount to finish,
  // so PostHog boot work does not fight initial paint.
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      void initAnalytics()
      void notificationProvider.configureForegroundBehavior()
    })
    return () => handle.cancel?.()
  }, [])

  useEffect(() => {
    let cleanup: (() => void) | undefined
    let mounted = true

    void notificationProvider.attachTapHandler().then((unsubscribe) => {
      if (!mounted) {
        unsubscribe()
        return
      }
      cleanup = unsubscribe
    })

    return () => {
      mounted = false
      cleanup?.()
    }
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <RunSessionRetryQueueGate />
        <ThemeProvider value={navTheme}>
          <PromotionMomentGate />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.bg },
              headerTintColor: theme.ink,
              headerTitleStyle: { fontWeight: '700' },
              headerShadowVisible: false,
              headerBackButtonMenuEnabled: false,
              contentStyle: { backgroundColor: theme.bg },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen
              name="onboarding"
              options={{ headerShown: false, gestureEnabled: false, animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="dev/arena-session-preview" options={{ headerShown: false }} />
            <Stack.Screen name="dev/arena-match-preview" options={{ headerShown: false }} />
            <Stack.Screen name="coin/[publicCode]" options={{ headerShown: false }} dangerouslySingular />
            <Stack.Screen name="join" options={{ headerShown: false }} dangerouslySingular />
            <Stack.Screen name="auth/callback" options={{ headerShown: false }} dangerouslySingular />
            <Stack.Screen name="overlay-action" options={{ headerShown: false }} dangerouslySingular />
            <Stack.Screen name="match/[id]" options={{ title: 'Match' }} dangerouslySingular />
            <Stack.Screen name="arena-result/[matchId]" options={{ headerShown: false }} dangerouslySingular />
            <Stack.Screen name="user/[id]" options={{ headerShown: false }} dangerouslySingular />
            <Stack.Screen name="user/edit-username" options={{ title: 'เปลี่ยนชื่อผู้ใช้', presentation: 'modal' }} />
            <Stack.Screen name="user/report" options={{ title: 'รายงานผู้ใช้', presentation: 'modal' }} />
            <Stack.Screen name="account/delete" options={{ title: 'ลบบัญชี', presentation: 'modal' }} />
            <Stack.Screen name="activity/[id]" options={{ headerShown: false }} />
            <Stack.Screen
              name="activity/coach-report/[id]"
              options={{
                headerShown: false,
                contentStyle: { backgroundColor: RallyPalette.brown },
              }}
            />
            <Stack.Screen name="activity/new" options={{ title: 'บันทึกกิจกรรม', presentation: 'modal' }} />
            <Stack.Screen name="users/search" options={{ headerShown: false }} />
            <Stack.Screen name="friends" options={{ headerShown: false }} dangerouslySingular />
            <Stack.Screen name="lobbies" options={{ headerShown: false }} dangerouslySingular />
            <Stack.Screen name="notifications" options={{ headerShown: false }} dangerouslySingular />
            <Stack.Screen name="profile" options={{ headerShown: false }} dangerouslySingular />
            <Stack.Screen name="quests" options={{ headerShown: false }} dangerouslySingular />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="support" options={{ title: 'Contact Support', presentation: 'modal' }} />
            <Stack.Screen name="campaigns/index" options={{ headerShown: false }} dangerouslySingular />
            <Stack.Screen name="campaigns/[slug]" options={{ headerShown: false }} />
            <Stack.Screen name="challenges/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="challenges/map/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="match/[id]/submit" options={{ title: 'Submit Result', presentation: 'modal' }} dangerouslySingular />
            <Stack.Screen name="match/[id]/vote" options={{ title: 'Community Vote', presentation: 'modal' }} dangerouslySingular />
            <Stack.Screen name="match/new" options={{ headerShown: false }} dangerouslySingular />
            {/* Pushed screens that draw their own in-content back button (ScreenBackButton). */}
            <Stack.Screen name="arena/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="arenas/index" options={{ headerShown: false }} />
            <Stack.Screen name="map-quest/index" options={{ headerShown: false }} />
            <Stack.Screen name="cosmetics/index" options={{ headerShown: false }} />
            <Stack.Screen name="referee/index" options={{ headerShown: false }} />
            <Stack.Screen name="referee/apply" options={{ headerShown: false }} />
            <Stack.Screen name="referee/profile" options={{ headerShown: false }} />
            <Stack.Screen name="wallet" options={{ headerShown: false }} />
            <Stack.Screen name="gifts/redemptions" options={{ headerShown: false }} />
            <Stack.Screen name="user/[id]/matches" options={{ headerShown: false }} />
            <Stack.Screen name="leaderboard/index" options={{ headerShown: false }} dangerouslySingular />
            <Stack.Screen
              name="run"
              options={{ headerShown: false, animation: 'slide_from_bottom', gestureEnabled: false }}
            />
          </Stack>
          <AuthGate />
          <RallyDynamicIsland />
          <StatusBar hidden />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
