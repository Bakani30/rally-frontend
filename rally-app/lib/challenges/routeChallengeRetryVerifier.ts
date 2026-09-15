type VerifyRouteChallengeInput = {
  challengeId: string
  activitySessionId: string
}

export type RouteChallengeRetryVerifierDeps = {
  verifyRouteMatch: (input: VerifyRouteChallengeInput) => Promise<unknown>
  invalidateQueries: (challengeId: string) => Promise<unknown>
}

export function createRouteChallengeRetryVerifier(
  deps: RouteChallengeRetryVerifierDeps,
) {
  return async function verifyRouteChallengeRetry(
    input: VerifyRouteChallengeInput,
  ): Promise<void> {
    try {
      await deps.verifyRouteMatch(input)
    } finally {
      await deps.invalidateQueries(input.challengeId)
    }
  }
}
