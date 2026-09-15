import { describe, expect, it } from 'vitest'
import { arenaMapCameraTransition, arenaMapClusterAccessibilityLabel, arenaMapCompactMetaLabel, arenaMapCompactQueueLabel, arenaMapDeadlineLabel, arenaMapDetailDestination, arenaMapDetailMetaLabel, arenaMapDetailSurfaceState, arenaMapMarkerRenderModel, arenaMapPinAccessibilityLabel, arenaMapPinIdForTap, arenaMapSheetDestination, arenaMapSheetMaxHeight, boundedViewportBbox, clusterTypeMix, deadlineRemainingLabel, distanceMeters, effectiveArenaMapSessionId, getArenaMapMarkerPresentation, getArenaMapStoryMarkerPresentation } from './arenaMapPresentation'
import { arenaMapStoryFixtures, shouldRenderArenaMapPinStory } from './arenaMapStory'

const pin = (type: 'official_venue' | 'community_venue' | 'ad_hoc_arena', partyAvatarUrl: string | null = null, hostAvatarUrl: string | null = null) => ({ id: `${type === 'ad_hoc_arena' ? 'session' : 'venue'}:11111111-1111-4111-8111-111111111111`, type, coordinate: { latitude: 13.7, longitude: 100.5 }, publicIdentity: { label: 'สนามอารีย์', partyAvatarUrl, hostAvatarUrl, initials: 'สอ', affiliation: null }, venueId: type === 'ad_hoc_arena' ? null : '22222222-2222-4222-8222-222222222222', sessionId: type === 'ad_hoc_arena' ? '33333333-3333-4333-8333-333333333333' : null, isFavorite: false })

const pinAt = (
  id: string,
  type: 'official_venue' | 'community_venue' | 'ad_hoc_arena',
  latitude: number,
  longitude: number,
) => ({ ...pin(type), id, coordinate: { latitude, longitude } })

describe('Arena Map type-only marker presentation', () => {
  it('renders all runtime types at the same base size', () => {
    for (const type of ['official_venue', 'community_venue', 'ad_hoc_arena'] as const) expect(getArenaMapMarkerPresentation(pin(type)).size).toBe(48)
  })
  it('changes selected treatment without replacing its type badge', () => {
    const marker = getArenaMapMarkerPresentation(pin('community_venue'), true)
    expect(marker).toMatchObject({ size: 48, scale: 1.12, halo: true, badgeIcon: 'basketball', shadowStrength: 'strong' })
  })
  it('uses party then host then initials-plus-ball fallback', () => {
    expect(getArenaMapMarkerPresentation(pin('official_venue', 'https://example.com/p.png')).fallback).toBe('party_avatar')
    expect(getArenaMapMarkerPresentation(pin('official_venue', null, 'https://example.com/h.png')).fallback).toBe('host_avatar')
    expect(getArenaMapMarkerPresentation(pin('official_venue')).fallback).toBe('initials_ball')
  })
  it('does not depend on live score, queue, draining, or timer fields', () => {
    const stable = getArenaMapMarkerPresentation(pin('ad_hoc_arena'))
    expect(stable).toEqual(getArenaMapMarkerPresentation({ ...pin('ad_hoc_arena'), liveScore: { score: 99 }, queue: ['x'], drainingAt: 'now' } as never))
  })
  it('keeps a deterministic story for all four design types, selected, cluster, and fallbacks', () => {
    const runtimeTypes = arenaMapStoryFixtures.filter((fixture): fixture is Extract<typeof fixture, { kind: 'runtime' }> => fixture.kind === 'runtime').map((fixture) => fixture.pin.type)
    const cluster = arenaMapStoryFixtures.find((fixture): fixture is Extract<typeof fixture, { kind: 'cluster' }> => fixture.kind === 'cluster')
    expect(new Set(runtimeTypes)).toEqual(new Set(['official_venue', 'community_venue', 'ad_hoc_arena']))
    expect(arenaMapStoryFixtures.some((fixture) => fixture.kind === 'conquest')).toBe(true)
    expect(arenaMapStoryFixtures.some((fixture) => fixture.kind === 'runtime' && fixture.selected)).toBe(true)
    expect(cluster).toMatchObject({ count: 3, typeMix: { official_venue: 1, community_venue: 1, ad_hoc_arena: 1 } })
    expect(getArenaMapStoryMarkerPresentation('conquest_arena')).toMatchObject({ badgeIcon: 'crown', keylineColor: '#161616' })
  })
  it('bounds a MapLibre viewport before requesting the summary', () => {
    expect(boundedViewportBbox([100, 13, 101, 14])).toEqual({ south: 13.25, north: 13.75, west: 100.25, east: 100.75 })
    expect(boundedViewportBbox([[170, 13], [-170, 14]])).toBeNull()
  })
  it('calculates contextual remaining time from server time', () => {
    expect(deadlineRemainingLabel('2026-08-22T00:01:20.000Z', '2026-08-22T00:00:00.000Z')).toBe('1:20')
  })
  it('calculates distance locally without adding it to an API input', () => {
    expect(distanceMeters({ latitude: 13.75, longitude: 100.5 }, { latitude: 13.75, longitude: 100.5 })).toBe(0)
    expect(distanceMeters({ latitude: 13.75, longitude: 100.5 }, { latitude: 13.751, longitude: 100.5 })).toBeGreaterThan(100)
  })
  it('builds cluster output from type mix only', () => {
    expect(clusterTypeMix([pin('official_venue'), pin('community_venue'), pin('community_venue')])).toEqual({ official_venue: 1, community_venue: 2 })
  })
  it('keeps a low-zoom singleton as the full pin while close pins share one cluster', () => {
    const closeOfficial = pinAt('venue:11111111-1111-4111-8111-111111111111', 'official_venue', 13.7000, 100.5000)
    const closeCommunity = pinAt('venue:22222222-2222-4222-8222-222222222222', 'community_venue', 13.7001, 100.5001)
    const isolated = pinAt('session:33333333-3333-4333-8333-333333333333', 'ad_hoc_arena', 13.7600, 100.5600)

    const model = arenaMapMarkerRenderModel(12, [closeOfficial, closeCommunity, isolated], null)

    expect(model.clusters).toHaveLength(1)
    expect(model.clusters[0]).toMatchObject({
      count: 2,
      typeMix: { official_venue: 1, community_venue: 1 },
    })
    expect(model.unclusteredPins.map((entry) => entry.id)).toEqual([isolated.id])
    expect(model.selectedPin).toBeNull()
  })

  it('renders a selected pin above clusters exactly once without exposing dynamic state', () => {
    const closeOfficial = pinAt('venue:11111111-1111-4111-8111-111111111111', 'official_venue', 13.7000, 100.5000)
    const selectedCommunity = pinAt('venue:22222222-2222-4222-8222-222222222222', 'community_venue', 13.7001, 100.5001)
    const closeAdHoc = pinAt('session:33333333-3333-4333-8333-333333333333', 'ad_hoc_arena', 13.7002, 100.5002)
    const isolated = pinAt('venue:44444444-4444-4444-8444-444444444444', 'official_venue', 13.7600, 100.5600)

    const model = arenaMapMarkerRenderModel(12, [closeOfficial, selectedCommunity, closeAdHoc, isolated], selectedCommunity.id)
    const renderedIds = [...model.unclusteredPins.map((entry) => entry.id), ...(model.selectedPin ? [model.selectedPin.id] : [])]

    expect(model.clusters).toHaveLength(1)
    expect(model.clusters[0]).toMatchObject({ count: 2, typeMix: { official_venue: 1, ad_hoc_arena: 1 } })
    expect(renderedIds).toEqual([isolated.id, selectedCommunity.id])
    expect(new Set(renderedIds).size).toBe(renderedIds.length)
    expect(model.clusters[0]).not.toHaveProperty('liveScore')
    expect(model.clusters[0]).not.toHaveProperty('queue')
  })

  it('renders every pin as a full pin at normal zoom and validates tap IDs', () => {
    const venue = pinAt('venue:11111111-1111-4111-8111-111111111111', 'official_venue', 13.7000, 100.5000)
    const session = pinAt('session:22222222-2222-4222-8222-222222222222', 'ad_hoc_arena', 13.7001, 100.5001)
    const model = arenaMapMarkerRenderModel(14, [venue, session], session.id)

    expect(model.clusters).toEqual([])
    expect(model.unclusteredPins.map((entry) => entry.id)).toEqual([venue.id])
    expect(model.selectedPin?.id).toBe(session.id)
    expect(arenaMapPinIdForTap([venue, session], venue.id)).toBe(venue.id)
    expect(arenaMapPinIdForTap([venue, session], 'session:missing')).toBeNull()
    expect(arenaMapPinIdForTap([venue, session], 42)).toBeNull()
  })
  it('rejects stale selected session IDs and uses only current options', () => {
    expect(effectiveArenaMapSessionId('venue:11111111-1111-4111-8111-111111111111', 'session:22222222-2222-4222-8222-222222222222', [{ sessionId: 'session:33333333-3333-4333-8333-333333333333' }])).toBeNull()
    expect(effectiveArenaMapSessionId('session:11111111-1111-4111-8111-111111111111', null, [])).toBe('session:11111111-1111-4111-8111-111111111111')
  })
  it('routes idle Venue details to their real Venue screen and active details to the chosen Session', () => {
    const detail = {
      id: 'venue:11111111-1111-4111-8111-111111111111',
      venueId: '11111111-1111-4111-8111-111111111111',
      sessionNavigationOptions: [{ sessionId: 'session:22222222-2222-4222-8222-222222222222', label: 'รอบ 3v3' }],
    }

    expect(arenaMapDetailDestination(detail, null)).toEqual({ kind: 'venue', venueId: detail.venueId })
    expect(arenaMapDetailDestination(detail, detail.sessionNavigationOptions[0].sessionId)).toEqual({ kind: 'arena_session', sessionId: '22222222-2222-4222-8222-222222222222' })
  })
  it('keeps the compact map sheet CTA on the Venue when multiple Sessions exist', () => {
    const venueDetail = {
      id: 'venue:11111111-1111-4111-8111-111111111111',
      venueId: '11111111-1111-4111-8111-111111111111',
      sessionNavigationOptions: [
        { sessionId: 'session:22222222-2222-4222-8222-222222222222', label: 'รอบแรก' },
        { sessionId: 'session:33333333-3333-4333-8333-333333333333', label: 'รอบสอง' },
      ],
    }
    const adHocDetail = {
      id: 'session:44444444-4444-4444-8444-444444444444',
      venueId: null,
      sessionNavigationOptions: [],
    }

    expect(arenaMapSheetDestination(venueDetail)).toEqual({ kind: 'venue', venueId: venueDetail.venueId })
    expect(arenaMapSheetDestination(adHocDetail)).toEqual({ kind: 'arena_session', sessionId: '44444444-4444-4444-8444-444444444444' })
  })
  it('keeps existing detail visible after a background refresh error', () => {
    expect(arenaMapDetailSurfaceState({ hasData: true, isInitialLoading: false, hasError: true })).toBe('content_stale')
    expect(arenaMapDetailSurfaceState({ hasData: false, isInitialLoading: false, hasError: true })).toBe('blocking_error')
    expect(arenaMapDetailSurfaceState({ hasData: false, isInitialLoading: true, hasError: false })).toBe('loading')
  })
  it('caps the compact sheet inside the safe viewport on a small phone', () => {
    expect(arenaMapSheetMaxHeight(667, 47, 34)).toBe(363)
    expect(arenaMapSheetMaxHeight(400, 80, 80)).toBe(240)
  })
  it('never permits the Conquest story board outside development', () => {
    expect(shouldRenderArenaMapPinStory(false)).toBe(false)
    expect(shouldRenderArenaMapPinStory(true)).toBe(true)
  })

  it('focuses a selected pin with a close 3D overview and reserves room for its detail sheet', () => {
    expect(arenaMapCameraTransition('pin', { latitude: 13.7791, longitude: 100.5448 }, 12, 844, false)).toEqual({
      center: [100.5448, 13.7791],
      zoom: 16.5,
      pitch: 52,
      bearing: -18,
      padding: { top: 120, right: 24, bottom: 354, left: 24 },
      duration: 240,
    })
    expect(arenaMapCameraTransition('pin', { latitude: 13.7791, longitude: 100.5448 }, 17.1, 667, false).zoom).toBe(17.1)
  })

  it('zooms a cluster far enough to reveal its members and disables animation for reduced motion', () => {
    expect(arenaMapCameraTransition('cluster', { latitude: 13.77, longitude: 100.53 }, 12.5, 844, false)).toEqual({
      center: [100.53, 13.77],
      zoom: 15.2,
      pitch: 52,
      bearing: -18,
      padding: { top: 140, right: 32, bottom: 96, left: 32 },
      duration: 240,
    })
    expect(arenaMapCameraTransition('cluster', { latitude: 13.77, longitude: 100.53 }, 17, 844, true)).toMatchObject({ zoom: 18, duration: 0 })
  })

  it('announces pin type, selection, and localized cluster type counts', () => {
    expect(arenaMapPinAccessibilityLabel(pin('official_venue'), true)).toBe('สนามทางการ สนามอารีย์, เลือกแล้ว')
    expect(arenaMapPinAccessibilityLabel(pin('ad_hoc_arena'), false)).toBe('สนามชั่วคราว สนามอารีย์')
    expect(arenaMapClusterAccessibilityLabel(5, { official_venue: 1, community_venue: 3, ad_hoc_arena: 1 })).toBe('5 สนาม: สนามทางการ 1, สนามชุมชน 3, สนามชั่วคราว 1')
  })

  it('omits an invented format while preserving real type, format, and distance metadata', () => {
    expect(arenaMapDetailMetaLabel('official_venue', null, null)).toBe('สนามทางการ')
    expect(arenaMapDetailMetaLabel('community_venue', '5v5', 850)).toBe('สนามชุมชน · 5v5 · 850 ม.')
    expect(arenaMapDetailMetaLabel('ad_hoc_arena', '3v3', 1250)).toBe('สนามชั่วคราว · 3v3 · 1.3 กม.')
  })

  it('summarizes the full queue without exposing team names in the compact sheet', () => {
    expect(arenaMapCompactQueueLabel({ teams: ['Siam Heat', 'BKK North'], remainingCount: 2 })).toBe('รอ 4 ทีม')
    expect(arenaMapCompactQueueLabel({ teams: [], remainingCount: 0 })).toBeNull()
    expect(arenaMapCompactMetaLabel('3v3', 850)).toBe('3v3 · 850 ม.')
  })

  it('explains each deadline according to what ends', () => {
    const serverTime = '2026-08-25T10:00:00.000Z'
    const at = '2026-08-25T10:07:00.000Z'
    expect(arenaMapDeadlineLabel({ kind: 'drain', at }, serverTime)).toBe('สนามกำลังปิดใน 7:00')
    expect(arenaMapDeadlineLabel({ kind: 'session_expiry', at }, serverTime)).toBe('รอบหมดเวลาใน 7:00')
    expect(arenaMapDeadlineLabel({ kind: 'conquest_defence', at }, serverTime)).toBe('เหลือเวลาป้องกันสนาม 7:00')
  })
})
