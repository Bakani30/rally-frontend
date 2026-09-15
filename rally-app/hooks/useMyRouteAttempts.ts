import { useQuery } from '@tanstack/react-query'
import { challengeQueryKeys } from '@/lib/challenges/challengeQueryKeys'
import { listMyRouteAttempts } from '@/lib/challenges/challengeService'

/**
 * Loads the caller's route-match attempts for a challenge, newest first.
 * Returns null while disabled (no challengeId). The attempts list also
 * exposes `bestMatchScore` so the summary screen can show "Best score"
 * without recomputing from the array.
 */
export function useMyRouteAttempts(challengeId: string | undefined, limit?: number) {
  return useQuery({
    queryKey: challengeQueryKeys.routeAttempts(challengeId, limit),
    queryFn: () => listMyRouteAttempts({ challengeId: challengeId!, limit }),
    enabled: !!challengeId,
    staleTime: 30_000,
  })
}
