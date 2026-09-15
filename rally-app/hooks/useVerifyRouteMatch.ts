import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateRouteChallengeProgressQueries } from '@/lib/challenges/challengeQueryInvalidation'
import { verifyRouteMatch } from '@/lib/challenges/challengeService'
import type { RouteMatchVerification } from '@/types/challenge'

type VerifyParams = {
  challengeId: string
  activitySessionId: string
}

export function useVerifyRouteMatch() {
  const qc = useQueryClient()

  return useMutation<RouteMatchVerification, Error, VerifyParams>({
    mutationFn: verifyRouteMatch,
    onSuccess: async (_data, vars) => {
      await invalidateRouteChallengeProgressQueries(qc, vars.challengeId)
    },
  })
}
