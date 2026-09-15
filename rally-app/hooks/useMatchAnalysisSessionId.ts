import { useQuery } from '@tanstack/react-query'
import { getMatchAnalysisSessionId } from '@/lib/match/matchService'

// Resolves the activity session behind a settled match for the coach report.
// The recap's analysis button navigates immediately (tap-first); this hook does
// the lookup inside the report screen. The submission row is written in the
// settle transaction, but a tap can race the replica read right after settle —
// poll briefly while unresolved instead of caching a null forever.
export function useMatchAnalysisSessionId(matchId: string | undefined) {
  return useQuery({
    queryKey: ['match-analysis-session', matchId],
    queryFn: () => getMatchAnalysisSessionId(matchId!),
    enabled: !!matchId,
    refetchInterval: (query) => (query.state.data ? false : 2_000),
  })
}
