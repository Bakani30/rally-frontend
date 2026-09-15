import { describe, expect, it } from 'vitest'

import {
  ARENA_MAP_INITIAL_CAMERA,
  arenaMapCameraPayload,
  arenaMapNativePins,
  defaultArenaMapProvider,
  fallbackArenaMapProvider,
  normalizeArenaMapNativeRegion,
} from './arenaMapProvider'

const summaryPin = {
  id: 'venue:11111111-1111-4111-8111-111111111111',
  type: 'official_venue' as const,
  coordinate: { latitude: 13.7791, longitude: 100.5448 },
  publicIdentity: {
    label: 'Rally Court Ari',
    partyAvatarUrl: 'https://example.com/party.png',
    hostAvatarUrl: 'https://example.com/host.png',
    initials: 'RA',
    affiliation: null,
  },
  venueId: '11111111-1111-4111-8111-111111111111',
  sessionId: null,
  isFavorite: true,
}

describe('Arena Map platform provider contract', () => {
  it('chooses native Apple Maps only on iOS', () => {
    expect(defaultArenaMapProvider('ios')).toBe('apple')
    expect(defaultArenaMapProvider('android')).toBe('maplibre')
    expect(defaultArenaMapProvider('web')).toBe('maplibre')
  })

  it('falls back from Apple to MapLibre exactly once', () => {
    expect(fallbackArenaMapProvider('apple')).toBe('maplibre')
    expect(fallbackArenaMapProvider('maplibre')).toBeNull()
  })

  it('serializes only public type-and-identity Pin fields for native rendering', () => {
    const injected = {
      ...summaryPin,
      liveScore: { homeScore: 12, awayScore: 9 },
      queue: ['private-team'],
      privateCode: 'SECRET',
      roster: ['private-player'],
      stakeWallet: 500,
    }

    expect(arenaMapNativePins([injected as never], summaryPin.id)).toEqual([{
      id: summaryPin.id,
      type: 'official_venue',
      coordinate: { latitude: 13.7791, longitude: 100.5448 },
      publicIdentity: {
        label: 'Rally Court Ari',
        partyAvatarUrl: 'https://example.com/party.png',
        hostAvatarUrl: 'https://example.com/host.png',
        initials: 'RA',
      },
      selected: true,
    }])
  })

  it('keeps the approved initial 3D camera and rejects non-finite transitions', () => {
    expect(ARENA_MAP_INITIAL_CAMERA).toEqual({
      center: [100.53, 13.76],
      zoom: 16.5,
      pitch: 52,
      bearing: -18,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      duration: 0,
    })
    expect(arenaMapCameraPayload({ ...ARENA_MAP_INITIAL_CAMERA, zoom: Number.NaN })).toBeNull()
    expect(arenaMapCameraPayload({ ...ARENA_MAP_INITIAL_CAMERA, duration: 240 })).toEqual({
      center: [100.53, 13.76],
      zoom: 16.5,
      pitch: 52,
      bearing: -18,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      duration: 240,
    })
  })

  it('normalizes finite native viewport events and rejects malformed bounds', () => {
    expect(normalizeArenaMapNativeRegion({
      bounds: [100.47, 13.7, 100.59, 13.82],
      zoom: 16.5,
    })).toEqual({
      bbox: { south: 13.7, north: 13.82, west: 100.47, east: 100.59 },
      zoom: 16.5,
    })
    expect(normalizeArenaMapNativeRegion({ bounds: [170, 13, -170, 14], zoom: 12 })).toBeNull()
    expect(normalizeArenaMapNativeRegion({ bounds: [100, 13, 101, 14], zoom: Number.NaN })).toBeNull()
  })
})
