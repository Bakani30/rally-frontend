import { useEffect } from 'react'
import { Image, Text, View } from 'react-native'
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming,
} from 'react-native-reanimated'
import { Reveal } from '@/components/motion/Reveal'
import { formatDuration } from '@/lib/run-tracking/session/runSessionFormat'
import { formatPace } from '@/lib/run-tracking/gps/paceSmoothing'
import type { BodyMetricsViewModel } from '@/lib/run-tracking/recap/bodyMetrics'
import type { RunRecapViewModel } from '@/lib/run-tracking/recap/runRecapMoment'
import type { RunRecapColors, RunRecapStyles } from './runRecapMomentStyles'
import { CountUpText } from './CountUpText'

const fireSource = require('@/assets/images/checkin/fire.png')

type RunRecapImpactBeatProps = {
  viewModel: RunRecapViewModel
  body: BodyMetricsViewModel | null
  colors: RunRecapColors
  styles: RunRecapStyles
}

function FireIcon({ styles }: { styles: RunRecapStyles }) {
  const reduceMotion = useReducedMotion()
  const rotate = useSharedValue(0)

  useEffect(() => {
    if (reduceMotion) return
    rotate.value = withSequence(
      withTiming(-3, { duration: 110, easing: Easing.inOut(Easing.quad) }),
      withTiming(3, { duration: 110, easing: Easing.inOut(Easing.quad) }),
      withTiming(-3, { duration: 110, easing: Easing.inOut(Easing.quad) }),
      withTiming(3, { duration: 110, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 110, easing: Easing.inOut(Easing.quad) }),
    )
  }, [reduceMotion, rotate])

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }] }))
  return (
    <Animated.View style={animatedStyle}>
      <Image source={fireSource} style={styles.kcalIcon} resizeMode="contain" />
    </Animated.View>
  )
}

export function RunRecapImpactBeat({ viewModel, body, colors, styles }: RunRecapImpactBeatProps) {
  const reduceMotion = useReducedMotion()
  const { movingTimeSeconds, paceSecondsPerKm, pointDelta } = viewModel

  return (
    <View style={styles.impactBeat}>
      {body?.caloriesKcal != null && (
        <Reveal delay={reduceMotion ? 0 : 160} style={styles.kcalRow}>
          <FireIcon styles={styles} />
          {reduceMotion ? (
            <Text style={[styles.kcalValue, { color: colors.calorieText }]}>{body.caloriesKcal}</Text>
          ) : (
            <CountUpText value={body.caloriesKcal} style={[styles.kcalValue, { color: colors.calorieText }]} />
          )}
          <Text style={styles.kcalLabel}>KCAL</Text>
        </Reveal>
      )}
      <Reveal delay={reduceMotion ? 0 : 300} style={styles.impactTiles}>
        <View style={[styles.tile, { backgroundColor: colors.tileBg, borderColor: colors.tileBorder }]}>
          <Text style={styles.tileLabel}>เวลา</Text>
          <Text style={[styles.tileValueSm, { color: colors.heroInk }]}>
            {movingTimeSeconds != null ? formatDuration(movingTimeSeconds) : '--'}
          </Text>
        </View>
        <View style={[styles.tile, { backgroundColor: colors.tileBg, borderColor: colors.tileBorder }]}>
          <Text style={styles.tileLabel}>PACE /km</Text>
          <Text style={[styles.tileValueSm, { color: colors.heroInk }]}>
            {paceSecondsPerKm != null ? formatPace(paceSecondsPerKm) : '--'}
          </Text>
        </View>
        <View style={[styles.tile, { backgroundColor: colors.tileBg, borderColor: colors.tileBorder }]}>
          <Text style={styles.tileLabel}>แต้ม</Text>
          {reduceMotion ? (
            <Text style={[styles.tileValue, { color: colors.points }]}>+{pointDelta}</Text>
          ) : (
            <CountUpText prefix="+" value={pointDelta} style={[styles.tileValue, { color: colors.points }]} />
          )}
        </View>
      </Reveal>
    </View>
  )
}
