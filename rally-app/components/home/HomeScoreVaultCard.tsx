import { useEffect, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  UIManager,
  type StyleProp,
  type TextStyle,
  View,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect'
import Svg, { Path } from 'react-native-svg'

import { PressableScale } from '@/components/motion/PressableScale'
import { PointsIcon } from '@/components/economy/PointsIcon'
import { Fonts, type SportPalette } from '@/constants/theme'
import { useSportTheme, useThemeMode } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { homeDictionary } from '@/lib/i18n/dictionaries/home'

type HomeScoreVaultCardProps = {
  walletPoints: number
  walletStatus: 'loading' | 'ready' | 'unavailable'
  pointsDelta?: number | null
  displayName?: string | null
  rallyId?: string | null
  onOpenWallet: () => void
}

export function HomeScoreVaultCard({
  walletPoints,
  walletStatus,
  pointsDelta,
  displayName,
  rallyId,
  onOpenWallet,
}: HomeScoreVaultCardProps) {
  const theme = useSportTheme()
  const isDark = useThemeMode() === 'dark'
  const styles = createStyles(theme, isDark)
  const reduceTransparency = useReduceTransparency()
  const { t } = useI18n(homeDictionary)
  const normalizedWalletPoints = normalizePoints(walletPoints)
  const walletReady = walletStatus === 'ready'
  const hasDelta = typeof pointsDelta === 'number' && pointsDelta !== 0
  const isGain = !!pointsDelta && pointsDelta > 0
  const deltaValue = pointsDelta ? Math.abs(pointsDelta).toLocaleString() : ''
  const memberName = displayName?.trim() || 'RALLY PLAYER'
  const formattedRallyId = formatRallyId(rallyId)

  return (
    <View style={styles.card}>
      <WalletCardMaterial isDark={isDark} reduceTransparency={reduceTransparency} />
      <PressableScale
        style={styles.walletPressable}
        onPress={onOpenWallet}
        accessibilityRole="button"
        accessibilityLabel={
          walletReady
            ? t('openRewardBalancePoints', {
                points: normalizedWalletPoints.toLocaleString(),
              })
            : t(walletStatus === 'loading' ? 'rewardBalanceLoading' : 'rewardBalanceUnavailable')
        }
      >
        <View style={styles.valueRow}>
          <PointsIcon size={26} style={styles.pointsIcon} />
          {walletReady ? (
            <AnimatedScoreNumber
              value={normalizedWalletPoints}
              style={styles.walletValue}
              animateKey={`wallet:${normalizedWalletPoints}`}
              enabled
            />
          ) : (
            <Text style={styles.walletValue}>—</Text>
          )}
          <Text style={styles.unit}>POINT</Text>
          {hasDelta && (
            <View style={styles.delta}>
              <RoundedTrendArrow direction={isGain ? 'up' : 'down'} color={isGain ? theme.greenVivid : theme.risk} />
              <Text style={[styles.deltaValue, isGain ? styles.deltaTextGain : styles.deltaTextLoss]}>
                {deltaValue}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.identityReadout}>
          <Text style={styles.memberName} numberOfLines={1}>{memberName.toUpperCase()}</Text>
        </View>
        {formattedRallyId && <Text style={styles.rallyId}>RALLY ID : {formattedRallyId}</Text>}
      </PressableScale>
    </View>
  )
}

function RoundedTrendArrow({ direction, color }: { direction: 'up' | 'down'; color: string }) {
  return (
    <Svg width={14} height={13} viewBox="0 0 24 21" accessibilityElementsHidden>
      <Path
        d="M13.45 1.65a1.78 1.78 0 0 0-2.9 0L.98 15.07a3.03 3.03 0 0 0 2.46 4.78h17.12a3.03 3.03 0 0 0 2.46-4.78L13.45 1.65Z"
        fill={color}
        transform={direction === 'down' ? 'rotate(180 12 10.5)' : undefined}
      />
    </Svg>
  )
}

function WalletCardMaterial({ isDark, reduceTransparency }: { isDark: boolean; reduceTransparency: boolean }) {
  const nativeLiquidGlass = !reduceTransparency && supportsNativeLiquidGlass()
  const nativeBlur = hasNativeBlur()
  const colorScheme = isDark ? 'dark' : 'light'
  const frostFill = isDark ? materialStyles.frostedDarkFill : materialStyles.frostedLightFill
  const edgeStyle = isDark ? materialStyles.frostedDarkEdge : materialStyles.frostedLightEdge

  return (
    <View pointerEvents="none" style={materialStyles.clip} accessibilityElementsHidden>
      {nativeLiquidGlass ? (
        <>
          <GlassView
            glassEffectStyle="regular"
            colorScheme={colorScheme}
            isInteractive={false}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, frostFill]} />
          <View style={[StyleSheet.absoluteFill, edgeStyle]} />
        </>
      ) : reduceTransparency ? (
        <>
          <View style={[StyleSheet.absoluteFill, isDark ? materialStyles.reducedDark : materialStyles.reducedLight]} />
          <View style={[StyleSheet.absoluteFill, edgeStyle]} />
        </>
      ) : nativeBlur ? (
        <>
          <BlurView intensity={55} tint={colorScheme} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, frostFill]} />
          <View style={[StyleSheet.absoluteFill, edgeStyle]} />
        </>
      ) : (
        <>
          <View style={[StyleSheet.absoluteFill, isDark ? materialStyles.fallbackUnavailableDark : materialStyles.fallbackUnavailableLight]} />
          <View style={[StyleSheet.absoluteFill, edgeStyle]} />
        </>
      )}
    </View>
  )
}

const materialStyles = StyleSheet.create({
  clip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    overflow: 'hidden',
  },
  // The Home vault needs a readable frosted surface over a lively hero, not
  // a transparent window. The cool gray keeps the effect neutral in light
  // mode, while dark mode retains the same material weight.
  frostedLightFill: { backgroundColor: 'rgba(231,236,235,0.72)' },
  frostedDarkFill: { backgroundColor: 'rgba(36,43,46,0.76)' },
  frostedLightEdge: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.68)' },
  frostedDarkEdge: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' },
  fallbackUnavailableLight: { backgroundColor: 'rgba(231,236,235,0.92)' },
  fallbackUnavailableDark: { backgroundColor: 'rgba(36,43,46,0.94)' },
  reducedLight: { backgroundColor: '#e7eceb' },
  reducedDark: { backgroundColor: '#242b2e' },
})

function supportsNativeLiquidGlass(): boolean {
  if (Platform.OS !== 'ios') return false

  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable()
  } catch {
    return false
  }
}

function hasNativeBlur(): boolean {
  return Boolean(UIManager.getViewManagerConfig?.('ExpoBlurView'))
}

function useReduceTransparency(): boolean {
  const [reduceTransparency, setReduceTransparency] = useState(false)

  useEffect(() => {
    let mounted = true

    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((isEnabled) => {
        if (mounted) setReduceTransparency(isEnabled)
      })
      .catch(() => undefined)

    const subscription = AccessibilityInfo.addEventListener?.('reduceTransparencyChanged', setReduceTransparency)

    return () => {
      mounted = false
      subscription?.remove?.()
    }
  }, [])

  return reduceTransparency
}

function normalizePoints(points: number): number {
  if (!Number.isFinite(points)) return 0
  return Math.max(0, Math.round(points))
}

function formatRallyId(rallyId: string | null | undefined): string | null {
  const digits = rallyId?.replace(/\D/g, '') ?? ''
  if (digits.length !== 10) return null
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`
}

type AnimatedScoreNumberProps = {
  value: number
  style: StyleProp<TextStyle>
  animateKey: string
  enabled: boolean
}

function AnimatedScoreNumber({ value, style, animateKey, enabled }: AnimatedScoreNumberProps) {
  const normalizedValue = normalizePoints(value)
  const animatedValue = useRef(new Animated.Value(normalizedValue)).current
  const displayValueRef = useRef(normalizedValue)
  const hasAnimatedRef = useRef(false)
  const [displayValue, setDisplayValue] = useState(normalizedValue)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    let mounted = true

    AccessibilityInfo.isReduceMotionEnabled()
      .then((isReduceMotionEnabled) => {
        if (mounted) setReduceMotion(isReduceMotionEnabled)
      })
      .catch(() => undefined)

    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion)

    return () => {
      mounted = false
      subscription?.remove?.()
    }
  }, [])

  useEffect(() => {
    const targetValue = normalizedValue

    if (!enabled || reduceMotion) {
      animatedValue.stopAnimation()
      animatedValue.setValue(targetValue)
      displayValueRef.current = targetValue
      setDisplayValue(targetValue)
      hasAnimatedRef.current = true
      return
    }

    const fromValue = hasAnimatedRef.current ? displayValueRef.current : 0
    hasAnimatedRef.current = true
    animatedValue.stopAnimation()
    animatedValue.setValue(fromValue)

    const listenerId = animatedValue.addListener(({ value: nextValue }) => {
      const nextDisplayValue = normalizePoints(nextValue)
      displayValueRef.current = nextDisplayValue
      setDisplayValue(nextDisplayValue)
    })

    Animated.timing(animatedValue, {
      toValue: targetValue,
      duration: fromValue === targetValue ? 0 : 720,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      displayValueRef.current = targetValue
      setDisplayValue(targetValue)
      animatedValue.removeListener(listenerId)
    })

    return () => {
      animatedValue.removeListener(listenerId)
      animatedValue.stopAnimation()
    }
  }, [animatedValue, animateKey, enabled, normalizedValue, reduceMotion])

  return (
    <Animated.Text style={style} numberOfLines={1}>
      {displayValue.toLocaleString()}
    </Animated.Text>
  )
}

function createStyles(theme: SportPalette, isDark: boolean) {
  const cardInk = isDark ? '#f7f7f2' : '#182322'

  return StyleSheet.create({
    card: {
      height: 150,
      position: 'relative',
      zIndex: 1,
      elevation: isDark ? 0 : 1,
      borderRadius: 20,
      boxShadow: isDark ? '0px 10px 12.5px rgba(0,0,0,0.08)' : '0px 10px 12.5px rgba(0,0,0,0.15)',
    },
    walletPressable: { ...StyleSheet.absoluteFillObject },
  valueRow: {
    position: 'absolute',
    left: 42,
    top: 56,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  pointsIcon: { alignSelf: 'center' },
  walletValue: {
    color: cardInk,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '900',
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
    fontFamily: Fonts?.number,
  },
  unit: {
    color: cardInk,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    letterSpacing: 0,
    marginBottom: 4,
    },
    delta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginBottom: 4,
    },
    deltaValue: {
      fontSize: 12,
      lineHeight: 15,
      fontWeight: '900',
      letterSpacing: 0,
      fontVariant: ['tabular-nums'],
      fontFamily: Fonts?.number,
    },
    deltaTextGain: { color: theme.greenVivid },
    deltaTextLoss: { color: theme.risk },
  identityReadout: {
    position: 'absolute',
    left: 24,
    top: 13,
  },
  memberName: {
    color: cardInk,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 0.35,
  },
  rallyId: {
    position: 'absolute',
    left: 24,
    bottom: 12,
    color: cardInk,
    opacity: 1,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    fontFamily: Fonts?.mono,
  },
  })
}
