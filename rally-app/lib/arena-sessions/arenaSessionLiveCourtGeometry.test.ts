import { describe, expect, it } from 'vitest'

import { buildArenaCourtMarkers } from '@/components/arena-session/arenaSessionLiveCourtGeometry'

const members = [
  { displayName: 'Gun', handle: 'gun', avatarUrl: null, positionKey: 'sg' },
  { displayName: 'Flame', handle: 'flame', avatarUrl: null, positionKey: 'sf' },
  { displayName: 'Lemon', handle: 'lemon', avatarUrl: null, positionKey: 'pg' },
]

describe('arena session live court geometry', () => {
  it('keeps the two basketball teams on opposite halves', () => {
    const champion = buildArenaCourtMarkers(members, 'champion', 'basketball')
    const challenger = buildArenaCourtMarkers(members, 'challenger', 'basketball')

    expect(champion.every((marker) => percent(marker.top) < 50)).toBe(true)
    expect(challenger.every((marker) => percent(marker.top) > 50)).toBe(true)
  })

  it('uses the stored basketball position key', () => {
    const [pointGuard] = buildArenaCourtMarkers([members[2]], 'champion', 'basketball')

    expect(pointGuard.label).toBe('PG')
    expect(pointGuard.left).toBe('50%')
    expect(pointGuard.top).toBe('39%')
  })

  it('falls back to safe badminton slots when a position is missing', () => {
    const markers = buildArenaCourtMarkers([
      { displayName: 'A', handle: null, avatarUrl: null, positionKey: null },
      { displayName: 'B', handle: null, avatarUrl: null, positionKey: null },
    ], 'challenger', 'badminton')

    expect(markers).toHaveLength(2)
    expect(markers.every((marker) => percent(marker.top) > 50)).toBe(true)
  })

  it.each(['basketball', 'badminton'] as const)('centers canonical duel players for %s', (activityType) => {
    const duel = [{ displayName: 'Solo', handle: null, avatarUrl: null, positionKey: 'duel' }]
    const [champion] = buildArenaCourtMarkers(duel, 'champion', activityType)
    const [challenger] = buildArenaCourtMarkers(duel, 'challenger', activityType)

    expect(champion.left).toBe('50%')
    expect(challenger.left).toBe('50%')
    expect(champion.label).toBe('1V1')
    expect(challenger.label).toBe('1V1')
    expect(percent(champion.top)).toBeLessThan(50)
    expect(percent(challenger.top)).toBeGreaterThan(50)
  })
})

function percent(value: unknown): number {
  return Number.parseFloat(String(value))
}
