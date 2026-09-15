import { describe, expect, it } from 'vitest'

import { challengeQueryKeys } from './challengeQueryKeys'

describe('challengeQueryKeys', () => {
  it('uses a broad route-attempt key for invalidating every attempts page', () => {
    expect(challengeQueryKeys.routeAttempts('challenge-1')).toEqual([
      'challenges',
      'route-attempts',
      'challenge-1',
    ])
  })

  it('includes the limit when caching a concrete route-attempt query', () => {
    expect(challengeQueryKeys.routeAttempts('challenge-1', 5)).toEqual([
      'challenges',
      'route-attempts',
      'challenge-1',
      5,
    ])
  })
})
