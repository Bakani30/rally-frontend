import { describe, it, expect } from 'vitest'
import { selectActivityTierEvents, RANK_HISTORY_LIMIT } from './rankHistorySelect'
import type { TierEvent } from './tierEventTypes'

function evt(partial: Partial<TierEvent> & Pick<TierEvent, 'id' | 'activityType'>): TierEvent {
  return {
    userId: 'u1',
    fromTier: 'gold',
    toTier: 'platinum',
    direction: 'promotion',
    matchId: null,
    seasonId: null,
    createdAt: '2026-07-01T00:00:00Z',
    ...partial,
  }
}

describe('selectActivityTierEvents', () => {
  const events: TierEvent[] = [
    evt({ id: '1', activityType: 'basketball' }),
    evt({ id: '2', activityType: 'running' }),
    evt({ id: '3', activityType: 'basketball', direction: 'demotion', fromTier: 'platinum', toTier: 'gold' }),
  ]

  it('keeps only the requested activity', () => {
    const out = selectActivityTierEvents(events, 'basketball')
    expect(out.map((e) => e.id)).toEqual(['1', '3'])
  })

  it('returns empty for an activity with no events', () => {
    expect(selectActivityTierEvents(events, 'badminton')).toEqual([])
  })

  it('caps to the limit', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      evt({ id: String(i), activityType: 'running' }),
    )
    expect(selectActivityTierEvents(many, 'running')).toHaveLength(RANK_HISTORY_LIMIT)
    expect(selectActivityTierEvents(many, 'running', 3)).toHaveLength(3)
  })
})
