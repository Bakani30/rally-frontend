import { useEffect } from 'react'
import { Text, View } from 'react-native'
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming,
} from 'react-native-reanimated'
import { Reveal } from '@/components/motion/Reveal'
import { formatDuration } from '@/lib/run-tracking/session/runSessionFormat'
import type { BodyMetricsViewModel } from '@/lib/run-tracking/recap/bodyMetrics'
import type { RunRecapColors, RunRecapStyles } from './runRecapMomentStyles'

type RunRecapBodyBeatProps = {
  body: BodyMetricsViewModel | null
  colors: RunRecapColors
  styles: RunRecapStyles
}

function ZoneSegment({
  share, color, index, styles,
}: {
  share: number
  color: string
  index: number
  styles: RunRecapStyles
}) {
  const reduceMotion = useReducedMotion()
  const scale = useSharedValue(reduceMotion ? 1 : 0)

  useEffect(() => {
    if (reduceMotion) return
    scale.value = withDelay(
      index * 80,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
    )
  }, [index, reduceMotion, scale])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scale.value }],
  }))

  return (
    <View style={[styles.zoneSegment, { flex: Math.max(share, 0.0001), backgroundColor: color }]}>
      <Animated.View
        style={[{ flex: 1, backgroundColor: color, transformOrigin: 'left' }, animatedStyle]}
      />
    </View>
  )
}

// Zone card: HR zone distribution bar + legend, then intensity/cadence rows.
// Renders nothing when there's no HR or step data for this run — never an
// empty frame.
export function RunRecapBodyBeat({ body, colors, styles }: RunRecapBodyBeatProps) {
  const reduceMotion = useReducedMotion()
  if (body?.zoneSeconds == null && body?.cadenceSpm == null) return null

  const zones = body.zoneSeconds
  const hasIntensity = body.intensityScore != null && body.intensityLevel != null
  const hasCadence = body.cadenceSpm != null && body.strideMeters != null

  return (
    <Reveal delay={reduceMotion ? 0 : 440} style={styles.bodyCard}>
      <Text style={styles.bodyCardHeader}>โซนหัวใจ</Text>

      {zones != null && (
        <>
          <View style={styles.zoneBarRow}>
            {zones.map((seconds, i) => (
              <ZoneSegment
                key={i}
                share={seconds}
                color={colors.zoneColors[i]}
                index={i}
                styles={styles}
              />
            ))}
          </View>
          <View style={styles.zoneLegendRow}>
            {zones.map((seconds, i) => {
              const isDominant = i === body.dominantZoneIndex
              return (
                <Text
                  key={i}
                  style={[styles.zoneLegendText, isDominant && styles.zoneLegendDominant]}
                >
                  {isDominant ? `Z${i + 1} · ${formatDuration(seconds)}` : `Z${i + 1}`}
                </Text>
              )
            })}
          </View>
        </>
      )}

      {hasIntensity && (
        <View style={styles.bodyRow}>
          <Text style={styles.bodyRowLabel}>ความหนักของการออกกำลังกาย</Text>
          <Text style={styles.bodyRowValue}>{body.intensityScore} · {body.intensityLevel}</Text>
        </View>
      )}

      {hasCadence && (
        <View style={styles.bodyRow}>
          <Text style={styles.bodyRowLabel}>CADENCE</Text>
          <Text style={styles.bodyRowValue}>
            {body.cadenceSpm} spm · ก้าว {body.strideMeters!.toFixed(2)} m
          </Text>
        </View>
      )}
    </Reveal>
  )
}
