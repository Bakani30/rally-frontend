import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

type PodiumSpotlightsProps = {
  width: number
  height: number
  mode: 'light' | 'dark'
}

/**
 * Arena spotlights fanning down behind the podium. Static SVG beams with a soft
 * top→transparent gradient and a slow opacity breathe so they feel alive without
 * pulling focus. Decorative; render behind the columns with pointerEvents none.
 */
export function PodiumSpotlights({ width, height, mode }: PodiumSpotlightsProps) {
  const breathe = useSharedValue(0)

  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    )
    return () => cancelAnimation(breathe)
  }, [breathe])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: 0.6 + breathe.value * 0.4 }))

  if (width <= 0 || height <= 0) return null

  const cx = width / 2
  const apexY = -6
  const color = mode === 'dark' ? '#fff4d2' : '#f4c33a'
  const beams: [number, number, number][] = [
    [cx, cx - width * 0.14, cx + width * 0.14],
    [cx - 8, cx - width * 0.46, cx - width * 0.2],
    [cx + 8, cx + width * 0.2, cx + width * 0.46],
  ]

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, animatedStyle]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="podiumBeam" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.22} />
            <Stop offset="0.6" stopColor={color} stopOpacity={0.06} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {beams.map(([ax, bl, br], index) => (
          <Polygon
            key={index}
            points={`${ax},${apexY} ${bl},${height} ${br},${height}`}
            fill="url(#podiumBeam)"
          />
        ))}
      </Svg>
    </Animated.View>
  )
}
