import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getLiveScoreboardRecord,
  listSpectatableLiveMatchesRecord,
  setMatchSpectatorsRecord,
} from '@/lib/match/spectateRepository'

// Light polling keeps the server load low: a small list payload every 15s and a
// tiny scoreboard payload every 5s — no heavy realtime fan-out per spectator.
export function useSpectatableLiveMatches(enabled: boolean) {
  return useQuery({
    queryKey: ['spectatable-live'],
    queryFn: listSpectatableLiveMatchesRecord,
    enabled,
    refetchInterval: 15000,
    staleTime: 10000,
  })
}

export function useLiveScoreboard(matchId: string | undefined) {
  return useQuery({
    queryKey: ['live-scoreboard', matchId],
    queryFn: () => getLiveScoreboardRecord(matchId!),
    enabled: !!matchId,
    refetchInterval: 5000,
  })
}

export function useSetMatchSpectators() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { matchId: string; allow: boolean }) =>
      setMatchSpectatorsRecord(input.matchId, input.allow),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['match', input.matchId] })
      queryClient.invalidateQueries({ queryKey: ['spectatable-live'] })
    },
  })
}
