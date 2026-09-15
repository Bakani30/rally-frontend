import { useQuery } from '@tanstack/react-query'
import { activityDetailQueryKeys } from '@/lib/activities/detail/activityDetailQueryKeys'
import { getActivityReplayRouteData } from '@/lib/activities/detail/activityReplayRouteService'

export function useReplayRouteData(activitySessionId: string | undefined) {
  return useQuery({
    queryKey: activityDetailQueryKeys.replayRouteData(activitySessionId),
    queryFn: () => getActivityReplayRouteData(activitySessionId!),
    enabled: !!activitySessionId,
    staleTime: 60_000,
  })
}
