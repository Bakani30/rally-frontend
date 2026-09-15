import { useEffect } from 'react'
import { Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'

import { PressableScale } from '@/components/motion/PressableScale'
import { TierBadge } from '@/components/ranks/TierBadge'
import type { LeaderboardEntry } from '@/lib/leaderboard/leaderboardTypes'
import { RANK_COLOR, type RankingTheme } from '@/lib/leaderboard/rankingTheme'

import { CountUp } from './CountUp'
import { RankFrame } from './RankFrame'
import { RankingAvatar } from './RankingAvatar'

const ROW_ENTER_DELAY_MS = 420
const ROW_STAGGER_MS = 16
const COUNT_START_DELAY_MS = 560
const COUNT_STAGGER_MS = 8
const MAX_STAGGERED_ROWS = 4

export type RankingRowViewProps = {
  entry: LeaderboardEntry
  isYou?: boolean
  showDelta?: boolean
  index: number
  trigger: number
  theme: RankingTheme
  animatedEntrance?: boolean
  onPress: () => void
}

/** Pure ranking-row presentation; navigation stays in the wrapper/container. */
export function RankingRowView({
  entry,
  isYou = false,
  showDelta = true,
  index,
  trigger,
  theme,
  animatedEntrance = true,
  onPress,
}: RankingRowViewProps) {
  const opacity = useSharedValue(0)
  const tx = useSharedValue(-12)

  useEffect(() => {
    if (!animatedEntrance) {
      opacity.value = 1
      tx.value = 0
      return
    }

    opacity.value = 0
    tx.value = -12
    const delay = ROW_ENTER_DELAY_MS + Math.min(index, MAX_STAGGERED_ROWS) * ROW_STAGGER_MS
    opacity.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.bezier(0.2, 0.8, 0.3, 1) }))
    tx.value = withDelay(delay, withTiming(0, { duration: 420, easing: Easing.bezier(0.2, 0.8, 0.3, 1) }))
  }, [animatedEntrance, trigger, index, opacity, tx])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }],
  }))

  const isPodium = entry.rank <= 3
  const podiumColor = isPodium ? RANK_COLOR[entry.rank as 1 | 2 | 3] : null
  const deltaPositive = (entry.delta ?? 0) >= 0
  const rowBg = isYou ? theme.rowYouBg : theme.rowBg
  const rowBorder = isYou ? theme.rowYouBorder : theme.rowBorder
  const chipBg = isPodium && podiumColor ? theme.rankChipPodiumBg(podiumColor) : theme.rankChipBg
  const chipText = isPodium ? theme.rankChipPodiumText : theme.rankChipText
  const rowShadow = rowGlow(isYou, theme.mode === 'light')
  const tierColor = isPodium && podiumColor ? podiumColor : theme.accent

  return (
    <Animated.View style={[styles.rowWrap, animatedStyle]}>
      <View pointerEvents="none" style={[styles.glow, { backgroundColor: rowBg }, tierAura(tierColor, isPodium)]} />
      <PressableScale
        onPress={onPress}
        style={[
          styles.row,
          { backgroundColor: rowBg, borderColor: rowBorder, borderWidth: isYou ? 2 : 1 },
          rowShadow,
        ]}
      >
        <View pointerEvents="none" style={[styles.tierRail, { backgroundColor: tierColor }]} />
        <View style={[styles.rankChip, isPodium ? styles.rankChipPodium : styles.rankChipPlain, { backgroundColor: chipBg, borderColor: rowBorder }]}>
          <Text style={[styles.rankText, { color: chipText }]}>{String(entry.rank).padStart(2, '0')}</Text>
        </View>
        <RankFrame color={tierColor} size={38}>
          <RankingAvatar
            photoUrl={entry.avatarUrl}
            letter={entry.letter}
            fallbackBg={entry.avatarColor}
            letterColor="#0A0A0F"
            size={38}
            borderColor={theme.mode === 'light' ? '#ffffff' : 'rgba(255,255,255,0.16)'}
            borderWidth={2}
          />
        </RankFrame>
        <View style={styles.mid}>
          <View style={styles.nameRow}>
            <TierBadge tier={entry.tier} size="sm" />
            <Text numberOfLines={1} style={[styles.name, { color: theme.ink }]}>{entry.displayName}</Text>
            {isYou && <View style={[styles.youBadge, { backgroundColor: theme.youBadgeBg }]}><Text style={[styles.youText, { color: theme.youBadgeText }]}>YOU</Text></View>}
          </View>
          {entry.handle && <Text style={[styles.handle, { color: theme.muted }]}>@{entry.handle}</Text>}
        </View>
        <View style={[styles.ratingBox, { backgroundColor: theme.ratingBoxBg, borderColor: theme.ratingBoxBorder, borderWidth: theme.ratingBoxBorder === 'transparent' ? 0 : 1 }]}>
          <CountUp value={entry.rating} animated={false} duration={700} delay={COUNT_START_DELAY_MS + Math.min(index, MAX_STAGGERED_ROWS) * COUNT_STAGGER_MS} trigger={trigger} style={[styles.rating, { color: theme.ratingText }]} />
          {showDelta && entry.delta !== undefined && (
            <View style={styles.deltaRow}>
              <MaterialCommunityIcons name={deltaPositive ? 'menu-up' : 'menu-down'} size={12} color={deltaPositive ? theme.deltaUp : theme.deltaDown} />
              <Text style={[styles.delta, { color: deltaPositive ? theme.deltaUp : theme.deltaDown }]}>{deltaPositive ? '+' : ''}{entry.delta}</Text>
            </View>
          )}
        </View>
      </PressableScale>
    </Animated.View>
  )
}

function rowGlow(isYou: boolean, light: boolean): ViewStyle {
  if (Platform.OS === 'web') return { boxShadow: light && !isYou ? '0 1px 3px rgba(0,0,0,0.05)' : 'none' } as unknown as ViewStyle
  return {}
}

function tierAura(color: string, strong: boolean): ViewStyle {
  const opacity = strong ? 0.34 : 0.2
  const radius = strong ? 10 : 7
  if (Platform.OS === 'web') return { boxShadow: `0 0 ${radius}px ${withAlpha(color, opacity)}` } as unknown as ViewStyle
  return { shadowColor: color, shadowOpacity: opacity, shadowRadius: radius, shadowOffset: { width: 0, height: 0 }, elevation: strong ? 6 : 3 }
}

function withAlpha(hex: string, a: number): string {
  const value = Math.max(0, Math.min(255, Math.round(a * 255)))
  return `${hex}${value.toString(16).padStart(2, '0')}`
}

const styles = StyleSheet.create({
  rowWrap: { position: 'relative' },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 18 },
  tierRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 58, paddingVertical: 8, paddingRight: 12, paddingLeft: 10, borderRadius: 18, overflow: 'hidden' },
  rankChip: { width: 50, height: 42, alignItems: 'center', justifyContent: 'center' },
  rankChipPodium: { borderTopRightRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderRightWidth: 0 },
  rankChipPlain: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderTopRightRadius: 12, borderBottomRightRadius: 12, borderRightWidth: 0 },
  rankText: { fontSize: 16, fontWeight: '900', fontStyle: 'italic', fontVariant: ['tabular-nums'] },
  mid: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '900', flexShrink: 1 },
  handle: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  youBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  youText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  ratingBox: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10, minWidth: 88, alignItems: 'flex-end' },
  rating: { fontSize: 15, fontWeight: '900', fontStyle: 'italic', fontVariant: ['tabular-nums'] },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 1, marginTop: 1 },
  delta: { fontSize: 10, fontWeight: '900', fontVariant: ['tabular-nums'] },
})
