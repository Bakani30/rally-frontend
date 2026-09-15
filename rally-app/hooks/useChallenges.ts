import { useQuery } from '@tanstack/react-query'
import { challengeQueryKeys } from '@/lib/challenges/challengeQueryKeys'
import { getOpenChallenges } from '@/lib/challenges/challengeService'
import {
  getHeartRouteSmokeChallengeListItem,
  shouldShowHeartRouteSmokeEvent,
} from '@/lib/challenges/heartRouteSmokeEvent'
import type { ChallengeListItem } from '@/types/challenge'

export function useChallenges(currentUserId: string | undefined) {
  return useQuery({
    queryKey: challengeQueryKeys.list('open'),
    queryFn: async () => withHeartRouteSmokeEvent(
      await getOpenChallenges(currentUserId),
      currentUserId,
    ),
    staleTime: 30_000,
  })
}

function withHeartRouteSmokeEvent(
  challenges: ChallengeListItem[],
  currentUserId: string | undefined,
): ChallengeListItem[] {
  if (!shouldShowHeartRouteSmokeEvent()) return challenges
  const smoke = getHeartRouteSmokeChallengeListItem(currentUserId)
  return [smoke, ...challenges.filter((challenge) => challenge.id !== smoke.id)]
}
