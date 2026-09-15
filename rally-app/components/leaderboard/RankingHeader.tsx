import { useEffect, useRef } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { ShineSweep } from '@/components/motion/ShineSweep'
import type { RankingTheme } from '@/lib/leaderboard/rankingTheme'

type Props = {
  theme: RankingTheme
  seasonLabel?: string
  onToggleMode?: () => void
  /** Bumps when the board (re)enters — replays the title/trophy punch + shine. */
  trigger?: number
  /**
   * Top padding override. Defaults to the tab-embedded spacing (58, clears the
   * status bar). Pushed screens that render their own safe-area back-button row
   * pass a small value so the heading sits right under it.
   */
  topPadding?: number
}

export function RankingHeader({
  theme,
  seasonLabel = 'SEASON 1 · TOP 50',
  onToggleMode,
  trigger = 0,
  topPadding = 58,
}: Props) {
  const isDark = theme.mode === 'dark'
  const subtitleColor = theme.mode === 'light' ? theme.muted : theme.accent

  const titleTx = useSharedValue(0)
  const titleOpacity = useSharedValue(1)
  const subTx = useSharedValue(0)
  const subOpacity = useSharedValue(1)
  const trophyScale = useSharedValue(1)
  const playedOnce = useRef(false)

  useEffect(() => {
    // First mount: render at rest. Only punch in on later (re)entrance so the
    // header lands in sync with the podium instead of double-animating.
    if (!playedOnce.current) {
      playedOnce.current = true
      return
    }

    titleTx.value = -18
    titleOpacity.value = 0
    subTx.value = -10
    subOpacity.value = 0
    trophyScale.value = 0.6

    titleTx.value = withSpring(0, { damping: 13, stiffness: 170, mass: 0.7 })
    titleOpacity.value = withTiming(1, { duration: 300 })
    subTx.value = withDelay(120, withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }))
    subOpacity.value = withDelay(120, withTiming(1, { duration: 300 }))
    trophyScale.value = withDelay(60, withSpring(1, { damping: 9, stiffness: 170, mass: 0.6 }))
  }, [trigger, titleTx, titleOpacity, subTx, subOpacity, trophyScale])

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateX: titleTx.value }],
  }))
  const subStyle = useAnimatedStyle(() => ({
    opacity: subOpacity.value,
    transform: [{ translateX: subTx.value }],
  }))
  const trophyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: trophyScale.value }],
  }))

  const shinePlay = trigger > 0

  return (
    <View style={[styles.row, { paddingTop: topPadding }]}>
      <View>
        <Animated.View style={[styles.titleWrap, titleStyle]}>
          <Text style={[styles.title, { color: theme.ink }]}>RANKING</Text>
          <ShineSweep
            trigger={trigger}
            play={shinePlay}
            delayMs={320}
            durationMs={620}
            bandWidth={40}
            color="rgba(255,255,255,0.4)"
          />
        </Animated.View>
        <Animated.Text style={[styles.subtitle, { color: subtitleColor }, subStyle]}>
          {seasonLabel}
        </Animated.Text>
      </View>
      <View style={styles.actions}>
        {onToggleMode && (
          <Pressable
            onPress={onToggleMode}
            hitSlop={10}
            style={({ pressed }) => [
              styles.modeBtn,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F5',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={isDark ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
          >
            <MaterialCommunityIcons
              name={isDark ? 'weather-sunny' : 'weather-night'}
              size={20}
              color={theme.ink}
            />
          </Pressable>
        )}
        <Animated.View
          style={[
            styles.trophy,
            {
              backgroundColor: theme.trophyBg,
              shadowColor: '#161616',
              ...Platform.select({
                web: {
                  boxShadow:
                    theme.mode === 'dark' ? 'none' : '0 8px 18px rgba(22,22,22,0.2)',
                },
                default:
                  theme.mode === 'dark'
                    ? {
                        shadowOpacity: 0,
                        shadowRadius: 0,
                        shadowOffset: { width: 0, height: 0 },
                      }
                    : {
                        shadowOpacity: 0.2,
                        shadowRadius: 14,
                        shadowOffset: { width: 0, height: 7 },
                      },
              }),
            },
            trophyStyle,
          ]}
        >
          {/* Inner clip keeps the trophy's shadow (overflow:hidden on the
              shadowed box would drop it on iOS) while clipping the shine. */}
          <View style={[StyleSheet.absoluteFill, styles.trophyClip]}>
            <ShineSweep
              trigger={trigger}
              play={shinePlay}
              delayMs={260}
              durationMs={560}
              bandWidth={30}
              color="rgba(255,255,255,0.5)"
            />
          </View>
          <MaterialCommunityIcons name="trophy" size={24} color={theme.trophyIcon} />
        </Animated.View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 4,
  },
  titleWrap: {
    // Hug the wordmark so the shine (which clips itself) covers just the text.
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 0,
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginTop: 7,
  },
  trophy: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  trophyClip: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
