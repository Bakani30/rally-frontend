import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'expo-router'

import { MatchesView, type HistoryRowItem, type MatchesViewSection } from '@/components/history/MatchesView'
import { UnifiedFeedRow } from '@/components/history/UnifiedFeedRow'
import { MatchListItem } from '@/components/match/MatchListItem'
import { RunSyncStatusCard } from '@/components/run/RunSyncStatusCard'
import { ScreenBackButton } from '@/components/navigation/ScreenBackButton'
import { SwipeBackView } from '@/components/navigation/SwipeBackView'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useActivityHistory } from '@/hooks/useActivityHistory'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { useMatchPinToggle } from '@/hooks/useMatchPinToggle'
import { useMatchHistoryImpacts } from '@/hooks/useMatchHistoryImpacts'
import { useMyMatches } from '@/hooks/useMyMatches'
import { useNotificationSummary } from '@/hooks/useNotificationSummary'
import type { ActivityHistoryItem } from '@/lib/activities/history/activityHistoryTypes'
import { matchesTabDictionary } from '@/lib/i18n/dictionaries/matchesTab'
import { deriveMatchesScreenState } from '@/lib/history/matchesScreenState'
import { buildUnifiedFeed, filterByCategory, matchesCategory, type FeedCategory } from '@/lib/history/unifiedFeed'
import { ACTIVITY_LABEL } from '@/lib/match/matchConfig'
import type { MyMatch } from '@/types/match'

const PENDING_STATUSES = new Set<MyMatch['status']>(['pending'])
const HISTORY_STATUSES = new Set<MyMatch['status']>(['settled'])
const SECTION_ICONS = { pending: 'bullhorn-outline', live: 'timer-sand', history: 'history' } as const

export default function MatchesScreen() {
  const { user } = useAuth()
  const { data: matches, isPending: matchesPending, error: matchesError } = useMyMatches(user?.id)
  const basketballImpactIds = useMemo(() => (matches ?? []).filter((match) => match.status === 'settled' && match.activity_type === 'basketball').map((match) => match.id), [matches])
  const { data: matchHistoryImpacts, isError: impactsError, isFetching: impactsFetching, refetch: refetchImpacts } = useMatchHistoryImpacts(user?.id, basketballImpactIds)
  const { data: activityHistory, isPending: historyPending, error: historyError } = useActivityHistory(user?.id)
  const { pinnedIds, atPinCap, pinMutationPending, onTogglePin } = useMatchPinToggle(user?.id)
  const { track } = useAnalytics()
  const { t } = useI18n(matchesTabDictionary)
  const notificationBadge = useNotificationSummary(user?.id)
  const [category, setCategory] = useState<FeedCategory>('all')
  const queryClient = useQueryClient()

  useFocusEffect(useCallback(() => {
    if (user?.id) queryClient.invalidateQueries({ queryKey: ['my-matches', user.id] })
  }, [queryClient, user?.id]))
  useEffect(() => { track({ name: 'view_match_history' }) }, [track])

  const matchesById = useMemo(() => new Map((matches ?? []).map((match) => [match.id, match])), [matches])
  const sessionsById = useMemo(() => new Map((activityHistory ?? []).map((session) => [session.id, session] as [string, ActivityHistoryItem])), [activityHistory])
  const unifiedFeed = useMemo(() => buildUnifiedFeed(matches ?? [], activityHistory ?? []), [matches, activityHistory])
  const filteredFeed = useMemo(() => filterByCategory(unifiedFeed, category), [unifiedFeed, category])
  const sections = useMemo<MatchesViewSection[]>(() => {
    const pending: MyMatch[] = []
    const live: MyMatch[] = []
    for (const match of matches ?? []) {
      if (!matchesCategory(match.activity_type, category)) continue
      if (PENDING_STATUSES.has(match.status)) pending.push(match)
      else if (!HISTORY_STATUSES.has(match.status)) live.push(match)
    }
    return [
      { key: 'pending', title: t('sectionLobbyTitle'), emptyIcon: SECTION_ICONS.pending, emptyText: t('sectionLobbyEmpty'), data: pending.map((match) => ({ rowKind: 'raw-match' as const, match })) },
      { key: 'live', title: t('sectionLiveTitle'), emptyIcon: SECTION_ICONS.live, emptyText: t('sectionLiveEmpty'), data: live.map((match) => ({ rowKind: 'raw-match' as const, match })) },
      { key: 'history', title: t('sectionHistoryTitle'), emptyIcon: SECTION_ICONS.history, emptyText: t('sectionHistoryEmpty'), data: filteredFeed.map((feedItem) => ({ rowKind: 'feed' as const, feedItem })) },
    ]
  }, [matches, filteredFeed, category, t])
  const renderRow = useCallback((item: HistoryRowItem) => {
    if (item.rowKind === 'raw-match') return <MatchListItem match={item.match as MyMatch} currentUserId={user?.id} />
    const feedItem = item.feedItem as ReturnType<typeof buildUnifiedFeed>[number]
    const record = feedItem.kind === 'match' ? matchesById.get(feedItem.sourceId) : sessionsById.get(feedItem.sourceId)
    if (!record) return null
    return <UnifiedFeedRow item={feedItem} record={record} currentUserId={user?.id} isPinned={pinnedIds.has(feedItem.sourceId)} atPinCap={atPinCap} pinMutationPending={pinMutationPending} onTogglePin={onTogglePin} impact={feedItem.kind === 'match' ? matchHistoryImpacts.get(feedItem.sourceId) ?? null : null} />
  }, [user?.id, matchesById, sessionsById, pinnedIds, atPinCap, pinMutationPending, onTogglePin, matchHistoryImpacts])
  const pendingLiveCount = (matches ?? []).filter((match) => !HISTORY_STATUSES.has(match.status)).length
  const screenState = deriveMatchesScreenState({ pendingLiveCount, feedCount: unifiedFeed.length, matchesPending, historyPending })
  const pendingCount = sections[0]?.data.length ?? 0
  const liveCount = sections[1]?.data.length ?? 0

  return (
    <SwipeBackView>
      <MatchesView
        screenState={screenState} sections={sections} category={category} onCategoryChange={setCategory}
        pendingCount={pendingCount} liveCount={liveCount} historyCount={unifiedFeed.length}
        labels={{
          title: t('matchesTitle'),
          subtitle: t('subtitleCounts', { pending: pendingCount, live: liveCount, history: unifiedFeed.length }),
          loadMatchesFailed: t('loadMatchesFailed'),
          genericError: t('genericError'),
          historyLoadFailed: t('historyLoadFailed'),
          findFriends: t('findFriends'),
          friendsDashboard: t('friendsDashboard'),
          friendsDashboardPending: t('friendsDashboardPending'),
        }}
        matchesError={matchesError} historyError={historyError} historyPending={historyPending}
        impactsError={impactsError} impactsFetching={impactsFetching} onRetryImpacts={() => { void refetchImpacts() }}
        hasIncomingFriendRequests={notificationBadge.incomingFriendRequestCount > 0}
        renderFriendsAction={(content) => <Link href="/friends" asChild>{content}</Link>}
        renderRow={renderRow}
        sectionEmptyText={(section) => section.key === 'history' && category !== 'all' ? t('categoryHistoryEmpty', { activity: ACTIVITY_LABEL[category] }) : category !== 'all' && section.key !== 'history' ? t('categoryMatchEmpty', { activity: ACTIVITY_LABEL[category] }) : section.emptyText}
        renderBackControl={(style) => <ScreenBackButton style={style} />}
        syncStatusContent={<RunSyncStatusCard />}
      />
    </SwipeBackView>
  )
}
