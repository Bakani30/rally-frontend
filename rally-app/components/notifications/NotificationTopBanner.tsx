import { useEffect, useMemo, useRef } from 'react'
import {
  Animated,
  Easing,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme, useThemeMode } from '@/hooks/useAppTheme'
import { acceptInviteAndOpenMatch } from '@/lib/notifications/inviteAcceptNavigation'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import {
  useNotificationBannerStore,
} from '@/stores/notificationBannerStore'

const DISPLAY_MS = 10_000

const ACTIVITY_ICON: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  running: 'run-fast',
  basketball: 'basketball',
  badminton: 'badminton',
}

export function NotificationTopBanner() {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const theme = useSportTheme()
  const mode = useThemeMode()
  const styles = useMemo(() => createStyles(theme, mode === 'light'), [mode, theme])
  const banner = useNotificationBannerStore((state) => state.current)
  const dismissBanner = useNotificationBannerStore((state) => state.dismissBanner)
  const translateY = useRef(new Animated.Value(-160)).current
  const translateX = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current

  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_event, gesture) => {
        translateX.setValue(gesture.dx)
      },
      onPanResponderRelease: (_event, gesture) => {
        if (!banner) return
        const shouldDismiss = Math.abs(gesture.dx) > 86 || Math.abs(gesture.vx) > 0.85
        if (!shouldDismiss) {
          Animated.spring(translateX, {
            toValue: 0,
            damping: 20,
            stiffness: 240,
            useNativeDriver: true,
          }).start()
          return
        }

        const direction = gesture.dx >= 0 ? 1 : -1
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: direction * width,
            duration: 160,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 120,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(() => {
          dismissBanner(banner.id)
          translateX.setValue(0)
        })
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          damping: 20,
          stiffness: 240,
          useNativeDriver: true,
        }).start()
      },
    }),
    [banner, dismissBanner, opacity, translateX, width],
  )

  useEffect(() => {
    if (!banner) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -160,
          duration: 170,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start()
      return undefined
    }

    translateX.setValue(0)
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 22,
        stiffness: 250,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start()

    const timeout = setTimeout(() => dismissBanner(banner.id), DISPLAY_MS)
    return () => clearTimeout(timeout)
  }, [banner, dismissBanner, opacity, translateX, translateY])

  if (!banner) return null

  function handlePress() {
    if (!banner) return
    dismissBanner(banner.id)
    if (banner.kind === 'match_invited' && banner.matchId) {
      void acceptInviteAndOpenMatch({
        matchId: banner.matchId,
        inviteId: banner.inviteId,
      })
      return
    }
    guardedRouter.push(banner.route as never, { actionKey: `banner:${banner.id}` })
  }

  const activityType = banner.activityType ?? 'match'
  const iconName = banner.kind === 'match_invited'
    ? ACTIVITY_ICON[activityType] ?? 'trophy-award'
    : 'account-plus'
  const avatarIcon = 'account'
  const eyebrow = banner.kind === 'match_invited' ? 'MATCH INVITE' : 'FRIEND REQUEST'
  const actionLabel = banner.kind === 'match_invited' ? 'รับคำเชิญ' : 'เปิดคำขอ'
  const accentColor = banner.kind === 'match_invited' ? theme.orange : theme.green
  const shellWidth = Math.min(width - Spacing.lg, 560)

  return (
    <View pointerEvents="box-none" style={[styles.portal, { paddingTop: Math.max(insets.top, 10) + Spacing.sm }]}>
      <Animated.View
        style={[
          styles.animatedWrap,
          { width: shellWidth },
          {
            opacity,
            transform: [{ translateY }, { translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`${banner.title}. ${banner.body}`}
          onPress={handlePress}
          scaleTo={0.985}
          style={styles.banner}
        >
          <View style={[styles.accentRail, { backgroundColor: accentColor }]} />
          <View style={styles.avatarWrap}>
            {banner.avatarUrl ? (
              <Image source={{ uri: banner.avatarUrl }} style={styles.avatar} />
            ) : (
            <MaterialCommunityIcons
              name={avatarIcon}
              size={24}
              color={theme.chalk}
            />
            )}
          </View>
          <View style={styles.textWrap}>
            <View style={styles.eyebrowRow}>
              <Text style={[styles.eyebrow, { color: accentColor }]} numberOfLines={1}>
                {eyebrow}
              </Text>
              <View style={styles.liveDot} />
            </View>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86}>
              {banner.title}
            </Text>
            <Text style={styles.body} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.88}>
              {banner.body}
            </Text>
          </View>
          <View style={styles.actionIcon}>
            <MaterialCommunityIcons name={iconName} size={26} color={theme.chalk} />
            <Text style={styles.actionLabel} numberOfLines={1}>{actionLabel}</Text>
          </View>
        </PressableScale>
      </Animated.View>
    </View>
  )
}

function createStyles(theme: SportPalette, isLightMode: boolean) {
  const bannerBg = isLightMode ? theme.ink : theme.bg
  const bannerSurface = isLightMode ? 'rgba(209,224,221,0.16)' : theme.surfaceStrong
  const bannerLine = isLightMode ? 'rgba(209,224,221,0.28)' : theme.lineStrong

  return StyleSheet.create({
  portal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  animatedWrap: {
    maxWidth: '100%',
  },
  banner: {
    minHeight: 104,
    borderRadius: 38,
    backgroundColor: bannerBg,
    borderWidth: 1,
    borderColor: bannerLine,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    shadowColor: theme.ink,
    shadowOpacity: 0.24,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
  },
  accentRail: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Spacing.md,
    height: 3,
    borderRadius: Radius.pill,
    opacity: 0.48,
  },
  avatarWrap: {
    width: 58,
    height: 58,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bannerSurface,
    borderWidth: 1,
    borderColor: bannerLine,
    overflow: 'hidden',
  },
  avatar: {
    width: 58,
    height: 58,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
    paddingBottom: Spacing.sm,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.chalk,
    opacity: 0.56,
  },
  title: {
    color: theme.chalk,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0,
  },
  body: {
    color: isLightMode ? theme.bgElevated : theme.inkSoft,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0,
    marginTop: 2,
  },
  actionIcon: {
    width: 54,
    minHeight: 54,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bannerSurface,
    borderWidth: 1,
    borderColor: bannerLine,
    paddingHorizontal: Spacing.xs,
    gap: 2,
  },
  actionLabel: {
    color: isLightMode ? theme.bgElevated : theme.inkSoft,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0,
  },
})
}
