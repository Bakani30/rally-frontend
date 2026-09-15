import { describe, expect, it } from 'vitest'
import { invalidateRouteChallengeProgressQueries } from './challengeQueryInvalidation'

describe('invalidateRouteChallengeProgressQueries', () => {
  it('invalidates route attempts, detail, and challenge list state', async () => {
    const calls: unknown[] = []

    await invalidateRouteChallengeProgressQueries(
      {
        invalidateQueries: (filters) => {
          calls.push(filters.queryKey)
        },
      },
      'challenge-1',
    )

    expect(calls).toEqual([
      ['challenges', 'route-attempts', 'challenge-1'],
      ['challenges', 'detail', 'challenge-1'],
      ['challenges'],
    ])
  })
})
