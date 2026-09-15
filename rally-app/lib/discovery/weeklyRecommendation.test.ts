import { describe, expect, it } from 'vitest'

import type { ChallengeListItem } from '@/types/challenge'
import { getWeekWindow } from './weekWindow'
import { recommendWeeklyEvents, type WeeklyRecommendationContext } from './weeklyRecommendation'

// Friday 2026-07-17 12:00 Bangkok; week = Mon 2026-07-13 → Mon 2026-07-20.
const NOW_MS = Date.parse('2026-07-17T05:00:00Z')
const WEEK = getWeekWindow(NOW_MS, 'Asia/Bangkok')

const LUMPINI: [number, number][] = [
  [100.5412, 13.7300],
  [100.5450, 13.7325],
  [100.5480, 13.7360],
]

function challenge(overrides: Partial<ChallengeListItem> & { id: string }): ChallengeListItem {
  return {
    creator_id: 'creator',
    campaign_id: null,
    campaigns: null,
    title: overrides.id,
    description: '',
    activity_type: 'running',
    goal_type: 'distance_km',
    goal_value: 5,
    challenge_mode: 'solo',
    start_at: '2026-07-15T00:00:00Z',
    end_at: '2026-07-18T00:00:00Z',
    max_participants: null,
    status: 'active',
    created_at: '2026-07-01T00:00:00Z',
    planned_route_geojson: null,
    route_tolerance_m: null,
    participant_count: 0,
    is_joined: false,
    ...overrides,
  }
}

function context(overrides: Partial<WeeklyRecommendationContext> = {}): WeeklyRecommendationContext {
  return {
    nowMs: NOW_MS,
    week: WEEK,
    activity: 'running',
    targetDistanceKm: 5,
    ...overrides,
  }
}

describe('recommendWeeklyEvents', () => {
  it('ranks an exact 5 km event this week first', () => {
    const ranked = recommendWeeklyEvents([
      challenge({ id: 'ten-k', goal_value: 10 }),
      challenge({ id: 'five-k', goal_value: 5 }),
      challenge({ id: 'three-k', goal_value: 3 }),
    ], context())
    expect(ranked[0].challenge.id).toBe('five-k')
    expect(ranked[0].isExactDistance).toBe(true)
    expect(ranked[0].reasons).toContain('exact_distance')
    expect(ranked[0].reasons).toContain('this_week')
  })

  it('excludes events outside the selected week', () => {
    const ranked = recommendWeeklyEvents([
      challenge({ id: 'next-month', start_at: '2026-08-03T00:00:00Z', end_at: '2026-08-10T00:00:00Z' }),
      challenge({ id: 'this-week' }),
    ], context())
    expect(ranked.map((r) => r.challenge.id)).toEqual(['this-week'])
  })

  it('excludes the wrong activity type', () => {
    const ranked = recommendWeeklyEvents([
      challenge({ id: 'hoops', activity_type: 'basketball' }),
      challenge({ id: 'run' }),
    ], context())
    expect(ranked.map((r) => r.challenge.id)).toEqual(['run'])
  })

  it('prefers exact distance over a near-distance fallback', () => {
    const ranked = recommendWeeklyEvents([
      challenge({ id: 'near-6k', goal_value: 6, participant_count: 500 }),
      challenge({ id: 'exact-5k', goal_value: 5 }),
    ], context())
    expect(ranked[0].challenge.id).toBe('exact-5k')
    expect(ranked[1].reasons).toContain('near_distance')
  })

  it('prefers the nearer event when other factors are equal', () => {
    const nearRoute = { type: 'LineString' as const, coordinates: LUMPINI }
    const farRoute = {
      type: 'LineString' as const,
      coordinates: [[100.90, 13.90], [100.91, 13.91]] as [number, number][],
    }
    const ranked = recommendWeeklyEvents([
      challenge({ id: 'far', planned_route_geojson: farRoute }),
      challenge({ id: 'near', planned_route_geojson: nearRoute }),
    ], context({ userCoords: { lat: 13.7305, lng: 100.5410 } }))
    expect(ranked[0].challenge.id).toBe('near')
    expect(ranked[0].reasons).toContain('nearby')
    expect(ranked[0].distanceFromUserKm).not.toBeNull()
    expect(ranked[0].distanceFromUserKm!).toBeLessThan(1)
  })

  it('is deterministic without location and never claims nearby', () => {
    const candidates = [
      challenge({ id: 'b' }),
      challenge({ id: 'a' }),
    ]
    const first = recommendWeeklyEvents(candidates, context())
    const second = recommendWeeklyEvents(candidates, context())
    expect(first.map((r) => r.challenge.id)).toEqual(second.map((r) => r.challenge.id))
    expect(first.every((r) => r.distanceFromUserKm === null)).toBe(true)
    expect(first.every((r) => !r.reasons.includes('nearby'))).toBe(true)
  })

  it('keeps events without coordinates eligible and does not crash', () => {
    const ranked = recommendWeeklyEvents([
      challenge({ id: 'no-route', planned_route_geojson: null }),
    ], context({ userCoords: { lat: 13.73, lng: 100.54 } }))
    expect(ranked).toHaveLength(1)
    expect(ranked[0].distanceFromUserKm).toBeNull()
    expect(ranked[0].hasOfficialRoute).toBe(false)
  })

  it('does not produce fake proximity from invalid route coordinates', () => {
    const broken = {
      type: 'LineString' as const,
      coordinates: [[999, 999], [NaN, 13.73]] as [number, number][],
    }
    const ranked = recommendWeeklyEvents([
      challenge({ id: 'broken-route', planned_route_geojson: broken }),
    ], context({ userCoords: { lat: 13.73, lng: 100.54 } }))
    expect(ranked[0].distanceFromUserKm).toBeNull()
    expect(ranked[0].hasOfficialRoute).toBe(false)
    expect(ranked[0].reasons).not.toContain('nearby')
  })

  it('keeps scheduled and active events, excludes ended/cancelled/draft', () => {
    const ranked = recommendWeeklyEvents([
      challenge({ id: 'active', status: 'active' }),
      challenge({ id: 'scheduled', status: 'scheduled', start_at: '2026-07-18T00:00:00Z', end_at: '2026-07-19T00:00:00Z' }),
      challenge({ id: 'ended', status: 'ended' }),
      challenge({ id: 'cancelled', status: 'cancelled' }),
      challenge({ id: 'draft', status: 'draft' }),
    ], context())
    expect(ranked.map((r) => r.challenge.id).sort()).toEqual(['active', 'scheduled'])
  })

  it('excludes events that already ended even if status is stale-active', () => {
    const ranked = recommendWeeklyEvents([
      challenge({ id: 'stale', status: 'active', start_at: '2026-07-13T00:00:00Z', end_at: '2026-07-14T00:00:00Z' }),
    ], context())
    expect(ranked).toHaveLength(0)
  })

  it('breaks full ties by start time then id, stably', () => {
    const ranked = recommendWeeklyEvents([
      challenge({ id: 'zebra' }),
      challenge({ id: 'alpha' }),
      challenge({ id: 'early', start_at: '2026-07-14T00:00:00Z' }),
    ], context())
    expect(ranked.map((r) => r.challenge.id)).toEqual(['early', 'alpha', 'zebra'])
  })

  it('prioritises featured campaigns and participant count between equals', () => {
    const ranked = recommendWeeklyEvents([
      challenge({ id: 'plain', participant_count: 900 }),
      challenge({ id: 'featured', campaign_id: 'camp-1' }),
      challenge({ id: 'popular', participant_count: 40 }),
    ], context())
    expect(ranked.map((r) => r.challenge.id)).toEqual(['featured', 'plain', 'popular'])
    expect(ranked[0].reasons).toContain('featured_campaign')
  })

  it('does not mutate the source candidate array', () => {
    const candidates = [
      challenge({ id: 'b' }),
      challenge({ id: 'a', goal_value: 10 }),
    ]
    const snapshot = candidates.map((c) => ({ ...c }))
    recommendWeeklyEvents(candidates, context({ userCoords: { lat: 13.73, lng: 100.54 } }))
    expect(candidates.map((c) => c.id)).toEqual(['b', 'a'])
    expect(candidates).toEqual(snapshot)
  })
})
