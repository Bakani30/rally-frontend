import { useEffect, useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useThemeMode } from '@/hooks/useAppTheme'
import { formatDistance, formatDuration } from '@/lib/run-tracking/session/runSessionFormat'
import { formatPace } from '@/lib/run-tracking/gps/paceSmoothing'
import type { BodyMetricsViewModel } from '@/lib/run-tracking/recap/bodyMetrics'
import { createRunRecapColors, createRunRecapStyles } from '@/components/run/recap/runRecapMomentStyles'
import { CountUpText } from '@/components/run/recap/CountUpText'
import { GlassSurface } from './GlassSurface'

const fireSource = require('@/assets/images/checkin/fire.png')

const SHEET_HEIGHT = 420
const LIP_HEIGHT = 28
const EXPANDED_Y = 0
const COLLAPSED_Y = SHEET_HEIGHT - LIP_HEIGHT
const SPRING = { damping: 20, stiffness: 200, mass: 0.8 }

type GlassRecapSheetProps = {
  visible: boolean
  body: BodyMetricsViewModel | null
  distanceMeters: number | null
  movingTimeSeconds: number | null
  paceSecondsPerKm: number | null
  pointDelta: number | null
  onOpenSummary: () => void
  onShareVideo: () => void
}

function clamp(value: number, min: number, max: number): number {
  'worklet'
  return Math.min(Math.max(value, min), max)
}

/** Liquid-glass bottom sheet for the replay finale: Rally body recap over the
 * settled 3D camera. Pan the grabber down to collapse to a 28px lip, up to
 * restore. Reduce-motion collapses the spring slide to a plain fade. */
export function GlassRecapSheet({
  visible, body, distanceMeters, movingTimeSeconds, paceSecondsPerKm, pointDelta, onOpenSummary, onShareVideo,
}: GlassRecapSheetProps) {
  const mode = useThemeMode()
  const colors = createRunRecapColors(mode)
  const recap = createRunRecapStyles(colors)
  const insets = useSafeAreaInsets()
  const reduceMotion = useReducedMotion()

  const [collapsed, setCollapsed] = useState(false)
  const translateY = useSharedValue(SHEET_HEIGHT)
  const opacity = useSharedValue(0)
  const dragStartY = useSharedValue(0)

  useEffect(() => {
    const restY = collapsed ? COLLAPSED_Y : EXPANDED_Y
    if (reduceMotion) {
      // Fade-only: pin the sheet at its rest position (no slide at all) and
      // animate opacity alone for show/hide.
      translateY.value = restY
      opacity.value = withTiming(visible ? 1 : 0, { duration: 200 })
      return
    }
    translateY.value = withSpring(visible ? restY : SHEET_HEIGHT, SPRING)
    opacity.value = withTiming(visible ? 1 : 0, { duration: 150 })
  }, [visible, collapsed, reduceMotion, translateY, opacity])

  const pan = Gesture.Pan()
    .onBegin(() => { dragStartY.value = translateY.value })
    .onUpdate((e) => {
      translateY.value = clamp(dragStartY.value + e.translationY, EXPANDED_Y, COLLAPSED_Y)
    })
    .onEnd((e) => {
      const shouldCollapse = translateY.value > COLLAPSED_Y / 2 || e.velocityY > 600
      const targetY = shouldCollapse ? COLLAPSED_Y : EXPANDED_Y
      // Reduce-motion: jump straight to the snap position, no spring.
      translateY.value = reduceMotion ? targetY : withSpring(targetY, SPRING)
      runOnJS(setCollapsed)(shouldCollapse)
    })

  // Tap on the collapsed lip restores the sheet. Exclusive keeps pan priority
  // so a drag never also fires as a tap.
  const tap = Gesture.Tap()
    .onEnd(() => {
      if (translateY.value < COLLAPSED_Y / 2) return
      translateY.value = reduceMotion ? EXPANDED_Y : withSpring(EXPANDED_Y, SPRING)
      runOnJS(setCollapsed)(false)
    })
  const grabberGesture = Gesture.Exclusive(pan, tap)

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  const hasIntensity = body?.intensityScore != null && body?.intensityLevel != null
  const zones = body?.zoneSeconds ?? null

  return (
    <View style={styles.wrapper} pointerEvents={visible ? 'box-none' : 'none'}>
      <Animated.View style={[styles.sheetPositioner, { height: SHEET_HEIGHT }, sheetStyle]}>
        <GlassSurface style={[styles.glass, { paddingBottom: insets.bottom + 16, backgroundColor: `${colors.cardBg}f0` }]}>
          <GestureDetector gesture={grabberGesture}>
            <View style={styles.grabberZone}>
              <View style={[styles.grabberBar, { backgroundColor: colors.tileBorder }]} />
            </View>
          </GestureDetector>

          <View style={styles.content}>
            <Text style={[styles.distanceValue, { color: colors.heroInk }]}>
              {distanceMeters != null ? formatDistance(distanceMeters) : '--'}
            </Text>

            {body?.caloriesKcal != null && (
              <View style={recap.kcalRow}>
                <Image source={fireSource} style={recap.kcalIcon} resizeMode="contain" />
                <CountUpText value={body.caloriesKcal} style={[recap.kcalValue, { color: colors.calorieText }]} />
                <Text style={recap.kcalLabel}>KCAL</Text>
              </View>
            )}

            <View style={recap.impactTiles}>
              <View style={[recap.tile, { backgroundColor: colors.tileBg, borderColor: colors.tileBorder }]}>
                <Text style={recap.tileLabel}>เวลา</Text>
                <Text style={[recap.tileValueSm, { color: colors.heroInk }]}>
                  {movingTimeSeconds != null ? formatDuration(movingTimeSeconds) : '--'}
                </Text>
              </View>
              <View style={[recap.tile, { backgroundColor: colors.tileBg, borderColor: colors.tileBorder }]}>
                <Text style={recap.tileLabel}>PACE /km</Text>
                <Text style={[recap.tileValueSm, { color: colors.heroInk }]}>
                  {paceSecondsPerKm != null ? formatPace(paceSecondsPerKm) : '--'}
                </Text>
              </View>
              {pointDelta != null && (
                <View style={[recap.tile, { backgroundColor: colors.tileBg, borderColor: colors.tileBorder }]}>
                  <Text style={recap.tileLabel}>แต้ม</Text>
                  <CountUpText prefix="+" value={pointDelta} style={[recap.tileValue, { color: colors.points }]} />
                </View>
              )}
            </View>

            {zones != null && (
              <View style={recap.zoneBarRow}>
                {zones.map((seconds, i) => (
                  <View
                    key={i}
                    style={[recap.zoneSegment, { flex: Math.max(seconds, 0.0001), backgroundColor: colors.zoneColors[i] }]}
                  />
                ))}
              </View>
            )}

            {hasIntensity && (
              <View style={recap.bodyRow}>
                <Text style={recap.bodyRowLabel}>ความหนักของการออกกำลังกาย</Text>
                <Text style={recap.bodyRowValue}>{body.intensityScore} · {body.intensityLevel}</Text>
              </View>
            )}

            <View style={recap.secondaryRow}>
              <Pressable
                style={[recap.primaryButton, styles.flexButton, { backgroundColor: colors.accent }]}
                onPress={onOpenSummary}
                accessibilityRole="button"
                accessibilityLabel="ดูสรุปเต็ม"
              >
                <Text style={[recap.primaryButtonText, { color: colors.onAccent }]}>ดูสรุปเต็ม</Text>
              </Pressable>
              <Pressable
                style={[recap.secondaryButton, styles.flexButton, { borderColor: colors.secondaryBorder }]}
                onPress={onShareVideo}
                accessibilityRole="button"
                accessibilityLabel="แชร์วิดีโอ"
              >
                <Text style={[recap.secondaryButtonText, { color: colors.secondaryText }]}>แชร์วิดีโอ</Text>
              </Pressable>
            </View>
          </View>
        </GlassSurface>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  sheetPositioner: { width: '100%' },
  glass: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  grabberZone: { height: LIP_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  grabberBar: { width: 40, height: 4, borderRadius: 2 },
  content: { paddingHorizontal: 20, gap: 12 },
  distanceValue: { fontSize: 32, fontWeight: '900', fontVariant: ['tabular-nums'] },
  flexButton: { flex: 1 },
})
