import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getMatchHistoryImpacts,
  normalizeMatchHistoryImpactIds,
} from '@/lib/history/matchHistoryImpactService'
import type { MatchHistoryImpact } from '@/lib/history/matchHistoryImpactTypes'

export function useMatchHistoryImpacts(
  userId: string | undefined,
  matchIds: readonly string[] | undefined,
) {
  const normalizedMatchIds = useMemo(
    () => normalizeMatchHistoryImpactIds(matchIds),
    [matchIds],
  )
  const emptyImpacts = useMemo(() => new Map<string, MatchHistoryImpact>(), [])

  const query = useQuery<Map<string, MatchHistoryImpact>>({
    queryKey: ['match-history-impacts', userId, normalizedMatchIds],
    queryFn: () => getMatchHistoryImpacts(normalizedMatchIds),
    enabled: Boolean(userId) && normalizedMatchIds.length > 0,
  })

  // The base history feed remains usable when this private impact query fails.
  // Consumers still receive query.error/isError for a non-blocking retry state.
  return {
    ...query,
    data: query.data ?? emptyImpacts,
  }
}
