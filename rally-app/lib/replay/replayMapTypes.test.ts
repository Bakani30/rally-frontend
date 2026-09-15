import { describe, expect, it } from 'vitest'

import { normalizeReplayMapCompanions, type ReplayMapCompanion } from './replayMapTypes'

const companion = (overrides: Partial<ReplayMapCompanion> = {}): ReplayMapCompanion => ({
  id: 'friend-1',
  fullCoordinates: [[100, 13], [100.01, 13.01]],
  revealedCoordinates: [[100, 13]],
  revealedProgress: 0.5,
  marker: { lat: 13, lng: 100 },
  color: 'rgba(255, 92, 92, 1)',
  markerEmoji: '🏃‍♀️ runner',
  ...overrides,
})

describe('normalizeReplayMapCompanions', () => {
  it('clamps progress and normalizes companion identity and emoji', () => {
    expect(normalizeReplayMapCompanions([companion({ id: '  friend-1  ', revealedProgress: 3 })])).toEqual([
      expect.objectContaining({ id: 'friend-1', revealedProgress: 1, markerEmoji: '🏃‍♀️' }),
    ])
  })

  it('drops duplicate or unusable tracks before provider rendering', () => {
    expect(normalizeReplayMapCompanions([
      companion(),
      companion({ fullCoordinates: [[100, 13]], markerEmoji: '🔥' }),
      companion({ id: 'friend-1' }),
    ])).toHaveLength(1)
  })
})
