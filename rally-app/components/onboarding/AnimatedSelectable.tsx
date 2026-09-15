import { forwardRef, useEffect, useRef } from 'react'
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
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

type AnimatedSelectableProps = PressableProps & {
  /** Selection state. A false→true flip triggers the select pulse. */
  selected?: boolean
  disabledOpacity?: number
  scaleTo?: number
  style?: StyleProp<ViewStyle>
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

/**
 * Shared selectable wrapper for onboarding chips/rows (sport, gender, สาย,
 * position, level): press-in scale feedback (same feel as `PressableScale`)
 * PLUS a quick spring pulse (1 → 1.06 → 1, ~250ms) whenever `selected` flips
 * to true. Both scales are combined into one UI-thread transform so they
 * don't fight each other — do not wrap this in `PressableScale` too.
 */
export const AnimatedSelectable = forwardRef<View, AnimatedSelectableProps>(function AnimatedSelectable(
  {
    selected,
    disabledOpacity: customDisabledOpacity = 0.5,
    scaleTo = 0.94,
    style,
    onPressIn,
    onPressOut,
    disabled,
    children,
    ...rest
  },
  ref,
) {
  const pressed = useSharedValue(0)
  const pulse = useSharedValue(1)
  const wasSelected = useRef(selected)
  const disabledOpacity = disabled ? customDisabledOpacity : 1

  useEffect(() => {
    if (selected && !wasSelected.current) {
      pulse.value = withSequence(
        withSpring(1.06, { damping: 12, stiffness: 340, mass: 0.5 }),
        withSpring(1, { damping: 14, stiffness: 280, mass: 0.5 }),
      )
    }
    wasSelected.current = selected
  }, [selected, pulse])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: (1 - pressed.value * (1 - scaleTo)) * pulse.value }],
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
