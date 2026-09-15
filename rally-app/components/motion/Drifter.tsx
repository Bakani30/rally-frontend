import { useEffect, type ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

type DrifterProps = {
  children: ReactNode
  /** Vertical bob amplitude (px). */
  bobY?: number
  /** Horizontal drift amplitude (px). */
  driftX?: number
  /** Rotation amplitude (deg). 0 disables rotation. */
  rotateDeg?: number
  /** Base half-cycle duration (ms). */
  durationMs?: number
  delayMs?: number
  style?: StyleProp<ViewStyle>
}

/**
 * Slow, looping ambient drift for decorative motes. Oscillates Y/X (and optional
 * rotation) out of phase so motion feels organic. Transform-only, runs on the UI
 * thread; pair with low opacity for a subtle background. Never interactive.
 */
export function Drifter({
  children,
  bobY = 8,
  driftX = 6,
  rotateDeg = 0,
  durationMs = 4000,
  delayMs = 0,
  style,
}: DrifterProps) {
  const py = useSharedValue(0)
  const px = useSharedValue(0)
  const rot = useSharedValue(0)

  useEffect(() => {
    const sine = Easing.inOut(Easing.sin)
    py.value = withDelay(delayMs, withRepeat(withTiming(1, { duration: durationMs, easing: sine }), -1, true))
    px.value = withDelay(
      delayMs + 300,
      withRepeat(withTiming(1, { duration: Math.round(durationMs * 1.3), easing: sine }), -1, true),
    )
    if (rotateDeg !== 0) {
      rot.value = withDelay(
        delayMs,
        withRepeat(withTiming(1, { duration: Math.round(durationMs * 1.6), easing: sine }), -1, true),
      )
    }
    return () => {
      cancelAnimation(py)
      cancelAnimation(px)
      cancelAnimation(rot)
    }
  }, [bobY, driftX, rotateDeg, durationMs, delayMs, py, px, rot])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (px.value - 0.5) * 2 * driftX },
      { translateY: (py.value - 0.5) * 2 * bobY },
      { rotate: `${(rot.value - 0.5) * 2 * rotateDeg}deg` },
    ],
  }))

  return (
    <Animated.View pointerEvents="none" style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  )
}
