import { describe, expect, it } from 'vitest'
import { deriveMatchesScreenState } from './matchesScreenState'

describe('deriveMatchesScreenState', () => {
  it('session-only user (no matches, feed has runs) sees content', () => {
    expect(
      deriveMatchesScreenState({
        pendingLiveCount: 0,
        feedCount: 3,
        matchesPending: false,
        historyPending: false,
      }),
    ).toBe('content')
  })

  it('both sources empty and settled keeps the content shell for section empty states', () => {
    expect(
      deriveMatchesScreenState({
        pendingLiveCount: 0,
        feedCount: 0,
        matchesPending: false,
        historyPending: false,
      }),
    ).toBe('content')
  })

  it('matches empty while history is still loading stays loading, never empty', () => {
    expect(
      deriveMatchesScreenState({
        pendingLiveCount: 0,
        feedCount: 0,
        matchesPending: false,
        historyPending: true,
      }),
    ).toBe('loading')
  })

  it('matches source pending is loading regardless of history', () => {
    expect(
      deriveMatchesScreenState({
        pendingLiveCount: 0,
        feedCount: 5,
        matchesPending: true,
        historyPending: false,
      }),
    ).toBe('loading')
  })

  it('pending/live matches alone are content even with an empty feed', () => {
    expect(
      deriveMatchesScreenState({
        pendingLiveCount: 2,
        feedCount: 0,
        matchesPending: false,
        historyPending: true,
      }),
    ).toBe('content')
  })
})
