import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getMyMatches } from '@/lib/match/matchService'
import { supabase } from '@/lib/supabase'
import type { MatchStatus, MyMatch } from '@/types/match'

type MatchRealtimeRow = {
  id?: string
  created_by?: string
  status?: MatchStatus
  winner_user_id?: string | null
  is_tie?: boolean
  updated_at?: string
}

function patchVisibleMatch(matches: MyMatch[] | undefined, row: MatchRealtimeRow): MyMatch[] | undefined {
  if (!matches || !row.id) return matches

  let found = false
  const next = matches.map((match) => {
    if (match.id !== row.id) return match
    found = true
    return {
      ...match,
      status: row.status ?? match.status,
      winner_user_id: Object.prototype.hasOwnProperty.call(row, 'winner_user_id')
        ? row.winner_user_id ?? null
        : match.winner_user_id,
      is_tie: Object.prototype.hasOwnProperty.call(row, 'is_tie') ? row.is_tie ?? match.is_tie : match.is_tie,
      updated_at: row.updated_at ?? match.updated_at,
    }
  })

  return found ? next : matches
}

export function useMyMatches(userId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    const topic = `my-matches:${userId}`

    // Remove stale channels synchronously before subscribing to avoid
    // the "cannot add postgres_changes callbacks after subscribe()" race.
    supabase
      .getChannels()
      .filter((ch) => ch.topic === `realtime:${topic}`)
      .forEach((ch) => void supabase.removeChannel(ch))

    const channel = supabase
      .channel(topic)
      // User's own participant rows — covers join / accept / unaccept /
      // leave / settle (settle mutates the participant row to lock stake).
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_participants', filter: `user_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ['my-matches', userId] }),
      )
      // Invites where the user is the recipient. Pending invites are not
      // rendered in this list anymore, but invite status changes should still
      // refresh counts after accept/decline races across devices.
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_invites', filter: `invitee_user_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ['my-matches', userId] }),
      )
      // Match rows visible through RLS. Host START only updates the match
      // row, not every participant row, so non-host lists must listen here
      // too or they can stay stuck in "accepted" until a manual refresh.
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        (payload) => {
          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as MatchRealtimeRow
          const current = queryClient.getQueryData<MyMatch[]>(['my-matches', userId])
          const isKnownMatch = !!row.id && current?.some((match) => match.id === row.id)
          const isOwnCreatedMatch = row.created_by === userId

          if (!isKnownMatch && !isOwnCreatedMatch) return

          queryClient.setQueryData<MyMatch[]>(
            ['my-matches', userId],
            (old) => patchVisibleMatch(old, row),
          )
          queryClient.invalidateQueries({ queryKey: ['my-matches', userId] })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient, userId])

  return useQuery({
    queryKey: ['my-matches', userId],
    queryFn: () => getMyMatches(userId!),
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })
}
