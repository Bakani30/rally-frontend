import { useEffect } from 'react'
import { Image, Platform, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, {
  Easing,
  useFrameCallback,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { CountUp } from './CountUp'
import { PodiumBarShine } from './PodiumBarShine'
import { RankingAvatar } from './RankingAvatar'
import { TierBadge } from '@/components/ranks/TierBadge'
import type { LeaderboardEntry } from '@/lib/leaderboard/leaderboardTypes'
import type { RankingTheme } from '@/lib/leaderboard/rankingTheme'

// Deep green/red so the arrow stays legible on yellow/silver/bronze
// cards regardless of theme. Matches the dark ink color scale.
const PODIUM_ARROW_UP = '#0E6E3A'
const PODIUM_ARROW_DOWN = '#A11A0E'
const CROWN_SPACE = 34
const CROWN_ASSET = require('../../assets/images/ranking-crown.png')
const CROWN_FLOAT_AMPLITUDE = 3.5
const CROWN_FLOAT_SPEED = 1.35
const CROWN_FLOAT_SPRING = 0.15
const CROWN_FLOAT_DAMPING = 0.6

type Props = {
  entry: LeaderboardEntry
  position: 1 | 2 | 3
  // Stagger order: 0=left (silver), 1=center (gold), 2=right (bronze).
  order: number
  height: number
  width: number
  trigger: number
  theme: RankingTheme
  speed?: number
  animated?: boolean
}

export function PodiumColumn({
  entry,
  position,
  order,
  height,
  width,
  trigger,
  theme,
  speed = 1,
  animated = true,
}: Props) {
  const palette = theme.podium[position]
  const isFirst = position === 1

  const scale = useSharedValue(0)
  const contentOpacity = useSharedValue(0)
  const contentY = useSharedValue(8)
  const crownY = useSharedValue(0)
  const crownBaseY = useSharedValue(-6)
  const crownScale = useSharedValue(1)
  const crownFloatPhase = useSharedValue(0)
  const crownFloatVelocity = useSharedValue(0)

  const barDur = 700 / speed
  const delay = (order === 1 ? 0 : 250 + order * 100) / speed
  const contentDelay = delay + barDur * 0.55

  useEffect(() => {
    if (!animated) {
      scale.value = 1
      contentOpacity.value = 1
      contentY.value = 0
      crownBaseY.value = 0
      crownY.value = 0
      crownScale.value = 1
      return
    }

    scale.value = 0
    contentOpacity.value = 0
    contentY.value = 8
    crownBaseY.value = -6
    crownY.value = -6
    crownScale.value = 0.94
    scale.value = withDelay(
      delay,
      withTiming(1, { duration: barDur, easing: Easing.bezier(0.22, 0.9, 0.3, 1) }),
    )
    contentOpacity.value = withDelay(
      contentDelay,
      withTiming(1, { duration: 380 / speed, easing: Easing.bezier(0.2, 0.8, 0.3, 1) }),
    )
    contentY.value = withDelay(
      contentDelay,
      withTiming(0, { duration: 380 / speed, easing: Easing.bezier(0.2, 0.8, 0.3, 1) }),
    )

    if (isFirst) {
      crownBaseY.value = withDelay(
        contentDelay + 220,
        withSpring(0, { damping: 8, stiffness: 145, mass: 0.6 }),
      )
      crownScale.value = withDelay(
        contentDelay + 220,
        withSpring(1, { damping: 9, stiffness: 135, mass: 0.6 }),
      )
    }
  }, [
    trigger,
    animated,
    delay,
    contentDelay,
    barDur,
    isFirst,
    scale,
    contentOpacity,
    contentY,
    crownBaseY,
    crownY,
    crownScale,
    speed,
  ])

  useFrameCallback((frame) => {
    if (!isFirst) return

    const dt = Math.max(0, Math.min(frame.timeSincePreviousFrame ?? 16.67, 33.34))
    crownFloatPhase.value += (dt / 1000) * CROWN_FLOAT_SPEED
    const targetY = crownBaseY.value + Math.sin(crownFloatPhase.value) * CROWN_FLOAT_AMPLITUDE
    const acceleration = (targetY - crownY.value) * CROWN_FLOAT_SPRING
    crownFloatVelocity.value = (crownFloatVelocity.value + acceleration) * CROWN_FLOAT_DAMPING
    crownY.value += crownFloatVelocity.value
  })

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }],
  }))
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }))
  const crownStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: crownY.value }, { scale: crownScale.value }],
  }))
  const isDark = theme.mode === 'dark'
  const columnHeight = height + (isFirst ? CROWN_SPACE : 0)
  const barTop = isFirst ? CROWN_SPACE : 0

  return (
    <View style={[styles.column, { width, height: columnHeight }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bar,
          {
            height,
            top: barTop,
            backgroundColor: palette.card,
            ...Platform.select({
              web: {
                boxShadow: isDark ? 'none' : `0 8px 22px ${palette.shadow}`,
              },
              default: {
                shadowColor: palette.shadow,
                shadowOpacity: isDark ? 0 : 0.45,
                shadowRadius: isDark ? 0 : 14,
                shadowOffset: { width: 0, height: isDark ? 0 : 8 },
                elevation: isDark ? 0 : 6,
              },
            }),
          },
          barStyle,
        ]}
      >
        <PodiumBarShine
          isFirst={isFirst}
          animated={animated}
          trigger={trigger}
          contentDelay={contentDelay}
        />
      </Animated.View>

      {isFirst && (
        <Animated.View style={[styles.crown, crownStyle]} pointerEvents="none">
          <Image source={CROWN_ASSET} style={styles.crownImage} />
        </Animated.View>
      )}

      <Animated.View style={[styles.content, { top: barTop, height }, contentStyle]}>
        <RankingAvatar
          photoUrl={entry.avatarUrl}
          letter={entry.letter}
          fallbackBg={theme.podiumAvatarBg}
          letterColor={isDark ? theme.podiumAvatarLetter : '#0A0A0F'}
          size={isFirst ? 54 : 42}
          borderColor={isDark ? theme.podiumAvatarBorder : 'rgba(255,255,255,0.7)'}
          borderWidth={isFirst ? 2.5 : 2}
          style={isFirst ? styles.avatarLgWrap : undefined}
        />
        <Text
          numberOfLines={1}
          style={[styles.name, { color: palette.ink }]}
        >
          {entry.displayName}
        </Text>
        <TierBadge tier={entry.tier} size="md" />
        {isFirst && (
          <Text style={[styles.positionNumber, { color: palette.ink }]}>
            {position}
          </Text>
        )}
        <CountUp
          value={entry.rating}
          animated={animated}
          duration={900 / speed}
          delay={contentDelay + 100}
          trigger={trigger}
          style={[
            styles.rating,
            { color: palette.ink, marginTop: 'auto' },
          ]}
        />
        {entry.delta !== undefined && (
          <View style={styles.deltaRow}>
            <MaterialCommunityIcons
              name={(entry.delta ?? 0) >= 0 ? 'menu-up' : 'menu-down'}
              size={12}
              color={(entry.delta ?? 0) >= 0 ? PODIUM_ARROW_UP : PODIUM_ARROW_DOWN}
            />
            <Text style={[styles.delta, { color: palette.ink }]}>
              {(entry.delta ?? 0) >= 0 ? '+' : ''}
              {entry.delta}
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  column: {
    position: 'relative',
    alignSelf: 'flex-end',
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    transformOrigin: 'bottom center',
  },
  crown: {
    position: 'absolute',
    top: 1,
    alignSelf: 'center',
    zIndex: 3,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownImage: {
    width: 36,
    height: 25,
    resizeMode: 'contain',
  },
  content: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: 'center',
  },
  avatarLgWrap: {
    marginTop: 2,
  },
  name: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 5,
    opacity: 0.9,
    textAlign: 'center',
  },
  positionNumber: {
    fontSize: 46,
    fontWeight: '900',
    fontStyle: 'italic',
    lineHeight: 48,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  rating: {
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    fontVariant: ['tabular-nums'],
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    marginTop: 2,
  },
  delta: {
    fontSize: 10,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
})
