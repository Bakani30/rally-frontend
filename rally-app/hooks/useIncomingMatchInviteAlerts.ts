import { useEffect, useMemo, useRef } from 'react'
import { AppState } from 'react-native'
import { useSegments } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getLatestNotificationBanner } from '@/lib/notifications/notificationLiveSurfaceService'
import { resolveAttentionDecision, routeFromSegments } from '@/lib/notifications/attentionPolicy'
import { notificationSummaryQueryKey } from '@/lib/notifications/notificationSummary'
import { useNotificationBannerStore } from '@/stores/notificationBannerStore'

type MatchInviteRealtimePayload = {
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'
}

export function useIncomingMatchInviteAlerts(userId: string | undefined) {
  const queryClient = useQueryClient()
  const segments = useSegments()
  const currentRoute = useMemo(() => routeFromSegments(segments as string[]), [segments])
  const currentRouteRef = useRef(currentRoute)

  useEffect(() => {
    currentRouteRef.current = currentRoute
  }, [currentRoute])

  useEffect(() => {
    if (!userId) return

    const topic = `incoming-match-invite-alerts:${userId}`
    const showBanner = useNotificationBannerStore.getState().showBanner

    supabase
      .getChannels()
      .filter((channel) => channel.topic === `realtime:${topic}`)
      .forEach((channel) => void supabase.removeChannel(channel))

    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_invites', filter: `invitee_user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as MatchInviteRealtimePayload | null
          const oldRow = payload.old as Partial<MatchInviteRealtimePayload> | null
          const becamePending = row?.status === 'pending' && oldRow?.status !== 'pending'

          queryClient.invalidateQueries({ queryKey: ['my-pending-invites', userId] })
          queryClient.invalidateQueries({ queryKey: ['my-matches', userId] })
          queryClient.invalidateQueries({ queryKey: notificationSummaryQueryKey(userId) })

          if (!becamePending) return
          void getLatestNotificationBanner('match_invited')
            .then((banner) => {
              if (!banner) return
              const decision = resolveAttentionDecision({
                type: 'match_invited',
                route: banner.route,
                matchId: banner.matchId,
                inviteId: banner.inviteId,
              }, {
                appState: AppState.currentState,
                currentRoute: currentRouteRef.current,
              })
              if (decision.surface !== 'rally_island') return
              showBanner(banner, {
                priority: decision.priority,
                dedupeKey: decision.dedupeKey,
                ttlMs: decision.ttlMs,
                targetRoute: decision.targetRoute,
              })
            })
            .catch((error) => {
              console.warn('Failed to load match invite live surface', error)
            })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient, userId])
}
