import { forwardRef } from 'react'
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

type PressableScaleProps = PressableProps & {
  disabledOpacity?: number
  scaleTo?: number
  style?: StyleProp<ViewStyle>
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export const PressableScale = forwardRef<View, PressableScaleProps>(function PressableScale(
  { disabledOpacity: customDisabledOpacity = 0.5, scaleTo = 0.96, style, onPressIn, onPressOut, disabled, children, ...rest },
  ref
) {
  const pressed = useSharedValue(0)
  const reduceMotion = useReducedMotion()
  const disabledOpacity = disabled ? customDisabledOpacity : 1

  // Only animate transform + opacity — worklet runs on UI thread, not JS thread.
  // Base styles are merged separately via the style prop array.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 - pressed.value * (1 - scaleTo) }],
    opacity: disabledOpacity * (1 - pressed.value * 0.08),
  }))

  function handlePressIn(e: GestureResponderEvent) {
    pressed.value = withSpring(1, { damping: 20, stiffness: 400, mass: 0.4 })
    onPressIn?.(e)
  }
  function handlePressOut(e: GestureResponderEvent) {
    pressed.value = withTiming(0, { duration: 120 })
    onPressOut?.(e)
  }

  return (
    <AnimatedPressable
      ref={ref}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children as never}
    </AnimatedPressable>
  )
})
