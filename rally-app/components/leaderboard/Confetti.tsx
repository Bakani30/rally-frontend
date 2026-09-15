import { useEffect, useMemo } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import { RallyPalette } from '@/constants/theme'

const DEFAULT_COLORS = [RallyPalette.amber, RallyPalette.orange, RallyPalette.blue, RallyPalette.green, RallyPalette.red]

type Props = {
  // Bumping `trigger` re-runs the burst with a fresh random layout.
  trigger: number
  width: number
  height: number
  count?: number
  colors?: readonly string[]
  delay?: number
}

type Piece = {
  key: string
  x: number
  y: number
  size: number
  color: string
  rotStart: number
  rotEnd: number
  dx: number
  dy: number
  pieceDelay: number
}

// Confetti burst ported from the design handoff. Pure RN — no SVG dep.
// Each piece is a tiny rectangle that translates + rotates + fades out.
export function Confetti({
  trigger,
  width,
  height,
  count = 24,
  colors = DEFAULT_COLORS,
  delay = 0,
}: Props) {
  // Re-roll piece geometry on every trigger so successive bursts feel fresh.
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        key: `${trigger}-${i}`,
        x: width * (0.15 + Math.random() * 0.7),
        y: height * (0.45 + Math.random() * 0.25),
        size: 8 + Math.random() * 8,
        color: colors[i % colors.length],
        rotStart: Math.random() * 360,
        rotEnd: Math.random() * 720 - 360,
        dx: (Math.random() - 0.5) * width * 0.9,
        dy: -120 - Math.random() * 180,
        pieceDelay: Math.random() * 200,
      })),
    [trigger, count, colors, width, height],
  )

  return (
    <View pointerEvents="none" style={[styles.layer, { width, height }]}>
      {pieces.map((p) => (
        <ConfettiPiece key={p.key} piece={p} delay={delay} />
      ))}
    </View>
  )
}

function ConfettiPiece({ piece, delay }: { piece: Piece; delay: number }) {
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)
  const rot = useSharedValue(piece.rotStart)
  const opacity = useSharedValue(0)

  useEffect(() => {
    tx.value = 0
    ty.value = 0
    rot.value = piece.rotStart
    opacity.value = 0

    const startDelay = delay + piece.pieceDelay
    const easing = Easing.bezier(0.2, 0.7, 0.3, 1)

    opacity.value = withDelay(startDelay, withTiming(1, { duration: 80 }))
    tx.value = withDelay(startDelay, withTiming(piece.dx, { duration: 1500, easing }))
    ty.value = withDelay(startDelay, withTiming(piece.dy, { duration: 1500, easing }))
    rot.value = withDelay(
      startDelay,
      withTiming(piece.rotEnd, { duration: 1500, easing }),
    )
    // Fade out near the end of the flight.
    opacity.value = withDelay(
      startDelay + 1100,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }),
    )
  }, [piece, delay, tx, ty, rot, opacity])

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${rot.value}deg` },
    ],
  }))

  const base: ViewStyle = {
    position: 'absolute',
    left: piece.x,
    top: piece.y,
    width: piece.size,
    height: piece.size * 0.4,
    backgroundColor: piece.color,
    borderRadius: 1.5,
  }

  return <Animated.View style={[base, animated]} />
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
    // Pieces fly upward by 120–300px past the container's top edge —
    // letting them render outside the podium row keeps the burst readable.
  },
})
