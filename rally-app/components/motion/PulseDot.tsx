import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { RallyPalette } from '@/constants/theme'

type PulseDotProps = {
  color?: string
  size?: number
  active?: boolean
}

// Tiny LED-style dot with a breathing halo — used for live / in-progress states.
export function PulseDot({ color = RallyPalette.red, size = 8, active = true }: PulseDotProps) {
  const progress = useSharedValue(0)

  useEffect(() => {
    if (!active) {
      cancelAnimation(progress)
      progress.value = 0
      return
    }
    progress.value = 0
    progress.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      -1,
      false
    )
    return () => cancelAnimation(progress)
  }, [active, progress])

  const haloStyle = useAnimatedStyle(() => ({
    opacity: active ? 0.5 * (1 - progress.value) : 0,
    transform: [{ scale: 1 + progress.value * 2 }],
  }))

  const halo = size * 1.6

  return (
    <View style={[styles.wrap, { width: halo, height: halo }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          { width: halo, height: halo, borderRadius: halo / 2, backgroundColor: color },
          haloStyle,
        ]}
      />
      <View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity: active ? 1 : 0.4,
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute' },
  dot: { position: 'absolute' },
})
