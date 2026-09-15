import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { RallyMascot } from '@/components/brand/RallyMascot'
import { useScreenInsets } from '@/components/layout/useScreenInsets'
import { NotificationCategoryTabs, type NotificationCategory } from '@/components/notifications/NotificationCategoryTabs'
import { NotificationEventList } from '@/components/notifications/NotificationEventList'
import { NotificationRow, type NotificationRowData } from '@/components/notifications/NotificationRow'
import { ScreenBackButton } from '@/components/navigation/ScreenBackButton'
import { Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useMyMatches } from '@/hooks/useMyMatches'
import { useMyPendingInvites } from '@/hooks/useMyPendingInvites'
import { useRespondInvite } from '@/hooks/useRespondInvite'
import { useAuth } from '@/hooks/useAuth'
import { useAutoDeclinePendingInvites } from '@/hooks/useAutoDeclinePendingInvites'
import { useAlphaRefereeDuties } from '@/hooks/useAlphaRefereeDuties'
import { useMarkNotificationsOpenedOnFocus } from '@/hooks/useNotificationUnread'
import { useUnseenTierEvents } from '@/hooks/useTierEvents'
import { getAlphaRefereeDutyState, type AlphaRefereeDutyState } from '@/lib/match/matchRules'
import { getPendingTeamResultReviewAction } from '@/lib/match/teamResultReviewAction'
import type { AlphaRefereeDuty, MyMatch, MyPendingInvite } from '@/types/match'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

/**
 * Notifications stream as a single virtualised FlashList over a discriminated
 * row union (header / submitted / team_review / referee / invite). Row visuals
 * live in NotificationRow; copy mapping in lib/notifications/notificationCopy.
 * No row holds local state, so FlashList cell recycling stays clean
 * (see project_flashlist_rules.md).
 */

function isActiveRefereeDuty(state: AlphaRefereeDutyState) {
  return (
    state === 'not_ready' ||
    state === 'needs_result' ||
    state === 'live_draft' ||
    state === 'correction_requested' ||
    state === 'waiting_players'
  )
}
export default function NotificationsScreen() {
  const { user } = useAuth()
  const theme = useSportTheme()
  const insets = useSafeAreaInsets()
  const { paddingBottom } = useScreenInsets({ edges: ['bottom'], bottomPad: 48 })
  const styles = useMemo(() => createStyles(theme), [theme])
  const [category, setCategory] = useState<NotificationCategory>('notifications')
  const matchesQuery = useMyMatches(user?.id)
  const invitesQuery = useMyPendingInvites(user?.id)
  const refereeQuery = useAlphaRefereeDuties(user?.id)
  const respond = useRespondInvite()
  useAutoDeclinePendingInvites(user?.id, invitesQuery.data)
  useMarkNotificationsOpenedOnFocus(user?.id)
  const { demotions, markSeen: markTierEventsSeen } = useUnseenTierEvents(user?.id)

  const matches = matchesQuery.data
  const submitted = useMemo(
    () => matches?.filter((m) => m.status === 'submitted' || m.status === 'disputed') ?? [],
    [matches],
  )
  const teamReviews = useMemo(
    () =>
      user?.id
        ? (matches ?? [])
            .map((match) => {
              const action = getPendingTeamResultReviewAction(match, user.id)
              return action ? { match, scoreLabel: action.scoreLabel } : null
            })
            .filter((row): row is { match: MyMatch; scoreLabel: string } => row !== null)
        : [],
    [matches, user?.id],
  )
  const invites = useMemo(() => invitesQuery.data ?? [], [invitesQuery.data])
  const refereeDuties = useMemo(
    () =>
      user?.id
        ? (refereeQuery.data?.duties ?? [])
            .map((duty): { duty: AlphaRefereeDuty; state: AlphaRefereeDutyState } | null => {
              const state = getAlphaRefereeDutyState(duty, user.id)
              return isActiveRefereeDuty(state) ? { duty, state } : null
            })
            .filter((row): row is { duty: AlphaRefereeDuty; state: AlphaRefereeDutyState } => row !== null)
        : [],
    [refereeQuery.data?.duties, user?.id],
  )

  // Demotion tier_events surface as a quiet notice here (never a push, never
  // the full-screen PromotionMoment — see tierEventTriage.ts). Once this
  // screen has rendered them, mark them seen so they don't reappear.
  const demotionIds = useMemo(() => demotions.map((e) => e.id), [demotions])
  useEffect(() => {
    if (demotionIds.length > 0) markTierEventsSeen(demotionIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demotionIds.join(',')])

  const rows = useMemo<NotificationRowData[]>(() => {
    const out: NotificationRowData[] = []
    if (teamReviews.length > 0 || submitted.length > 0) {
      out.push({
        kind: 'header',
        title: 'ต้องทำตอนนี้',
        count: teamReviews.length + submitted.length,
        tone: 'attention',
      })
      for (const review of teamReviews) {
        out.push({ kind: 'team_review', match: review.match, scoreLabel: review.scoreLabel })
      }
      for (const match of submitted) out.push({ kind: 'submitted', match })
    }
    if (refereeDuties.length > 0) {
      out.push({ kind: 'header', title: 'คำเชิญกรรมการ', count: refereeDuties.length })
      for (const { duty, state } of refereeDuties) out.push({ kind: 'referee', duty, state })
    }
    if (invites.length > 0) {
      out.push({ kind: 'header', title: 'รอคุณตอบ', count: invites.length, tone: 'attention' })
      for (const invite of invites) out.push({ kind: 'invite', invite })
    }
    if (demotions.length > 0) {
      out.push({ kind: 'header', title: 'อัปเดตอันดับ', count: demotions.length })
      for (const event of demotions) out.push({ kind: 'demotion', event })
    }
    return out
  }, [submitted, teamReviews, refereeDuties, invites, demotions])

  const onAccept = useCallback(
    (invite: MyPendingInvite) => {
      if (respond.isPending) return
      respond.mutate(
        { inviteId: invite.inviteId, action: 'accept', stake: invite.match.stake },
        {
          onSuccess: () =>
            guardedRouter.replace(`/match/${invite.matchId}`, {
              actionKey: `notifications:accept:${invite.inviteId}`,
            }),
          onError: (err) => Alert.alert('เข้าแมตช์ไม่สำเร็จ', (err as Error).message),
        },
      )
    },
    [respond],
  )

  const onDecline = useCallback(
    (invite: MyPendingInvite) => {
      if (respond.isPending) return
      respond.mutate(
        { inviteId: invite.inviteId, action: 'decline' },
        { onError: (err) => Alert.alert('ปฏิเสธไม่สำเร็จ', (err as Error).message) },
      )
    },
    [respond],
  )

  const onOpenMatch = useCallback((matchId: string, actionKey: string) => {
    guardedRouter.push(`/match/${matchId}`, { actionKey })
  }, [])

  const onOpenReferee = useCallback((assignmentId: string) => {
    guardedRouter.push('/referee', { actionKey: `notifications:referee:${assignmentId}` })
  }, [])

  const keyExtractor = useCallback((row: NotificationRowData, index: number) => {
    if (row.kind === 'header') return `h-${row.title}-${index}`
    if (row.kind === 'submitted') return `m-${row.match.id}`
    if (row.kind === 'team_review') return `tr-${row.match.id}`
    if (row.kind === 'referee') return `r-${row.duty.assignmentId}`
    if (row.kind === 'demotion') return `d-${row.event.id}`
    return `i-${row.invite.inviteId}`
  }, [])

  const getItemType = useCallback((row: NotificationRowData) => row.kind, [])

  const respondPending = respond.isPending
  const renderRow = useCallback<ListRenderItem<NotificationRowData>>(
    ({ item }) => (
      <NotificationRow
        row={item}
        respondPending={respondPending}
        onOpenMatch={onOpenMatch}
        onOpenReferee={onOpenReferee}
        onAccept={onAccept}
        onDecline={onDecline}
      />
    ),
    [respondPending, onOpenMatch, onOpenReferee, onAccept, onDecline],
  )

  const refreshing =
    matchesQuery.isRefetching || invitesQuery.isRefetching || refereeQuery.isRefetching
  const onRefresh = useCallback(() => {
    void matchesQuery.refetch()
    void invitesQuery.refetch()
    void refereeQuery.refetch()
  }, [matchesQuery, invitesQuery, refereeQuery])

  return (
    <View style={styles.root}>
      <View style={[styles.topControls, { paddingTop: insets.top + Spacing.sm }]}>
        <ScreenBackButton
          onPress={() => guardedRouter.replace('/(tabs)', { actionKey: 'notifications:exit-home' })}
        />
        <NotificationCategoryTabs category={category} onChange={setCategory} style={styles.tabsTop} />
      </View>
      {category === 'notifications' ? (
        <FlashList
          data={rows}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          renderItem={renderRow}
          ListEmptyComponent={
            <View style={styles.empty}>
              <RallyMascot size={92} />
              <Text style={styles.emptyTitle}>ยังไม่มีงานค้าง</Text>
              <Text style={styles.emptyHint}>คำเชิญและผลแมตช์จะมาโผล่ที่นี่</Text>
            </View>
          }
          ItemSeparatorComponent={ItemSeparator}
          contentContainerStyle={[styles.container, { paddingBottom }]}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      ) : (
        <ScrollView
          style={styles.eventsScroll}
          contentContainerStyle={[styles.eventsContainer, { paddingBottom }]}
          showsVerticalScrollIndicator={false}
        >
          <NotificationEventList />
        </ScrollView>
      )}
    </View>
  )
}

const ItemSeparator = () => <View style={{ height: Spacing.sm }} />

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg },
    topControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.md,
    },
    tabsTop: { flex: 1, marginHorizontal: 0, marginBottom: 0 },
    container: { paddingHorizontal: Spacing.lg },
    eventsScroll: { flex: 1 },
    eventsContainer: { paddingHorizontal: Spacing.lg },
    empty: {
      alignItems: 'center',
      gap: 6,
      paddingVertical: Spacing.xxl,
    },
    emptyTitle: { fontSize: 16, fontWeight: '900', color: theme.inkSoft, marginTop: Spacing.sm },
    emptyHint: { fontSize: 13, color: theme.mutedSoft },
  })
}
