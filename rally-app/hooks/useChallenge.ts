import { useQuery } from '@tanstack/react-query'
import { challengeQueryKeys } from '@/lib/challenges/challengeQueryKeys'
import { getChallenge } from '@/lib/challenges/challengeService'
import {
  getHeartRouteSmokeChallengeDetail,
  shouldShowHeartRouteSmokeEvent,
} from '@/lib/challenges/heartRouteSmokeEvent'
import { useAuth } from '@/hooks/useAuth'

export function useChallenge(id: string | undefined) {
  const { user } = useAuth()
  const smokeData = shouldShowHeartRouteSmokeEvent()
    ? getHeartRouteSmokeChallengeDetail(id, user?.id)
    : null
  return useQuery({
    queryKey: challengeQueryKeys.detail(id),
    queryFn: () => getChallenge(id!),
    enabled: !!id && !smokeData,
    initialData: smokeData ?? undefined,
    staleTime: 15_000,
  })
}
