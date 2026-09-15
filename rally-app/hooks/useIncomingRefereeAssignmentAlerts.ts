import { useEffect, useRef } from 'react'
import { Alert, AppState } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { alphaRefereeDutiesQueryKey } from '@/hooks/useAlphaRefereeDuties'
import { notificationSummaryQueryKey } from '@/lib/notifications/notificationSummary'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

type RefereeAssignmentRealtimeRow = {
  id?: string
  match_id?: string
  referee_user_id?: string
  status?: string
}

// Global fast path for referee invites: the push notification covers the
// background case, but in-app the referee previously saw nothing until they
// opened /referee. Subscribe to their own assignment rows so the duty list
// refreshes instantly and a prompt offers to jump into the room.
export function useIncomingRefereeAssignmentAlerts(userId: string | undefined) {
  const queryClient = useQueryClient()
  const promptedAssignmentsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!userId) return

    const topic = `incoming-referee-assignment-alerts:${userId}`
    supabase
      .getChannels()
      .filter((channel) => channel.topic === `realtime:${topic}`)
      .forEach((channel) => void supabase.removeChannel(channel))

    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_referee_assignments', filter: `referee_user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as RefereeAssignmentRealtimeRow | null

          queryClient.invalidateQueries({ queryKey: alphaRefereeDutiesQueryKey(userId) })
          queryClient.invalidateQueries({ queryKey: notificationSummaryQueryKey(userId) })

          if (!row?.id || !row.match_id || row.status !== 'invited') return
          if (promptedAssignmentsRef.current.has(row.id)) return
          promptedAssignmentsRef.current.add(row.id)
          // Backgrounded app: the referee_assigned push banner already covers it.
          if (AppState.currentState !== 'active') return

          const matchId = row.match_id
          Alert.alert(
            'คุณได้รับเชิญเป็นกรรมการ',
            'เปิดห้องเพื่อรับหรือปฏิเสธหน้าที่',
            [
              { text: 'ภายหลัง', style: 'cancel' },
              {
                text: 'เปิดห้อง',
                onPress: () => guardedRouter.push(`/match/${matchId}` as never, {
                  actionKey: `referee-assigned:${row.id}`,
                }),
              },
            ],
          )
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient, userId])
}
