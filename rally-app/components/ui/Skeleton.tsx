import React, { useEffect } from 'react'
import { StyleSheet, ViewStyle } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated'

interface SkeletonProps {
  width?: number | `${number}%`
  height?: number | `${number}%`
  borderRadius?: number
  style?: ViewStyle
  color?: string
}

export function Skeleton({
  width = '100%',
  height = 24,
  borderRadius = 8,
  style,
  color = 'rgba(255, 255, 255, 0.1)',
}: SkeletonProps) {
  const opacity = useSharedValue(0.3)

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, // Loop indefinitely
      true, // Reverse
    )
  }, [opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: color,
        },
        style,
        animatedStyle,
      ]}
    />
  )
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
})
