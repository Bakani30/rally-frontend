import { describe, expect, it } from 'vitest'
import {
  ARENA_MAP_PREVIEW_SCENARIOS,
  arenaMapPreviewScenarioForPin,
  canUseArenaMapPreview,
  getArenaMapPreviewFixture,
  nextArenaMapPreviewTheme,
  parseArenaMapPreviewScenario,
  parseArenaMapPreviewTheme,
} from './arenaMapPreview'

describe('Arena Map Expo preview fixtures', () => {
  it('keeps the preview behind the development build boundary', () => {
    expect(canUseArenaMapPreview(true)).toBe(true)
    expect(canUseArenaMapPreview(false)).toBe(false)
  })

  it('normalizes route state without allowing an unknown scenario', () => {
    expect(parseArenaMapPreviewScenario('idle')).toBe('idle')
    expect(parseArenaMapPreviewScenario(['stale', 'live'])).toBe('stale')
    expect(parseArenaMapPreviewScenario('unknown')).toBe('live')
    expect(parseArenaMapPreviewScenario(undefined)).toBe('live')
  })

  it('switches the development preview between explicit light and dark themes', () => {
    expect(nextArenaMapPreviewTheme('light')).toBe('dark')
    expect(nextArenaMapPreviewTheme('dark')).toBe('light')
  })

  it('accepts only explicit light or dark preview theme query values', () => {
    expect(parseArenaMapPreviewTheme('light')).toBe('light')
    expect(parseArenaMapPreviewTheme(['dark', 'light'])).toBe('dark')
    expect(parseArenaMapPreviewTheme('system')).toBeNull()
    expect(parseArenaMapPreviewTheme(undefined)).toBeNull()
  })

  it('maps each tappable pin to the detail scenario for its type', () => {
    expect(arenaMapPreviewScenarioForPin('venue:11111111-1111-4111-8111-111111111111')).toBe('live')
    expect(arenaMapPreviewScenarioForPin('venue:22222222-2222-4222-8222-222222222222')).toBe('idle')
    expect(arenaMapPreviewScenarioForPin('session:33333333-3333-4333-8333-333333333333')).toBe('expiring')
    expect(arenaMapPreviewScenarioForPin('venue:ffffffff-ffff-4fff-8fff-ffffffffffff')).toBeNull()
  })

  it('keeps live, idle, expiring, stale, and error behavior independently inspectable', () => {
    expect(ARENA_MAP_PREVIEW_SCENARIOS).toEqual(['live', 'idle', 'expiring', 'stale', 'error'])

    const live = getArenaMapPreviewFixture('live')
    const idle = getArenaMapPreviewFixture('idle')
    const expiring = getArenaMapPreviewFixture('expiring')
    const stale = getArenaMapPreviewFixture('stale')
    const error = getArenaMapPreviewFixture('error')

    expect(live.detail?.liveScore).toEqual({ homeLabel: 'ARI BALLERS', homeScore: 12, awayLabel: 'RAMA V', awayScore: 9 })
    expect(live.detail?.queuePreview).toEqual({ teams: ['Siam Heat', 'BKK North'], remainingCount: 2 })
    expect(idle.detail).toMatchObject({ liveScore: null, queuePreview: { teams: [], remainingCount: 0 }, deadline: null })
    expect(expiring.detail?.deadline).toEqual({ kind: 'drain', at: '2026-08-25T10:07:00.000Z' })
    expect(stale).toMatchObject({ isStale: true, hasBlockingError: false })
    expect(stale.detail).not.toBeNull()
    expect(error).toMatchObject({ detail: null, isStale: false, hasBlockingError: true })
  })

  it('uses the same three runtime pin types in every scenario and never emits Conquest', () => {
    for (const scenario of ARENA_MAP_PREVIEW_SCENARIOS) {
      const fixture = getArenaMapPreviewFixture(scenario)
      expect(fixture.pins.map((pin) => pin.type)).toEqual(['official_venue', 'community_venue', 'ad_hoc_arena'])
      expect(JSON.stringify(fixture)).not.toContain('conquest_arena')
    }
  })

  it('contains no private or operational fields in public preview projections', () => {
    const serialized = JSON.stringify(ARENA_MAP_PREVIEW_SCENARIOS.map(getArenaMapPreviewFixture))
    for (const forbidden of ['playerLocation', 'presenceEvidence', 'privateCode', 'joinCode', 'fullRoster', 'stake', 'wallet', 'referee', 'moderation']) {
      expect(serialized).not.toContain(forbidden)
    }
  })
})
