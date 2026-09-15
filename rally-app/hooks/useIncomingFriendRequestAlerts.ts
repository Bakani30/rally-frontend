import { useEffect, useMemo, useRef } from 'react'
import { AppState } from 'react-native'
import { useSegments } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getLatestNotificationBanner } from '@/lib/notifications/notificationLiveSurfaceService'
import { resolveAttentionDecision, routeFromSegments } from '@/lib/notifications/attentionPolicy'
import { notificationSummaryQueryKey } from '@/lib/notifications/notificationSummary'
import { useNotificationBannerStore } from '@/stores/notificationBannerStore'

type FriendRequestRealtimePayload = {
  owner_id: string
  friend_id: string
  status: 'pending' | 'accepted' | 'declined'
  requested_at: string
}

export function useIncomingFriendRequestAlerts(userId: string | undefined) {
  const queryClient = useQueryClient()
  const segments = useSegments()
  const currentRoute = useMemo(() => routeFromSegments(segments as string[]), [segments])
  const currentRouteRef = useRef(currentRoute)

  useEffect(() => {
    currentRouteRef.current = currentRoute
  }, [currentRoute])

  useEffect(() => {
    if (!userId) return

    const topic = `incoming-friend-request-alerts:${userId}`
    const showBanner = useNotificationBannerStore.getState().showBanner

    supabase
      .getChannels()
      .filter((channel) => channel.topic === `realtime:${topic}`)
      .forEach((channel) => void supabase.removeChannel(channel))

    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_friends', filter: `friend_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as FriendRequestRealtimePayload | null
          const oldRow = payload.old as Partial<FriendRequestRealtimePayload> | null
          const becamePending = row?.status === 'pending' && oldRow?.status !== 'pending'

          queryClient.invalidateQueries({ queryKey: ['friend-requests', 'incoming'] })
          queryClient.invalidateQueries({ queryKey: notificationSummaryQueryKey(userId) })
          if (!becamePending) return

          void getLatestNotificationBanner('friend_request')
            .then((banner) => {
              if (!banner) return
              const decision = resolveAttentionDecision({
                type: 'friend_request',
                route: banner.route,
                requesterId: banner.requesterId,
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
              console.warn('Failed to load friend request live surface', error)
            })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient, userId])
}
