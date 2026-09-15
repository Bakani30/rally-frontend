import { useEffect } from 'react'
import { ImageBackground, StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import Svg, { Polyline } from 'react-native-svg'
import { useVideoPlayer, VideoView } from 'expo-video'

import { RallyBrandMark } from '@/components/run/brand/RallyBrandMark'
import { RUN_FLOW_ACCENT, RUN_FLOW_DARK } from '@/components/run/theme/runFlowColors'
import type { RunShareCandidate } from '@/lib/run-insights'
import type { GpsPoint } from '@/lib/run-tracking/gps/gpsTypes'
import { projectRouteForStory, storyPointsToSvgPolyline } from '@/lib/run-story/routeStoryProjection'

const POINTS_EARNED_ID = 'points-earned'
const POINTS_AMBER = '#eac31a'

// Contrast shadow applied to all metric text so they read on any photo background
const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.55)',
  textShadowRadius: 6,
  textShadowOffset: { width: 0, height: 1 },
} as const

type RunStoryPreviewProps = {
  backgroundUri: string | null
  /** 'video' renders a muted, looping expo-video cover behind the overlay instead of a static image. */
  backgroundKind?: 'photo' | 'video'
  path: GpsPoint[]
  distance: string
  movingTime: string
  pace: string
  dateLabel: string
  metrics?: RunShareCandidate[]
  /** Fires once the video background's own duration is known (for export-duration clamping). */
  onVideoDurationSeconds?: (seconds: number) => void
}

const ROUTE_WIDTH = 236
const ROUTE_HEIGHT = 236

export function RunStoryPreview({
  backgroundUri,
  backgroundKind = 'photo',
  path,
  distance,
  movingTime,
  pace,
  dateLabel,
  metrics,
  onVideoDurationSeconds,
}: RunStoryPreviewProps) {
  const isVideoBackground = backgroundKind === 'video' && backgroundUri != null
  const videoPlayer = useVideoPlayer(isVideoBackground ? backgroundUri : null, (p) => {
    p.loop = true
    p.muted = true
    p.play()
  })

  useEffect(() => {
    if (!isVideoBackground || !onVideoDurationSeconds) return
    const subscription = videoPlayer.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay' && videoPlayer.duration > 0) {
        onVideoDurationSeconds(videoPlayer.duration)
      }
    })
    return () => subscription.remove()
  }, [isVideoBackground, onVideoDurationSeconds, videoPlayer])

  const projected = projectRouteForStory(path, {
    width: ROUTE_WIDTH,
    height: ROUTE_HEIGHT,
    padding: 24,
  })
  const routePoints = storyPointsToSvgPolyline(projected)
  const storyMetrics = metrics && metrics.length > 0
    ? metrics.map((metric) => ({
        id: metric.id,
        label: metric.label.toUpperCase(),
        value: metric.value,
      }))
    : [
        { id: undefined, label: 'ระยะทาง', value: distance },
        { id: undefined, label: 'เวลา', value: movingTime },
        { id: undefined, label: 'PACE', value: pace },
      ]
  const primaryMetric = storyMetrics[0]
  const secondaryMetrics = storyMetrics.slice(1)

  const isPoints = (id: string | undefined, label: string) =>
    id === POINTS_EARNED_ID || label === 'POINTS'

  // --- Draggable route shared values (top-level, rules-of-hooks) ---
  const routeTx = useSharedValue(0)
  const routeTy = useSharedValue(0)
  const routeSx = useSharedValue(0)
  const routeSy = useSharedValue(0)

  // --- Draggable info box shared values (top-level, rules-of-hooks) ---
  const infoTx = useSharedValue(0)
  const infoTy = useSharedValue(0)
  const infoSx = useSharedValue(0)
  const infoSy = useSharedValue(0)

  const routePan = Gesture.Pan()
    .onBegin(() => {
      routeSx.value = routeTx.value
      routeSy.value = routeTy.value
    })
    .onUpdate((e) => {
      routeTx.value = routeSx.value + e.translationX
      routeTy.value = routeSy.value + e.translationY
    })

  const infoPan = Gesture.Pan()
    .onBegin(() => {
      infoSx.value = infoTx.value
      infoSy.value = infoTy.value
    })
    .onUpdate((e) => {
      infoTx.value = infoSx.value + e.translationX
      infoTy.value = infoSy.value + e.translationY
    })

  const routeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: routeTx.value }, { translateY: routeTy.value }],
  }))

  const infoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: infoTx.value }, { translateY: infoTy.value }],
  }))

  const content = (
    <View style={styles.story}>
      {/* Subtle scrim so metric text contrasts against bright photos */}
      <View style={styles.photoScrim} />

      <View style={styles.topMeta}>
        <RallyBrandMark size={30} treatment="on-dark" />
        <Text style={styles.date}>{dateLabel}</Text>
      </View>

      <GestureDetector gesture={routePan}>
        <Animated.View style={[styles.routeWrap, routeAnimatedStyle]}>
          {/* Dark casing behind lime stroke — no hard box, just shadow */}
          <Svg width={ROUTE_WIDTH} height={ROUTE_HEIGHT} viewBox={`0 0 ${ROUTE_WIDTH} ${ROUTE_HEIGHT}`}>
            <Polyline
              points={routePoints}
              fill="none"
              stroke="rgba(0,0,0,0.5)"
              strokeWidth={17}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Polyline
              points={routePoints}
              fill="none"
              stroke={RUN_FLOW_ACCENT}
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>
      </GestureDetector>

      {/* Borderless info box — no card/panel, elements float over the background */}
      <GestureDetector gesture={infoPan}>
        <Animated.View style={[styles.statsPanel, infoAnimatedStyle]}>
          <View style={styles.primaryStat}>
            <Text
              style={[
                styles.primaryValue,
                isPoints(primaryMetric.id, primaryMetric.label) && styles.pointsValue,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {primaryMetric.value}
            </Text>
            <Text style={styles.primaryLabel} numberOfLines={1}>
              {primaryMetric.label}
            </Text>
          </View>
          <View style={styles.metricGrid}>
            {secondaryMetrics.map((metric) => (
              <Metric
                key={`${metric.label}:${metric.value}`}
                label={metric.label}
                value={metric.value}
                isPoints={isPoints(metric.id, metric.label)}
              />
            ))}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  )

  if (!backgroundUri) {
    return <View style={[styles.frame, styles.fallbackBackground]}>{content}</View>
  }

  if (isVideoBackground) {
    return (
      <View style={styles.frame}>
        <VideoView
          player={videoPlayer}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
        {content}
      </View>
    )
  }

  return (
    <ImageBackground
      source={{ uri: backgroundUri }}
      style={styles.frame}
      imageStyle={styles.image}
      resizeMode="cover"
    >
      {content}
    </ImageBackground>
  )
}

function Metric({ label, value, isPoints }: { label: string; value: string; isPoints: boolean }) {
  return (
    <View style={styles.metric}>
      <Text
        style={[styles.metricValue, isPoints && styles.pointsValue]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={styles.metricLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: 9 / 16,
    overflow: 'hidden',
    backgroundColor: RUN_FLOW_DARK,
  },
  fallbackBackground: {
    backgroundColor: RUN_FLOW_DARK,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  story: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 34,
    paddingBottom: 34,
    justifyContent: 'space-between',
  },
  photoScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.24)',
  },
  topMeta: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    color: '#9a9eb2',
    fontSize: 12,
    fontWeight: '800',
    ...TEXT_SHADOW,
  },
  routeWrap: {
    alignSelf: 'center',
    width: ROUTE_WIDTH,
    height: ROUTE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 120,
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  // No card/border/background — elements float directly over the photo or dark fill
  statsPanel: {
    width: '100%',
  },
  primaryStat: {
    marginBottom: 16,
  },
  primaryValue: {
    color: RUN_FLOW_ACCENT,
    fontSize: 40,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    ...TEXT_SHADOW,
  },
  primaryLabel: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: 2,
    ...TEXT_SHADOW,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  // No background, border, or rounded casing on individual metrics
  metric: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 0,
  },
  metricValue: {
    color: '#e6e8f0',
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    ...TEXT_SHADOW,
  },
  // Amber override for points-earned metric value
  pointsValue: {
    color: POINTS_AMBER,
  },
  metricLabel: {
    color: '#7e8298',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
    textTransform: 'uppercase',
    ...TEXT_SHADOW,
  },
})
