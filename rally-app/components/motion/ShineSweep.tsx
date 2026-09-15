import { useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

type ShineSweepProps = {
  /** Change this value to replay a single sweep. */
  trigger?: number
  /** When false the band stays parked offscreen. */
  play?: boolean
  /** Repeat the sweep with a pause between passes. */
  loop?: boolean
  delayMs?: number
  loopDelayMs?: number
  durationMs?: number
  bandWidth?: number
  angleDeg?: number
  color?: string
  style?: StyleProp<ViewStyle>
}

/**
 * Arcade "shine" — a translucent skewed band that sweeps across its parent.
 * The parent must set `overflow: 'hidden'` (and its own borderRadius) so the
 * band is clipped to the parent's shape. Decorative only; never interactive.
 */
export function ShineSweep({
  trigger = 0,
  play = true,
  loop = false,
  delayMs = 0,
  loopDelayMs = 3200,
  durationMs = 680,
  bandWidth = 46,
  angleDeg = -18,
  color = 'rgba(255,255,255,0.42)',
  style,
}: ShineSweepProps) {
  const [containerWidth, setContainerWidth] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  // skewX pivots on the band's vertical center, so its top/bottom corners
  // overhang horizontally by tan(angle) * halfHeight. Park past that overhang
  // (plus a 2px cushion for the top/bottom -2 bleed) or a sheared corner rests
  // inside the clip as a diagonal white strip between sweeps.
  const skewOverhang = Math.abs(Math.tan((angleDeg * Math.PI) / 180)) * (containerHeight / 2 + 2)
  const parked = -bandWidth - skewOverhang
  const tx = useSharedValue(parked)

  useEffect(() => {
    cancelAnimation(tx)
    if (!play || containerWidth <= 0) {
      tx.value = parked
      return
    }

    const start = parked
    const end = containerWidth + bandWidth + skewOverhang
    tx.value = start

    const sweep = withTiming(end, { duration: durationMs, easing: Easing.in(Easing.ease) })
    if (loop) {
      tx.value = withDelay(
        delayMs,
        withRepeat(
          withSequence(
            sweep,
            withTiming(start, { duration: 0 }),
            withDelay(loopDelayMs, withTiming(start, { duration: 0 })),
          ),
          -1,
          false,
        ),
      )
    } else {
      tx.value = withDelay(delayMs, sweep)
    }

    return () => cancelAnimation(tx)
  }, [trigger, play, loop, delayMs, loopDelayMs, durationMs, bandWidth, containerWidth, parked, skewOverhang, tx])

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width)
    const h = Math.round(e.nativeEvent.layout.height)
    setContainerWidth((prev) => (prev === w ? prev : w))
    setContainerHeight((prev) => (prev === h ? prev : h))
  }

  const bandStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { skewX: `${angleDeg}deg` }],
  }))

  return (
    <View
      pointerEvents="none"
      onLayout={onLayout}
      style={[StyleSheet.absoluteFill, styles.clip, style]}
    >
      <Animated.View style={[styles.band, { width: bandWidth, backgroundColor: color }, bandStyle]} />
    </View>
  )
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  band: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    left: 0,
  },
})
