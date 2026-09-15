import { useEffect } from 'react'
import { Text, StyleSheet } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type Props = {
  days: number
  compact?: boolean
}

// Flame pulses gently so an active streak always feels alive.
export function StreakBadge({ days, compact = false }: Props) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const breathe = useSharedValue(0)

  useEffect(() => {
    if (days <= 0) {
      cancelAnimation(breathe)
      return
    }
    breathe.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    )
    return () => cancelAnimation(breathe)
  }, [days, breathe])

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.15 }],
    opacity: 0.85 + breathe.value * 0.15,
  }))

  if (days <= 0) {
    return (
      <Animated.View style={[styles.pill, styles.pillInactive, compact && styles.pillCompact]}>
        <MaterialCommunityIcons name="fire" size={compact ? 13 : 15} color={theme.fightInkSoft} />
        <Text style={[styles.text, styles.textInactive, compact && styles.textCompact]}>
          {compact ? '0' : 'เริ่ม streak'}
        </Text>
      </Animated.View>
    )
  }

  return (
    <Animated.View style={[styles.pill, compact && styles.pillCompact]}>
      <Animated.View style={flameStyle}>
        <MaterialCommunityIcons name="fire" size={compact ? 13 : 15} color={theme.economy} />
      </Animated.View>
      <Text style={[styles.text, compact && styles.textCompact]}>
        {days}
        {compact ? '' : ' วัน'}
      </Text>
    </Animated.View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.arcadeCabinet,
      borderWidth: 1,
      borderColor: theme.economy,
      paddingVertical: 5,
      paddingHorizontal: 12,
      borderRadius: Radius.pill,
      shadowColor: theme.economy,
      shadowOpacity: 0.14,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
    },
    pillCompact: { paddingVertical: 3, paddingHorizontal: 8, gap: 4 },
    pillInactive: { backgroundColor: theme.arcadeCabinet, borderColor: theme.lineStrong },
    text: { fontSize: 13, fontWeight: '800', color: theme.economy, letterSpacing: 0.3 },
    textCompact: { fontSize: 12 },
    textInactive: { color: theme.fightInkSoft },
  })
}
