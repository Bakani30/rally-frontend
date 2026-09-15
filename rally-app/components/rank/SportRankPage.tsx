import { useMemo } from 'react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useTierEventHistory } from '@/hooks/useTierEventHistory'
import { useRecentRatingHistory } from '@/hooks/useRecentRatingHistory'
import type { LeaderboardActivity } from '@/lib/leaderboard/leaderboardConfig'
import type { UserActivityRating } from '@/lib/leaderboard/leaderboardTypes'
import { nextTierView, placementLock } from '@/lib/ranks/rankProgress'
import { mapRecentRpRows, streakLabelForActivity } from '@/lib/ranks/recentRpService'
import { tierDisplayLabel } from '@/lib/ranks/rankHistoryFormat'
import { SportRankPageView } from './SportRankPageView'

type SportRankPageProps = {
  activity: LeaderboardActivity
  sportLabel: string
  sportColor: string
  sportOnColor: string
  /** Short board label for the hero (e.g. "บาส BOARD"). */
  boardLabel: string
  rating: UserActivityRating | undefined
  userId: string | undefined
  initials: string
  avatarUrl: string | null | undefined
  /** This page's index in the pager and total page count — drives the dot row. */
  pageIndex: number
  pageCount: number
  onFindMatch: () => void
}

// One sport's scroll content, composing hero → progress → stats → board →
// RP rows → history. Locked sports (placement incomplete) short-circuit to the
// locked hero with a placement-RP peek and no board/history.
export function SportRankPage({
  activity,
  sportLabel,
  sportColor,
  sportOnColor,
  boardLabel,
  rating,
  userId,
  initials,
  avatarUrl,
  pageIndex,
  pageCount,
  onFindMatch,
}: SportRankPageProps) {
  const decisive = (rating?.wins ?? 0) + (rating?.losses ?? 0)
  const lock = placementLock(decisive)

  const leaderboard = useLeaderboard(activity, userId ?? null)
  const tierEvents = useTierEventHistory(activity, lock.locked ? undefined : userId)
  const ratingHistory = useRecentRatingHistory(activity, userId)

  const rankPosition = useMemo(() => {
    if (!userId || !leaderboard.data) return null
    return leaderboard.data.find((entry) => entry.userId === userId)?.rank ?? null
  }, [leaderboard.data, userId])

  const recentRows = useMemo(
    () => mapRecentRpRows(ratingHistory.data, activity),
    [ratingHistory.data, activity],
  )

  const streakLabel = useMemo(
    () => streakLabelForActivity(ratingHistory.data, activity),
    [ratingHistory.data, activity],
  )

  const tier = rating?.tier ?? 'bronze'
  const ratingValue = rating?.rating ?? 0
  const progress = nextTierView(ratingValue, decisive)

  return (
    <SportRankPageView
      activity={activity}
      sportLabel={sportLabel}
      sportColor={sportColor}
      sportOnColor={sportOnColor}
      boardLabel={boardLabel}
      initials={initials}
      avatarUrl={avatarUrl}
      pageIndex={pageIndex}
      pageCount={pageCount}
      placement={lock}
      tier={tier}
      tierLabel={tierDisplayLabel(tier)}
      ratingValue={ratingValue}
      rankPosition={rankPosition}
      progress={progress}
      nextTierLabel={progress.nextTier ? tierDisplayLabel(progress.nextTier) : null}
      matches={rating?.matches ?? 0}
      wins={rating?.wins ?? 0}
      losses={rating?.losses ?? 0}
      streakLabel={streakLabel}
      recentRows={recentRows}
      recentLoading={ratingHistory.isLoading}
      recentError={ratingHistory.isError}
      tierEvents={tierEvents.data ?? []}
      tierEventsLoading={tierEvents.isLoading}
      tierEventsError={tierEvents.isError}
      onFindMatch={onFindMatch}
    />
  )
}
