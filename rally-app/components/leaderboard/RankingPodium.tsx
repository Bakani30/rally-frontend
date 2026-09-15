import { useCallback, useState } from 'react'
import { Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import { Confetti } from './Confetti'
import { PodiumColumn } from './PodiumColumn'
import { PodiumSpotlights } from './PodiumSpotlights'
import type { LeaderboardEntry } from '@/lib/leaderboard/leaderboardTypes'
import type { RankingTheme } from '@/lib/leaderboard/rankingTheme'

const HEIGHTS: Record<1 | 2 | 3, number> = { 1: 194, 2: 148, 3: 124 }
// Wait for the bar-grow + content fade to mostly settle before bursting.
const CONFETTI_DELAY_MS = 850
const CONFETTI_COUNT = Platform.OS === 'android' ? 14 : 24

type Props = {
  entries: LeaderboardEntry[]
  trigger: number
  theme: RankingTheme
  animated?: boolean
  playConfetti?: boolean
  onRendered?: () => void
}

// Render podium in 2-1-3 visual order; tallest in the middle.
export function RankingPodium({
  entries,
  trigger,
  theme,
  animated = true,
  playConfetti = true,
  onRendered,
}: Props) {
  const top1 = entries[0]
  const top2 = entries[1]
  const top3 = entries[2]
  const [size, setSize] = useState({ width: 0, height: 0 })
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = {
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    }
    setSize((current) =>
      current.width === next.width && current.height === next.height ? current : next,
    )
    onRendered?.()
  }, [onRendered])

  if (!top1 && !top2 && !top3) return null

  return (
    <View style={styles.row} onLayout={onLayout}>
      {size.width > 0 && (
        <PodiumSpotlights width={size.width} height={size.height} mode={theme.mode} />
      )}
      {top1 && playConfetti && size.width > 0 && (
        <Confetti
          trigger={trigger}
          width={size.width}
          height={size.height}
          count={CONFETTI_COUNT}
          delay={CONFETTI_DELAY_MS}
        />
      )}
      <View style={styles.slot}>
        {top2 && (
          <PodiumColumn
            entry={top2}
            position={2}
            order={0}
            height={HEIGHTS[2]}
            width={106}
            trigger={trigger}
            theme={theme}
            animated={animated}
          />
        )}
      </View>
      <View style={styles.slotCenter}>
        {top1 && (
          <PodiumColumn
            entry={top1}
            position={1}
            order={1}
            height={HEIGHTS[1]}
            width={124}
            trigger={trigger}
            theme={theme}
            animated={animated}
          />
        )}
      </View>
      <View style={styles.slot}>
        {top3 && (
          <PodiumColumn
            entry={top3}
            position={3}
            order={2}
            height={HEIGHTS[3]}
            width={106}
            trigger={trigger}
            theme={theme}
            animated={animated}
          />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 12,
    height: 234,
    marginTop: 18,
    paddingHorizontal: 22,
    paddingTop: 0,
  },
  slot: { alignItems: 'center', justifyContent: 'flex-end' },
  slotCenter: { alignItems: 'center', justifyContent: 'flex-end' },
})
