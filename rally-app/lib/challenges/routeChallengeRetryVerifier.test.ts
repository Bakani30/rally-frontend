import { describe, expect, it } from 'vitest'
import { createRouteChallengeRetryVerifier } from './routeChallengeRetryVerifier'

describe('createRouteChallengeRetryVerifier', () => {
  it('verifies the route, then invalidates route challenge queries', async () => {
    const events: string[] = []
    const verifier = createRouteChallengeRetryVerifier({
      verifyRouteMatch: async () => {
        events.push('verify')
      },
      invalidateQueries: async () => {
        events.push('invalidate')
      },
    })

    await verifier({ challengeId: 'challenge-1', activitySessionId: 'activity-1' })

    expect(events).toEqual(['verify', 'invalidate'])
  })

  it('still invalidates queries when route verification fails', async () => {
    const error = new Error('path_too_sparse')
    const events: string[] = []
    const verifier = createRouteChallengeRetryVerifier({
      verifyRouteMatch: async () => {
        events.push('verify')
        throw error
      },
      invalidateQueries: async () => {
        events.push('invalidate')
      },
    })

    await expect(
      verifier({ challengeId: 'challenge-1', activitySessionId: 'activity-1' }),
    ).rejects.toBe(error)
    expect(events).toEqual(['verify', 'invalidate'])
  })
})
