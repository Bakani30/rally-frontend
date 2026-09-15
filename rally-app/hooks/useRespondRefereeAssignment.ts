import { useMutation, useQueryClient } from '@tanstack/react-query'
import { alphaRefereeDutiesQueryKey } from '@/hooks/useAlphaRefereeDuties'
import { useAnalytics } from '@/hooks/useAnalytics'
import {
  respondRefereeAssignment,
  type RespondRefereeAssignmentInput,
} from '@/lib/match/alphaRefereeService'
import { notificationSummaryQueryKey } from '@/lib/notifications/notificationSummary'

export function useRespondRefereeAssignment(matchId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient()
  const { track } = useAnalytics()

  return useMutation({
    mutationFn: (input: RespondRefereeAssignmentInput) => respondRefereeAssignment(input),
    onSuccess: (result, input) => {
      track({
        name: 'referee_assignment_responded',
        properties: { match_id: input.matchId, response: input.response, status: result.status },
      })
      queryClient.invalidateQueries({ queryKey: ['match', matchId ?? input.matchId] })
      queryClient.invalidateQueries({ queryKey: ['my-matches'] })
      queryClient.invalidateQueries({ queryKey: alphaRefereeDutiesQueryKey(userId) })
      queryClient.invalidateQueries({ queryKey: notificationSummaryQueryKey(userId) })
    },
    onError: (err, input) => {
      track({
        name: 'referee_assignment_response_failed',
        properties: {
          match_id: input.matchId,
          response: input.response,
          reason: err instanceof Error ? err.message : 'unknown',
        },
      })
    },
  })
}
