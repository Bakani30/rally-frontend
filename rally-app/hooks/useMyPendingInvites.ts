import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getMyPendingInvites } from '@/lib/match/matchService'
import { supabase } from '@/lib/supabase'
import type { MyPendingInvite, Side, StakeCurrency } from '@/types/match'

/**
 * Realtime row payload shape. Postgres-changes delivers a flat record of
 * the row that changed, no joins. We patch the cache from the payload
 * directly when possible so the user doesn't wait on an HTTP refetch
 * round trip — the invite card slides in within the websocket RTT.
 */
type InviteRealtimePayload = {
  id: string
  match_id: string
  invitee_user_id: string
  inviter_user_id: string | null
  side: Side
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'
  sent_at: string
  kind?: 'open' | 'challenge' | 'rematch'
}

export function useMyPendingInvites(userId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    const topic = `my-pending-invites:${userId}`
    const queryKey = ['my-pending-invites', userId] as const

    supabase
      .getChannels()
      .filter((ch) => ch.topic === `realtime:${topic}`)
      .forEach((ch) => void supabase.removeChannel(ch))

    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_invites', filter: `invitee_user_id=eq.${userId}` },
        (payload) => {
          // Fast path: patch the cache from the realtime row directly.
          // Avoids an HTTP refetch and renders the card on the websocket
          // RTT (~50–150 ms in Asia) instead of after the round trip
          // (~300–600 ms).
          //
          // Inviter display name + match metadata are not in the
          // payload, so we still kick off a refetch in the background to
          // fill those in. The card has already appeared by then.
          if (payload.eventType === 'INSERT') {
            const row = payload.new as InviteRealtimePayload
            if (row.status === 'pending') {
              queryClient.setQueryData<MyPendingInvite[]>(queryKey, (prev) => {
                const existing = prev ?? []
                if (existing.some((inv) => inv.inviteId === row.id)) return existing
                const skeleton: MyPendingInvite = {
                  inviteId: row.id,
                  matchId: row.match_id,
                  side: row.side,
                  sentAt: row.sent_at,
                  kind: row.kind ?? 'open',
                  match: {
                    activityType: '…',
                    stake: 0,
                    stakeCurrency: 'leaderboard_point' as StakeCurrency,
                    isCoop: false,
                  },
                  inviter: null,
                }
                return [skeleton, ...existing]
              })
            }
          }
          if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            const row = (payload.new ?? payload.old) as InviteRealtimePayload
            if (row?.status && row.status !== 'pending') {
              queryClient.setQueryData<MyPendingInvite[]>(queryKey, (prev) =>
                (prev ?? []).filter((inv) => inv.inviteId !== row.id),
              )
            }
          }
          // Always invalidate as a safety net so missing fields (inviter
          // name, match info) get filled in. setQueryData above keeps
          // the card visible during the refetch.
          queryClient.invalidateQueries({ queryKey })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient, userId])

  return useQuery({
    queryKey: ['my-pending-invites', userId],
    queryFn: () => getMyPendingInvites(userId!),
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })
}
