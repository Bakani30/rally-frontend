import { useCallback, useMemo } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getNotificationsOpenedAt,
  hasUnreadNotificationAction,
  markNotificationsOpened,
} from '@/lib/notifications/notificationInboxState'
import { getNotificationUnreadLatestActionAt } from '@/lib/notifications/notificationUnreadPolicy'
import { getAlphaRefereeDutyState, type AlphaRefereeDutyState } from '@/lib/match/matchRules'
import { useAlphaRefereeDuties } from '@/hooks/useAlphaRefereeDuties'
import { useMyPendingInvites } from '@/hooks/useMyPendingInvites'
import { useNotificationSummary } from '@/hooks/useNotificationSummary'
import { useUnseenTierEvents } from '@/hooks/useTierEvents'

function openedAtQueryKey(userId: string | undefined) {
  return ['notifications', 'opened-at', userId] as const
}

function isActiveRefereeDuty(state: AlphaRefereeDutyState) {
  return state === 'not_ready' ||
    state === 'needs_result' ||
    state === 'live_draft' ||
    state === 'correction_requested' ||
    state === 'waiting_players'
}

export function useNotificationUnread(userId: string | undefined) {
  const pendingInvitesQuery = useMyPendingInvites(userId)
  const refereeDutiesQuery = useAlphaRefereeDuties(userId)
  const summary = useNotificationSummary(userId)
  const { demotions, isLoading: demotionsLoading } = useUnseenTierEvents(userId)

  const openedAtQuery = useQuery({
    queryKey: openedAtQueryKey(userId),
    queryFn: () => getNotificationsOpenedAt(userId!),
    enabled: !!userId,
    staleTime: Infinity,
  })

  const latestActionAt = useMemo(() => getNotificationUnreadLatestActionAt({
    summaryLatestActionAt: summary.latestActionAt,
    pendingInviteSentAts: (pendingInvitesQuery.data ?? []).map((invite) => invite.sentAt),
    refereeDutyActionAts: (refereeDutiesQuery.data?.duties ?? [])
      .filter((duty) => isActiveRefereeDuty(getAlphaRefereeDutyState(duty, userId)))
      .map((duty) => duty.updatedAt || duty.assignedAt),
    demotionActionAts: demotions.map((event) => event.createdAt),
  }), [pendingInvitesQuery.data, refereeDutiesQuery.data?.duties, summary.latestActionAt, demotions, userId])

  return {
    hasUnread: hasUnreadNotificationAction(latestActionAt, openedAtQuery.data ?? null),
    latestActionAt,
    isPending:
      pendingInvitesQuery.isPending ||
      refereeDutiesQuery.isPending ||
      summary.isPending ||
      demotionsLoading ||
      openedAtQuery.isPending,
  }
}

export function useMarkNotificationsOpenedOnFocus(userId: string | undefined) {
  const queryClient = useQueryClient()

  useFocusEffect(
    useCallback(() => {
      if (!userId) return undefined

      let cancelled = false
      const openedAt = new Date().toISOString()
      void markNotificationsOpened(userId, new Date(openedAt)).then((storedAt) => {
        if (cancelled) return
        queryClient.setQueryData(openedAtQueryKey(userId), storedAt)
      })

      return () => {
        cancelled = true
      }
    }, [queryClient, userId]),
  )
}
