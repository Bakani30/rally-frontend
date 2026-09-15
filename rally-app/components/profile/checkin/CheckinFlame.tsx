import { useEffect, useRef } from 'react'
import { AccessibilityInfo, Animated, Easing, Image, type StyleProp, type ViewStyle } from 'react-native'

const fireSource = require('../../../assets/images/checkin/fire.png')

type CheckinFlameProps = {
  size?: number
  style?: StyleProp<ViewStyle>
}

// Hero flame (the founder's fire.png) with a gentle continuous flicker.
// Honors the OS reduce-motion setting by holding still.
export function CheckinFlame({ size = 96, style }: CheckinFlameProps) {
  const flicker = useRef(new Animated.Value(0)).current

  useEffect(() => {
    let cancelled = false
    let loop: Animated.CompositeAnimation | null = null
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled || reduced) return
      loop = Animated.loop(
        Animated.timing(flicker, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      )
      loop.start()
    })
    return () => {
      cancelled = true
      loop?.stop()
    }
  }, [flicker])

  const scaleX = flicker.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 1.04, 0.98, 1.03, 1] })
  const scaleY = flicker.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 1.07, 1.02, 1.05, 1] })
  const rotate = flicker.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ['0deg', '-1.5deg', '1deg', '-0.5deg', '0deg'] })
  const translateY = flicker.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -1.5, 0, -1.5, 0] })

  return (
    <Animated.View style={[{ transform: [{ translateY }, { scaleX }, { scaleY }, { rotate }] }, style]}>
      <Image source={fireSource} style={{ width: size, height: size }} resizeMode="contain" />
    </Animated.View>
  )
}
