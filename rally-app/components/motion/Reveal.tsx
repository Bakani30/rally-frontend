import { useEffect } from 'react'
import type { ViewProps } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'

type RevealProps = ViewProps & {
  delay?: number
  translateY?: number
  duration?: number
}

// Fade + slide-up entrance. Tiny stagger by varying `delay` from the caller.
export function Reveal({
  delay = 0,
  translateY = 14,
  duration = 420,
  style,
  children,
  ...rest
}: RevealProps) {
  const progress = useSharedValue(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1
      return
    }
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
    )
  }, [delay, duration, progress, reduceMotion])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: reduceMotion ? 0 : (1 - progress.value) * translateY }],
  }))

  return (
    <Animated.View style={[animatedStyle, style]} {...rest}>
      {children}
    </Animated.View>
  )
}
