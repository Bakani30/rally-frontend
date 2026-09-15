import { useQuery } from '@tanstack/react-query'
import { searchEligibleReferees } from '@/lib/match/inviteDirectoryService'
import type { EligibleReferee } from '@/types/invite'

/**
 * Search any user as a potential referee for a match, enriched with their
 * sport-specific referee trust profile + eligibility. Enabled only while the
 * sheet is open and we have a match id + activity type. `query` is part of the
 * key so each search term is cached/refetched independently.
 */
export function useEligibleReferees(
  matchId: string | undefined,
  activityType: string | undefined,
  query: string,
  enabled: boolean,
) {
  return useQuery<EligibleReferee[]>({
    queryKey: ['eligible-referees', matchId, activityType, query],
    queryFn: () => searchEligibleReferees(matchId!, activityType!, query),
    enabled: enabled && !!matchId && !!activityType,
    staleTime: 5_000,
  })
}
