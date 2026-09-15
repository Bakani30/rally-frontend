import { describe, it, expect } from 'vitest'
import { triageTierEvents } from './tierEventTriage'
import type { TierEvent } from './tierEventTypes'

function event(overrides: Partial<TierEvent>): TierEvent {
  return {
    id: 'evt-1',
    userId: 'user-1',
    activityType: 'basketball',
    fromTier: 'bronze',
    toTier: 'silver',
    direction: 'promotion',
    matchId: 'match-1',
    seasonId: 'season-1',
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('triageTierEvents', () => {
  it('returns all-null/empty for no events', () => {
    const result = triageTierEvents([])
    expect(result).toEqual({ momentEvent: null, momentQueue: [], quietSeenIds: [], noticeEvents: [] })
  })

  it('a single promotion becomes the moment event and the sole queue entry', () => {
    const promo = event({ id: 'p1', createdAt: '2026-07-01T00:00:00.000Z' })
    const result = triageTierEvents([promo])
    expect(result.momentQueue).toEqual([promo])
    expect(result.momentEvent).toEqual(promo)
    expect(result.quietSeenIds).toEqual([])
    expect(result.noticeEvents).toEqual([])
  })

  it('CRITICAL: a demotion alone must NEVER become momentEvent or enter momentQueue', () => {
    const demo = event({ id: 'd1', direction: 'demotion', fromTier: 'gold', toTier: 'silver' })
    const result = triageTierEvents([demo])
    expect(result.momentEvent).toBeNull()
    expect(result.momentQueue).toEqual([])
    expect(result.noticeEvents).toEqual([demo])
    expect(result.quietSeenIds).toEqual([])
  })

  it('picks only the latest promotion per activity for the queue (older same-activity promotion quiet-seen)', () => {
    const older = event({
      id: 'p-old',
      activityType: 'basketball',
      createdAt: '2026-07-01T00:00:00.000Z',
    })
    const newer = event({
      id: 'p-new',
      activityType: 'basketball',
      createdAt: '2026-07-03T00:00:00.000Z',
    })
    const result = triageTierEvents([older, newer])
    expect(result.momentQueue).toEqual([newer])
    expect(result.momentEvent).toEqual(newer)
    expect(result.quietSeenIds).toEqual(['p-old'])
    expect(result.noticeEvents).toEqual([])
  })

  it('queues the latest promotion PER activity — both activities appear, newest first', () => {
    const basketballPromo = event({
      id: 'p-bball',
      activityType: 'basketball',
      createdAt: '2026-07-02T00:00:00.000Z',
    })
    const runningPromo = event({
      id: 'p-run',
      activityType: 'running',
      createdAt: '2026-07-04T00:00:00.000Z',
    })
    const result = triageTierEvents([basketballPromo, runningPromo])
    expect(result.momentQueue).toEqual([runningPromo, basketballPromo])
    expect(result.momentEvent).toEqual(runningPromo)
    expect(result.quietSeenIds).toEqual([])
    expect(result.noticeEvents).toEqual([])
  })

  it('demotions are never quiet-seen — they always surface as notices', () => {
    const promo = event({ id: 'p1', createdAt: '2026-07-05T00:00:00.000Z' })
    const demo = event({
      id: 'd1',
      direction: 'demotion',
      fromTier: 'gold',
      toTier: 'silver',
      createdAt: '2026-07-04T00:00:00.000Z',
    })
    const result = triageTierEvents([promo, demo])
    expect(result.momentQueue).toEqual([promo])
    expect(result.momentEvent).toEqual(promo)
    expect(result.quietSeenIds).toEqual([])
    expect(result.noticeEvents).toEqual([demo])
  })

  it('mixed: latest promotion per activity queued (newest first), older same-activity promotion quiet-seen, all demotions as notices', () => {
    const bballOld = event({
      id: 'bball-old',
      activityType: 'basketball',
      createdAt: '2026-07-01T00:00:00.000Z',
    })
    const bballNew = event({
      id: 'bball-new',
      activityType: 'basketball',
      createdAt: '2026-07-05T00:00:00.000Z',
    })
    const runningPromo = event({
      id: 'p-run',
      activityType: 'running',
      createdAt: '2026-07-02T00:00:00.000Z',
    })
    const runDemo = event({
      id: 'run-demo',
      activityType: 'running',
      direction: 'demotion',
      fromTier: 'platinum',
      toTier: 'gold',
      createdAt: '2026-07-03T00:00:00.000Z',
    })
    const result = triageTierEvents([bballOld, bballNew, runningPromo, runDemo])
    expect(result.momentQueue).toEqual([bballNew, runningPromo])
    expect(result.momentEvent).toEqual(bballNew)
    expect(result.quietSeenIds).toEqual(['bball-old'])
    expect(result.noticeEvents).toEqual([runDemo])
  })
})
