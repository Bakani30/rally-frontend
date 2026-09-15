import { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { Radius } from '@/constants/theme'
import { lobbyMoveCooldownSecondsLeft } from '@/lib/match/lobbyMoveCooldown'
import { lobbyColors, LOBBY_ORANGE } from '@/components/match/lobbyStageStyles'

type LobbyMoveCooldownBadgeProps = {
  /** Epoch ms when the cooldown ends, or null when there is no active cooldown. */
  endsAt: number | null
  /** Full cooldown length in ms — used to draw the depleting progress bar. */
  durationMs: number
  /** Distance from the top of the lobby screen, e.g. the safe-area inset. */
  topOffset?: number
}

const COLORS = lobbyColors()

/**
 * Floating pill that tells the player a position move/swap is on cooldown and counts
 * down the seconds left. Self-contained: it owns its own ticker off `endsAt`, so the
 * heavy match screen never re-renders while the countdown runs. The bar depletes via
 * Animated (no re-render); the seconds label re-renders only when the integer changes.
 */
export function LobbyMoveCooldownBadge({ endsAt, durationMs, topOffset = 0 }: LobbyMoveCooldownBadgeProps) {
  const widthAnim = useRef(new Animated.Value(0)).current
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (endsAt == null) {
      setSecondsLeft(0)
      return undefined
    }

    const tick = () => {
      setSecondsLeft(lobbyMoveCooldownSecondsLeft(Math.max(0, endsAt - Date.now())))
    }
    tick()

    const remainingNow = Math.max(0, endsAt - Date.now())
    widthAnim.setValue(durationMs > 0 ? remainingNow / durationMs : 0)
    const animation = Animated.timing(widthAnim, {
      toValue: 0,
      duration: remainingNow,
      useNativeDriver: false,
    })
    animation.start()

    const interval = setInterval(tick, 150)
    return () => {
      clearInterval(interval)
      animation.stop()
    }
  }, [endsAt, durationMs, widthAnim])

  if (endsAt == null || secondsLeft <= 0) return null

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: topOffset }]}>
      <View style={styles.pill}>
        <View style={styles.row}>
          <MaterialCommunityIcons name="timer-sand" size={15} color={LOBBY_ORANGE} />
          <Text style={styles.label} numberOfLines={1}>
            ย้ายตำแหน่งได้อีก <Text style={styles.count}>{secondsLeft}</Text> วิ
          </Text>
        </View>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.fill,
              { width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
            ]}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 60,
  },
  pill: {
    minWidth: 210,
    borderRadius: Radius.pill,
    backgroundColor: COLORS.panel,
    borderWidth: 2,
    borderColor: LOBBY_ORANGE,
    paddingTop: 9,
    paddingHorizontal: 16,
    paddingBottom: 9,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  label: {
    color: COLORS.ink,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  count: {
    color: LOBBY_ORANGE,
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  track: {
    marginTop: 7,
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: COLORS.disabledFill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
    backgroundColor: LOBBY_ORANGE,
  },
})
