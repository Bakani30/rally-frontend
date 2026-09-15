import type { LeaderboardEntry } from '@/lib/leaderboard/leaderboardTypes'
import type { RecentRpRow } from '@/lib/ranks/recentRpService'
import type { TierEvent } from '@/lib/ranks/tierEventTypes'
import type { MyRankPage } from '@/components/rank/MyRankView'
import type { SportRankPageViewProps } from '@/components/rank/SportRankPageView'
import { tierDisplayLabel } from '@/lib/ranks/rankHistoryFormat'
import { nextTierView, placementLock } from '@/lib/ranks/rankProgress'

export function freezeDeep<Value>(value: Value): Value {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child)
    Object.freeze(value)
  }
  return value
}

const rankedRating = freezeDeep({ activity: 'basketball', rating: 1240, tier: 'silver' as const, matches: 14, wins: 9, losses: 5 })
const rankedDecisive = rankedRating.wins + rankedRating.losses
const rankedPlacement = placementLock(rankedDecisive)
const rankedProgress = nextTierView(rankedRating.rating, rankedDecisive)

export const MY_RANK_RANKED_PAGE = freezeDeep<MyRankPage>({
  key: 'basketball',
  label: 'บาสเกตบอล',
  boardLabel: 'BASKETBALL BOARD',
  glyph: '🏀',
  sportColor: '#eb773c',
  sportOnColor: '#161616',
  rating: rankedRating,
  currentTier: rankedPlacement.locked ? null : rankedRating.tier,
  nextTier: rankedPlacement.locked ? null : rankedProgress.nextTier,
})

const lockedRating = freezeDeep({ activity: 'badminton', rating: 820, tier: 'bronze' as const, matches: 4, wins: 2, losses: 2 })
const lockedDecisive = lockedRating.wins + lockedRating.losses
const lockedPlacement = placementLock(lockedDecisive)
const lockedProgress = nextTierView(lockedRating.rating, lockedDecisive)

export const MY_RANK_LOCKED_PAGE = freezeDeep<MyRankPage>({
  ...MY_RANK_RANKED_PAGE,
  key: 'badminton',
  label: 'แบดมินตัน',
  boardLabel: 'BADMINTON BOARD',
  glyph: '🏸',
  sportColor: '#36b7a2',
  rating: lockedRating,
  currentTier: lockedPlacement.locked ? null : lockedRating.tier,
  nextTier: lockedPlacement.locked ? null : lockedProgress.nextTier,
})

const recentRows = freezeDeep<RecentRpRow[]>([
  { id: 'ranking-story-rp-1', rpDelta: 18, result: 'win', title: 'vs Nara', subtitle: '1v1', date: '2026-09-01T12:00:00.000Z' },
])

const tierEvents = freezeDeep<TierEvent[]>([
  { id: 'ranking-story-tier-1', userId: 'story-player', activityType: 'basketball', fromTier: 'bronze', toTier: 'silver', direction: 'promotion', matchId: 'story-match-1', seasonId: 'story-season-1', createdAt: '2026-09-01T12:00:00.000Z' },
])

export const MY_RANK_RANKED_VIEW = freezeDeep<Omit<SportRankPageViewProps, 'pageIndex' | 'pageCount' | 'onFindMatch'>>({
  activity: 'basketball', sportLabel: MY_RANK_RANKED_PAGE.label, sportColor: MY_RANK_RANKED_PAGE.sportColor, sportOnColor: MY_RANK_RANKED_PAGE.sportOnColor,
  boardLabel: MY_RANK_RANKED_PAGE.boardLabel, initials: 'R', avatarUrl: null, placement: rankedPlacement,
  tier: 'silver', tierLabel: 'SILVER', ratingValue: 1240, rankPosition: 8,
  progress: rankedProgress, nextTierLabel: rankedProgress.nextTier ? tierDisplayLabel(rankedProgress.nextTier) : null,
  matches: 14, wins: 9, losses: 5, streakLabel: 'W3', recentRows, recentLoading: false, recentError: false,
  tierEvents, tierEventsLoading: false, tierEventsError: false,
})

export const MY_RANK_LOCKED_VIEW = freezeDeep<Omit<SportRankPageViewProps, 'pageIndex' | 'pageCount' | 'onFindMatch'>>({
  ...MY_RANK_RANKED_VIEW,
  activity: 'badminton', sportLabel: MY_RANK_LOCKED_PAGE.label, sportColor: MY_RANK_LOCKED_PAGE.sportColor, sportOnColor: MY_RANK_LOCKED_PAGE.sportOnColor,
  boardLabel: MY_RANK_LOCKED_PAGE.boardLabel, placement: lockedPlacement,
  tier: 'bronze', tierLabel: 'BRONZE', ratingValue: 820, rankPosition: null,
  progress: lockedProgress, nextTierLabel: lockedProgress.nextTier ? tierDisplayLabel(lockedProgress.nextTier) : null,
  matches: 4, wins: 2, losses: 2, streakLabel: 'L1', tierEvents: [],
})

export const LEADERBOARD_ENTRIES = freezeDeep<LeaderboardEntry[]>([
  { userId: 'story-first', displayName: 'Pim', handle: 'pim', rating: 1680, tier: 'gold', matches: 28, rank: 1, letter: 'P', avatarColor: '#eb773c', avatarUrl: null, delta: 2 },
  { userId: 'story-second', displayName: 'Tee', handle: 'tee', rating: 1550, tier: 'gold', matches: 24, rank: 2, letter: 'T', avatarColor: '#808bc3', avatarUrl: null, delta: -1 },
  { userId: 'story-third', displayName: 'Nara', handle: 'nara', rating: 1460, tier: 'silver', matches: 20, rank: 3, letter: 'N', avatarColor: '#36b7a2', avatarUrl: null, delta: 1 },
  { userId: 'story-player', displayName: 'Rally Player', handle: 'rally', rating: 1240, tier: 'silver', matches: 14, rank: 8, letter: 'R', avatarColor: '#eb773c', avatarUrl: null, delta: 3 },
])
