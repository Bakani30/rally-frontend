import { useCallback, useMemo } from 'react'
import { router } from 'expo-router'
import { SportRankPage } from '@/components/rank/SportRankPage'
import { MyRankView, type MyRankPage } from '@/components/rank/MyRankView'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { useProfile } from '@/hooks/useProfile'
import { useUserActivityRatings } from '@/hooks/useUserActivityRatings'
import { rankTabDictionary } from '@/lib/i18n/dictionaries/rankTab'
import type { LeaderboardActivity } from '@/lib/leaderboard/leaderboardConfig'
import { nextTierView, placementLock } from '@/lib/ranks/rankProgress'
import { getSportReelItem } from '@/lib/match/sportReel'

type SportMetadata = Pick<MyRankPage, 'key' | 'label' | 'boardLabel' | 'glyph'>

// Shared "My Rank" swipeable pager — the user's own per-sport rank identity.
// Served both from the Ranking tab (first screen) and the stacked /rank route
// (Profile entry). The stacked Stack.Screen header (title + ladder button) only
// renders when this sits under the root Stack; under the Tabs navigator the tab
// header is hidden, so the header config is a no-op there.
export function MyRankPager() {
  const { user } = useAuth()
  const userId = user?.id
  const { track } = useAnalytics()
  const { t } = useI18n(rankTabDictionary)

  const { data: profile } = useProfile(userId)
  const { data: ratings } = useUserActivityRatings(userId)

  // Per-sport page metadata (order fixed: basketball → badminton → running,
  // matching the mock). Board label + dot glyph derived here so the pager and
  // hero stay in sync.
  const sports = useMemo<SportMetadata[]>(() => [
    { key: 'basketball', label: t('basketballLabel'), boardLabel: t('basketballBoardLabel'), glyph: '🏀' },
    { key: 'badminton', label: t('badmintonLabel'), boardLabel: t('badmintonBoardLabel'), glyph: '🏸' },
    { key: 'running', label: t('runningLabel'), boardLabel: t('runningBoardLabel'), glyph: '🏃' },
  ], [t])

  const initials = (profile?.display_name ?? user?.email ?? '?')[0]?.toUpperCase() ?? '?'
  const avatarUrl = profile?.avatar_url ?? null

  const ratingByActivity = useMemo(
    () => new Map((ratings ?? []).map((r) => [r.activity, r])),
    [ratings],
  )

  const pages = useMemo<MyRankPage[]>(() => sports.map((sport) => {
    const rating = ratingByActivity.get(sport.key)
    const decisive = (rating?.wins ?? 0) + (rating?.losses ?? 0)
    const lock = placementLock(decisive)
    return {
      ...sport,
      sportColor: getSportReelItem(sport.key).accent,
      sportOnColor: getSportReelItem(sport.key).onAccent,
      rating,
      currentTier: lock.locked ? null : rating?.tier ?? 'bronze',
      nextTier: lock.locked ? null : nextTierView(rating?.rating ?? 0, decisive).nextTier,
    }
  }), [ratingByActivity, sports])

  const viewActivity = useCallback((activity: LeaderboardActivity) => {
    track({ name: 'view_leaderboard', properties: { activity } })
  }, [track])

  const openLeaderboard = useCallback((activity: LeaderboardActivity) => {
    track({ name: 'view_leaderboard', properties: { activity } })
    router.push({ pathname: '/leaderboard', params: { activity } })
  }, [track])

  const findMatch = useCallback((activity: LeaderboardActivity) => {
    router.push({ pathname: '/match/new', params: { activity } })
  }, [])

  return (
    <MyRankView
      pages={pages}
      onActivityViewed={viewActivity}
      onOpenLeaderboard={openLeaderboard}
      onFindMatch={findMatch}
      ladderAccessibilityLabel={t('viewAllRanks')}
      renderSportPage={(page, index, count) => (
        <SportRankPage
          activity={page.key}
          sportLabel={page.label}
          sportColor={page.sportColor}
          sportOnColor={page.sportOnColor}
          boardLabel={page.boardLabel}
          rating={page.rating}
          userId={userId}
          initials={initials}
          avatarUrl={avatarUrl}
          pageIndex={index}
          pageCount={count}
          onFindMatch={page.onFindMatch}
        />
      )}
    />
  )
}
