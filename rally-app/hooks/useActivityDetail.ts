import { useQuery } from '@tanstack/react-query'
import { activityDetailQueryKeys } from '@/lib/activities/detail/activityDetailQueryKeys'
import {
  getActivityDetail,
  getLinkedMatch,
} from '@/lib/activities/detail/activityDetailService'

export function useActivityDetail(id: string | undefined) {
  return useQuery({
    queryKey: activityDetailQueryKeys.detail(id),
    queryFn: () => getActivityDetail(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useLinkedMatch(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: activityDetailQueryKeys.linkedMatch(id),
    queryFn: () => getLinkedMatch(id!),
    enabled: !!id && enabled,
    staleTime: 60_000,
  })
}
