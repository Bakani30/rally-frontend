import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  FlatList,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { LeaderboardButton } from '@/components/rank/LeaderboardButton'
import { RankLadderSheet } from '@/components/rank/RankLadderSheet'
import { RallyText } from '@/components/ui/RallyText'
import { Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { LeaderboardActivity } from '@/lib/leaderboard/leaderboardConfig'
import type { UserActivityRating } from '@/lib/leaderboard/leaderboardTypes'
import type { Tier } from '@/lib/leaderboard/tierRules'

export type MyRankPage = {
  key: LeaderboardActivity
  label: string
  boardLabel: string
  glyph: string
  sportColor: string
  sportOnColor: string
  rating: UserActivityRating | undefined
  currentTier: Tier | null
  nextTier: Tier | null
}

export type MyRankViewProps = {
  pages: readonly MyRankPage[]
  onActivityViewed: (activity: LeaderboardActivity) => void
  onOpenLeaderboard: (activity: LeaderboardActivity) => void
  onFindMatch: (activity: LeaderboardActivity) => void
  ladderAccessibilityLabel: string
  renderSportPage: (page: MyRankPage & { onFindMatch: () => void }, index: number, count: number) => ReactNode
}

/** Presentation-only My Rank pager; data and navigation authority stay in MyRankPager. */
export function MyRankView({
  pages,
  onActivityViewed,
  onOpenLeaderboard,
  onFindMatch,
  ladderAccessibilityLabel,
  renderSportPage,
}: MyRankViewProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const [pageIndex, setPageIndex] = useState(0)
  const [ladderOpen, setLadderOpen] = useState(false)
  const listRef = useRef<FlatList<MyRankPage>>(null)
  const activePage = pages[pageIndex] ?? pages[0]
  const activeActivity = activePage?.key

  useEffect(() => {
    if (activeActivity) onActivityViewed(activeActivity)
  }, [activeActivity, onActivityViewed])

  const onScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width))
      setPageIndex((current) => (current === next ? current : next))
    },
    [width],
  )

  if (!activePage) return null

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <RallyText variant="head" lang="en" style={styles.headerTitle}>MY RANK</RallyText>
        <View style={styles.headerActions}>
          <LeaderboardButton compact onPress={() => onOpenLeaderboard(activePage.key)} />
          <PressableScale
            style={styles.ladderBtn}
            onPress={() => setLadderOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={ladderAccessibilityLabel}
          >
            <MaterialCommunityIcons name="format-list-numbered" size={18} color={theme.amber} />
          </PressableScale>
        </View>
      </View>
      <FlatList
        ref={listRef}
        data={pages}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item, index }) => (
          <ScrollView
            style={{ width }}
            contentContainerStyle={styles.pageScroll}
            showsVerticalScrollIndicator={false}
          >
            {renderSportPage({ ...item, onFindMatch: () => onFindMatch(item.key) }, index, pages.length)}
          </ScrollView>
        )}
      />
      <RankLadderSheet
        visible={ladderOpen}
        currentTier={activePage.currentTier}
        nextTier={activePage.nextTier}
        sportLabel={activePage.label}
        onClose={() => setLadderOpen(false)}
      />
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.sm,
    },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    headerTitle: { color: theme.ink, fontSize: 18, fontWeight: '900', fontStyle: 'italic', letterSpacing: 0.4 },
    ladderBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.lineStrong,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageScroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 96 },
  })
}
