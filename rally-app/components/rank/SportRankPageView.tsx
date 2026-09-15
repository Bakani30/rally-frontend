import { StyleSheet, View } from 'react-native'

import { RallyText } from '@/components/ui/RallyText'
import { Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { LeaderboardActivity } from '@/lib/leaderboard/leaderboardConfig'
import type { Tier } from '@/lib/leaderboard/tierRules'
import type { NextTierView, PlacementLock } from '@/lib/ranks/rankProgress'
import type { RecentRpRow } from '@/lib/ranks/recentRpService'
import type { TierEvent } from '@/lib/ranks/tierEventTypes'

import { LockedRankHero } from './LockedRankHero'
import { RankHistoryTimeline } from './RankHistoryTimeline'
import { RankProgressCard } from './RankProgressCard'
import { RecentRpList } from './RecentRpList'
import { SportRankHero } from './SportRankHero'
import { SportStatsStrip } from './SportStatsStrip'

export type SportRankPageViewProps = {
  activity: LeaderboardActivity
  sportLabel: string
  sportColor: string
  sportOnColor: string
  boardLabel: string
  initials: string
  avatarUrl: string | null | undefined
  pageIndex: number
  pageCount: number
  placement: PlacementLock
  tier: Tier
  tierLabel: string
  ratingValue: number
  rankPosition: number | null
  progress: NextTierView
  nextTierLabel: string | null
  matches: number
  wins: number
  losses: number
  streakLabel: string | null
  recentRows: RecentRpRow[]
  recentLoading: boolean
  recentError: boolean
  tierEvents: TierEvent[]
  tierEventsLoading: boolean
  tierEventsError: boolean
  onFindMatch: () => void
}

/** Presentation-only composition for one sport's My Rank page. */
export function SportRankPageView({
  sportLabel,
  sportColor,
  sportOnColor,
  boardLabel,
  initials,
  avatarUrl,
  pageIndex,
  pageCount,
  placement,
  tier,
  tierLabel,
  ratingValue,
  rankPosition,
  progress,
  nextTierLabel,
  matches,
  wins,
  losses,
  streakLabel,
  recentRows,
  recentLoading,
  recentError,
  tierEvents,
  tierEventsLoading,
  tierEventsError,
  onFindMatch,
}: SportRankPageViewProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const dots = (
    <View style={styles.dots}>
      {Array.from({ length: pageCount }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === pageIndex ? styles.dotActive : null,
            { backgroundColor: index === pageIndex ? sportColor : theme.mutedSoft },
          ]}
        />
      ))}
    </View>
  )

  if (placement.locked) {
    return (
      <View style={styles.page}>
        <LockedRankHero
          played={placement.played}
          floor={placement.floor}
          remaining={placement.remaining}
          sportLabel={sportLabel}
          initials={initials}
          avatarUrl={avatarUrl}
          sportColor={sportColor}
          sportOnColor={sportOnColor}
          onFindMatch={onFindMatch}
        />
        {dots}
        <RecentRpList
          rows={recentRows}
          isLoading={recentLoading}
          isError={recentError}
          title="RP จาก placement"
          footerNote="ประวัติแรงค์จะเริ่มบันทึกเมื่อปลดล็อค (ยังไม่มี tier event)"
        />
      </View>
    )
  }

  return (
    <View style={styles.page}>
      <SportRankHero
        tier={tier}
        tierLabel={tierLabel}
        sportLabel={sportLabel}
        rating={ratingValue}
        rankPosition={rankPosition}
        boardLabel={boardLabel}
        initials={initials}
        avatarUrl={avatarUrl}
      />
      {dots}
      {progress.nextTier && nextTierLabel ? (
        <RankProgressCard progress={progress} currentTier={tier} nextTierLabel={nextTierLabel} />
      ) : (
        <RallyText lang="th" style={styles.topTier}>{`ถึงแรงค์สูงสุด · ${sportLabel}`}</RallyText>
      )}
      <SportStatsStrip matches={matches} wins={wins} losses={losses} streakLabel={streakLabel} />
      <RecentRpList rows={recentRows} isLoading={recentLoading} isError={recentError} />
      <RankHistoryTimeline events={tierEvents} isLoading={tierEventsLoading} isError={tierEventsError} />
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    page: { gap: Spacing.md, paddingBottom: Spacing.xl },
    dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 },
    dot: { width: 7, height: 7, borderRadius: 4 },
    dotActive: { width: 22, borderRadius: 999 },
    topTier: { color: theme.muted, fontSize: 12, textAlign: 'center', paddingVertical: Spacing.sm },
  })
}
