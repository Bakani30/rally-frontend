import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import { Animated, ImageBackground, RefreshControl, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import homeHeroDark from '@/assets/images/home/figma-new-home-hero-dark.png'
import homeHeroLight from '@/assets/images/home/figma-new-home-hero-light.png'

import { HomeArenaHero, type HomeArenaHeroSlide } from '@/components/home/HomeArenaHero'
import { HomeDailyQuests } from '@/components/home/HomeDailyQuests'
import { HomeIdentityHeader } from '@/components/home/HomeIdentityHeader'
import { HomeOtaUpdateBanner } from '@/components/home/HomeOtaUpdateBanner'
import { HomeScoreVaultCard } from '@/components/home/HomeScoreVaultCard'
import { HomeShortcutRail } from '@/components/home/HomeShortcutRail'
import { Reveal } from '@/components/motion/Reveal'
import { Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme, useThemeMode } from '@/hooks/useAppTheme'
import type { QuestTemplateView } from '@/lib/quest-proof/questProofTypes'

const TOP_ACTION_FADE_DISTANCE = 86
// Home is immersive now that the system status bar is hidden. Keep controls
// below the hardware safe area but recover the former status-bar spacing.
const HEADER_TOP_OFFSET = Spacing.sm
const HEADER_TO_CARD_CLEARANCE = 58
const CONTENT_SURFACE_TOP_LIGHT = 279
const CONTENT_SURFACE_TOP_DARK = 283
// The native iOS control usually waits for a long pull. Start the existing
// refresh action earlier so the shortcut rail never travels far enough to
// look detached from its white surface.
const SHORT_PULL_REFRESH_OFFSET = -28
const PULL_COMPENSATION_LIMIT = -2000

export type HomeViewProps = {
  refreshing: boolean
  onRefresh: () => void | Promise<void>
  wallet: Omit<ComponentProps<typeof HomeScoreVaultCard>, 'onOpenWallet' | 'displayName' | 'rallyId'>
  onOpenWallet: () => void
  heroSlides: HomeArenaHeroSlide[]
  onPressHeroSlide: NonNullable<ComponentProps<typeof HomeArenaHero>['onPressSlide']>
  onPressShortcut: ComponentProps<typeof HomeShortcutRail>['onPress']
  quests: Omit<ComponentProps<typeof HomeDailyQuests>, 'onSelectQuest' | 'onOpenQuests'>
  onSelectQuest: (quest: QuestTemplateView) => void
  onOpenQuests: () => void
  identity: Omit<ComponentProps<typeof HomeIdentityHeader>, 'onPressNotifications' | 'onPressProfile'>
  onPressNotifications: () => void
  onPressProfile: () => void
  otaUpdate: Omit<ComponentProps<typeof HomeOtaUpdateBanner>, 'onApply'> | null
  onApplyOtaUpdate: () => void
}

/**
 * Presentation-only Home composition. Containers retain all authority, query,
 * analytics, navigation, and popup state, then pass display values and intents.
 */
export function HomeView({
  refreshing,
  onRefresh,
  wallet,
  onOpenWallet,
  heroSlides,
  onPressHeroSlide,
  onPressShortcut,
  quests,
  onSelectQuest,
  onOpenQuests,
  identity,
  onPressNotifications,
  onPressProfile,
  otaUpdate,
  onApplyOtaUpdate,
}: HomeViewProps) {
  const theme = useSportTheme()
  const isDark = useThemeMode() === 'dark'
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createStyles(theme, insets.top, isDark), [insets.top, isDark, theme])
  const topActionScrollY = useRef(new Animated.Value(0)).current
  const topActionsHiddenRef = useRef(false)
  const refreshTriggeredRef = useRef(false)
  const [topActionsHidden, setTopActionsHidden] = useState(false)
  const triggerRefresh = useCallback(() => {
    if (refreshing || refreshTriggeredRef.current) return
    refreshTriggeredRef.current = true
    void onRefresh()
  }, [onRefresh, refreshing])

  useEffect(() => {
    if (!refreshing) refreshTriggeredRef.current = false
  }, [refreshing])
  const topActionScrollStyle = useMemo(() => ({
    opacity: topActionScrollY.interpolate({
      inputRange: [0, 28, TOP_ACTION_FADE_DISTANCE],
      outputRange: [1, 0.72, 0],
      extrapolate: 'clamp',
    }),
    transform: [
      {
        translateY: topActionScrollY.interpolate({
          inputRange: [0, TOP_ACTION_FADE_DISTANCE],
          outputRange: [0, -16],
          extrapolate: 'clamp',
        }),
      },
      {
        scale: topActionScrollY.interpolate({
          inputRange: [0, TOP_ACTION_FADE_DISTANCE],
          outputRange: [1, 0.92],
          extrapolate: 'clamp',
        }),
      },
    ],
  }), [topActionScrollY])
  const pullCompensationStyle = useMemo(() => ({
    transform: [{
      // Keep the native refresh gesture and spinner, but visually cap its
      // elastic travel at 28pt. This keeps the card and shortcut logos bound
      // to their surface instead of drifting through the hero artwork.
      translateY: topActionScrollY.interpolate({
        inputRange: [PULL_COMPENSATION_LIMIT, SHORT_PULL_REFRESH_OFFSET, 0],
        outputRange: [PULL_COMPENSATION_LIMIT - SHORT_PULL_REFRESH_OFFSET, 0, 0],
        extrapolate: 'clamp',
      }),
    }],
  }), [topActionScrollY])
  const handleHomeScroll = useMemo(() => Animated.event(
    [{ nativeEvent: { contentOffset: { y: topActionScrollY } } }],
    {
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = event.nativeEvent.contentOffset.y
        if (offsetY <= SHORT_PULL_REFRESH_OFFSET) triggerRefresh()

        const shouldHide = offsetY >= TOP_ACTION_FADE_DISTANCE
        if (shouldHide === topActionsHiddenRef.current) return
        topActionsHiddenRef.current = shouldHide
        setTopActionsHidden(shouldHide)
      },
      useNativeDriver: true,
    },
  ), [topActionScrollY, triggerRefresh])

  return (
    <View style={styles.screen}>
      <ImageBackground
        source={isDark ? homeHeroDark : homeHeroLight}
        style={styles.heroBackdrop}
        resizeMode="cover"
        accessibilityElementsHidden
      />
      <Animated.ScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleHomeScroll}
        scrollEventThrottle={16}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={triggerRefresh}
            tintColor={theme.orange}
            colors={[theme.orange]}
          />
        )}
      >
        <Animated.View style={[styles.feedLayer, pullCompensationStyle]}>
          <View
            testID="home-scroll-surface"
            style={styles.contentPanel}
            pointerEvents="none"
            accessibilityElementsHidden
          />
          <View style={styles.contentStack}>
            {otaUpdate && (
              <Reveal delay={40}>
                <HomeOtaUpdateBanner {...otaUpdate} onApply={onApplyOtaUpdate} />
              </Reveal>
            )}
            <Reveal delay={60}>
              <View style={styles.scoreCardLayer}>
                <HomeScoreVaultCard
                  {...wallet}
                  displayName={identity.displayName}
                  rallyId={identity.rallyId}
                  onOpenWallet={onOpenWallet}
                />
              </View>
            </Reveal>

            <Reveal delay={110}>
              <View style={styles.shortcutWrap}>
                <HomeShortcutRail onPress={onPressShortcut} />
              </View>
            </Reveal>

            <Reveal delay={135}>
              <HomeArenaHero slides={heroSlides} onPressSlide={onPressHeroSlide} />
            </Reveal>

            <Reveal delay={160}>
              <HomeDailyQuests
                {...quests}
                onSelectQuest={onSelectQuest}
                onOpenQuests={onOpenQuests}
              />
            </Reveal>
          </View>
        </Animated.View>
      </Animated.ScrollView>

      <Animated.View
        style={[styles.topBar, topActionScrollStyle]}
        pointerEvents={topActionsHidden ? 'none' : 'box-none'}
        accessibilityElementsHidden={topActionsHidden}
        importantForAccessibility={topActionsHidden ? 'no-hide-descendants' : 'auto'}
      >
        <HomeIdentityHeader
          {...identity}
          onPressNotifications={onPressNotifications}
          onPressProfile={onPressProfile}
        />
      </Animated.View>
    </View>
  )
}

function createStyles(theme: SportPalette, safeTop: number, isDark: boolean) {
  const floatingTop = Math.max(HEADER_TOP_OFFSET, safeTop + HEADER_TOP_OFFSET)
  const contentTop = Math.max(isDark ? 109 : 105, safeTop + HEADER_TO_CARD_CLEARANCE)

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.bg },
    heroBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 300,
    },
    contentPanel: {
      position: 'absolute',
      top: isDark ? CONTENT_SURFACE_TOP_DARK : CONTENT_SURFACE_TOP_LIGHT,
      left: 0,
      right: 0,
      bottom: 0,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      backgroundColor: isDark ? '#121212' : '#f5f5f5',
      zIndex: 0,
    },
    scoreCardLayer: { zIndex: 1, elevation: 1 },
    root: { flex: 1, zIndex: 1 },
    scrollContent: { flexGrow: 1 },
    feedLayer: {
      minHeight: '100%',
      position: 'relative',
    },
    contentStack: {
      zIndex: 1,
      padding: 20,
      paddingTop: contentTop,
      // Tabs receive a separate scene height, so one compact list inset is
      // enough and does not leave a blank runway after the final mission.
      paddingBottom: Spacing.xxl,
      gap: 14,
    },
    shortcutWrap: { marginTop: 11 },
    topBar: {
      position: 'absolute',
      top: floatingTop,
      left: 20,
      right: 20,
      zIndex: 10,
    },
  })
}
