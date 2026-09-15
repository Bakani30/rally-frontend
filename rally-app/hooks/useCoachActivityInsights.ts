import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCoachInsights, saveContext, syncSensors } from '@/lib/coach/coachService'
import type {
  CoachActivityContextInput,
  CoachSensorSummaryInput,
  GetCoachActivityInsightsResult,
} from '@/lib/coach/coachTypes'

const COACH_QUERY_KEY = 'coach-activity-insights' as const

export function coachInsightsQueryKey(activitySessionId: string | null | undefined) {
  return [COACH_QUERY_KEY, activitySessionId ?? null] as const
}

export function useCoachActivityInsights(activitySessionId: string | null | undefined) {
  return useQuery<GetCoachActivityInsightsResult>({
    queryKey: coachInsightsQueryKey(activitySessionId),
    queryFn: () => {
      if (!activitySessionId) {
        return Promise.reject(new Error('Missing activity session id'))
      }
      return getCoachInsights(activitySessionId)
    },
    enabled: Boolean(activitySessionId),
    staleTime: 30_000,
  })
}

export function useSaveCoachContext(activitySessionId: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CoachActivityContextInput) => saveContext(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: coachInsightsQueryKey(activitySessionId) })
    },
  })
}

export function useSyncCoachSensors(activitySessionId: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CoachSensorSummaryInput) => syncSensors(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: coachInsightsQueryKey(activitySessionId) })
    },
  })
}
