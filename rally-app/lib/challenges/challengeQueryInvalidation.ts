import { challengeQueryKeys } from './challengeQueryKeys'

type QueryInvalidator = {
  invalidateQueries: (filters: { queryKey: readonly unknown[] }) => Promise<unknown> | unknown
}

export async function invalidateRouteChallengeProgressQueries(
  queryClient: QueryInvalidator,
  challengeId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: challengeQueryKeys.routeAttempts(challengeId) }),
    queryClient.invalidateQueries({ queryKey: challengeQueryKeys.detail(challengeId) }),
    queryClient.invalidateQueries({ queryKey: challengeQueryKeys.all }),
  ])
}
