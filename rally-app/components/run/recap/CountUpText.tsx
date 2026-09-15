import { useEffect, useState } from 'react'
import type { StyleProp, TextStyle } from 'react-native'
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming,
} from 'react-native-reanimated'

type CountUpTextProps = {
  value: number
  prefix?: string
  style?: StyleProp<TextStyle>
  durationMs?: number
}

/** Counts 0→value over ~900ms with an ease-out, then lands with a small pop. */
export function CountUpText({ value, prefix = '', style, durationMs = 900 }: CountUpTextProps) {
  const reduceMotion = useReducedMotion()
  const [shown, setShown] = useState(reduceMotion ? value : 0)
  const scale = useSharedValue(1)

  useEffect(() => {
    if (reduceMotion) { setShown(value); return }
    const start = Date.now()
    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(Math.round(value * eased))
      if (t >= 1) {
        clearInterval(timer)
        scale.value = withSequence(
          withTiming(1.12, { duration: 140, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 160 }),
        )
      }
    }, 33)
    return () => clearInterval(timer)
  }, [value, durationMs, reduceMotion, scale])

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  return <Animated.Text style={[style, animatedStyle]}>{prefix}{shown}</Animated.Text>
}
