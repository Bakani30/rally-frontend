import { useEffect } from 'react'
import { Modal, Pressable, StyleSheet, Text } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Fonts, type SportPalette, Spacing } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

const ICON_FOR_ANIMATION: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  'victory/confetti': 'party-popper',
  'victory/fire': 'fire',
}

type Props = {
  visible: boolean
  animationAssetRef: string | null
  onDismiss: () => void
}

export function VictoryOverlay({ visible, animationAssetRef, onDismiss }: Props) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const scale = useSharedValue(0)
  const glow = useSharedValue(0)

  useEffect(() => {
    if (!visible) {
      scale.value = 0
      glow.value = 0
      return
    }
    scale.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.back(1.6)) })
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0.4, { duration: 700 }),
      ),
      -1,
      true,
    )
  }, [visible, scale, glow])

  const trophyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }))
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }))

  const icon = animationAssetRef
    ? ICON_FOR_ANIMATION[animationAssetRef] ?? 'trophy-award'
    : 'trophy-award'

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Animated.View style={[styles.glow, glowStyle]} />
        <Animated.View style={[styles.card, trophyStyle]}>
          <MaterialCommunityIcons name={icon} size={88} color={theme.amber} />
          <Text style={styles.title}>VICTORY</Text>
          <Text style={styles.subtitle}>tap to continue</Text>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.85)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    glow: {
      position: 'absolute',
      width: 320,
      height: 320,
      borderRadius: 160,
      backgroundColor: theme.amber,
      opacity: 0.25,
    },
    card: { alignItems: 'center', gap: Spacing.sm },
    title: {
      fontSize: 48,
      fontWeight: '900',
      color: theme.chalk,
      fontFamily: Fonts?.rounded,
      letterSpacing: 4,
    },
    subtitle: { fontSize: 11, color: theme.muted, letterSpacing: 2, fontWeight: '700' },
  })
}
