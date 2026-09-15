import { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAlphaRunningGate } from '@/hooks/useAlphaRunningGate'
import { resolveAlphaRunningGateKeyForRuleParams } from '@/lib/run-tracking/alphaRunningGate'
import { findJoinableMatchByCode, getOpenMatchLobbies, joinMatch } from '@/lib/match/matchService'
import { supabase } from '@/lib/supabase'
import type { MatchLobby, MatchWithRelations, Side } from '@/types/match'

type JoinLobbyInput = {
  matchId?: string
  joinCode?: string
  entryCode?: string
  side: Side
  stake: number
}

type UseMatchDiscoveryOptions = {
  enabled?: boolean
  fallbackRefreshMs?: number | false
}

const OPEN_LOBBY_STALE_MS = 5_000
const OPEN_LOBBY_FALLBACK_REFRESH_MS = 5_000

export function useMatchDiscovery(options: UseMatchDiscoveryOptions = {}) {
  const queryClient = useQueryClient()
  const runningAlphaGate = useAlphaRunningGate()
  const enabled = options.enabled ?? true
  const fallbackRefreshMs = options.fallbackRefreshMs ?? OPEN_LOBBY_FALLBACK_REFRESH_MS

  useEffect(() => {
    if (!enabled) return

    const topic = 'open-match-lobbies'
    const queryKey = ['open-match-lobbies'] as const

    supabase
      .getChannels()
      .filter((ch) => ch.topic === `realtime:${topic}`)
      .forEach((ch) => void supabase.removeChannel(ch))

    const channel = supabase
      .channel(topic)
      .on(
        'broadcast',
        { event: 'changed' },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [enabled, queryClient])

  const openMatchesQuery = useQuery({
    queryKey: ['open-match-lobbies'],
    queryFn: () => getOpenMatchLobbies(),
    enabled,
    // Realtime broadcast should make new/changed lobbies visible in under a
    // second. The 5s interval is the screen-local fallback for missed websocket
    // events, stale lobby occupancy, or a phone that reconnected quietly.
    staleTime: OPEN_LOBBY_STALE_MS,
    refetchInterval: enabled && fallbackRefreshMs !== false
      ? fallbackRefreshMs
      : false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })
  const visibleOpenMatches = useMemo(
    () => (openMatchesQuery.data ?? []).filter((lobby) => canSeeLobby(lobby, runningAlphaGate)),
    [openMatchesQuery.data, runningAlphaGate],
  )

  const codeLookupMutation = useMutation({
    mutationFn: async (joinCode: string) => {
      const lobby = await findJoinableMatchByCode(joinCode)
      return lobby && canSeeLobby(lobby, runningAlphaGate) ? lobby : null
    },
  })

  const joinLobbyMutation = useMutation({
    mutationFn: (input: JoinLobbyInput) => joinMatch(input),
    onSuccess: (result, variables) => {
      queryClient.setQueryData<MatchWithRelations>(['match', result.matchId], result.match)
      queryClient.invalidateQueries({ queryKey: ['open-match-lobbies'] })
      queryClient.invalidateQueries({ queryKey: ['my-matches'] })

      if (variables.joinCode) {
        codeLookupMutation.reset()
      }
    },
  })

  function joinLobby(lobby: MatchLobby, side: Side, entryCode?: string) {
    return joinLobbyMutation.mutateAsync({
      matchId: lobby.id,
      entryCode,
      side: lobby.is_coop ? 0 : side,
      stake: lobby.stake,
    })
  }

  function joinLobbyByCode(joinCode: string, lobby: MatchLobby, side: Side, entryCode?: string) {
    return joinLobbyMutation.mutateAsync({
      joinCode: joinCode.trim().toUpperCase(),
      entryCode,
      side: lobby.is_coop ? 0 : side,
      stake: lobby.stake,
    })
  }

  return {
    openMatchesQuery: {
      ...openMatchesQuery,
      data: visibleOpenMatches,
    },
    codeLookupMutation,
    joinLobbyMutation,
    joinLobby,
    joinLobbyByCode,
  }
}

function canSeeLobby(
  lobby: MatchLobby,
  runningAlphaGate: ReturnType<typeof useAlphaRunningGate>,
): boolean {
  if (lobby.activity_type !== 'running') return true
  const featureKey = resolveAlphaRunningGateKeyForRuleParams(lobby.rule_params ?? null, lobby.is_coop)
  return runningAlphaGate.isEnabled(featureKey)
}
