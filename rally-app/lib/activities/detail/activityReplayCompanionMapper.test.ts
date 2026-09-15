import { describe, expect, it } from 'vitest'

import { buildReplayTrack } from '@/lib/replay/replayPath'
import {
  buildReplayMapCompanions,
  prepareReplayMapCompanions,
  revealReplayMapCompanions,
} from './activityReplayCompanionMapper'
import type { ActivityReplayRouteSource } from './activityReplayRouteTypes'

const primaryPoints = [
  { lat: 13.7563, lng: 100.5018 },
  { lat: 13.7573, lng: 100.5018 },
  { lat: 13.7583, lng: 100.5028 },
]

const primaryTrack = buildReplayTrack(primaryPoints)

const source = (overrides: Partial<ActivityReplayRouteSource> = {}): ActivityReplayRouteSource => ({
  activitySessionId: 'friend-session',
  userId: 'friend-1',
  startedAt: '2026-07-21T00:00:00.000Z',
  endedAt: '2026-07-21T00:10:00.000Z',
  points: primaryPoints.map((point) => ({ ...point, lng: point.lng + 0.001 })),
  displayName: 'Friend One',
  handle: 'friend',
  avatarUrl: 'https://example.com/friend.jpg',
  ...overrides,
})

const base = {
  primarySessionId: 'self-session',
  primaryUserId: 'self-1',
  primaryTiming: {
    startedAt: '2026-07-21T00:00:00.000Z',
    endedAt: '2026-07-21T00:10:00.000Z',
  },
  primaryTrack,
  replayProgress: 0.5,
}

describe('buildReplayMapCompanions', () => {
  it('maps a linked route into a provider-neutral companion track', () => {
    const [companion] = buildReplayMapCompanions({ ...base, sources: [source()] })
    expect(companion).toMatchObject({
      id: 'friend-1',
      markerAvatarUrl: 'https://example.com/friend.jpg',
      markerInitials: 'FO',
      revealedProgress: 0.5,
    })
    expect(companion.fullCoordinates.length).toBeGreaterThanOrEqual(2)
    expect(companion.revealedCoordinates.length).toBeGreaterThanOrEqual(2)
    expect(companion.marker).not.toBeNull()
  })

  it('aligns a late-starting companion to the primary replay clock', () => {
    const [companion] = buildReplayMapCompanions({
      ...base,
      sources: [source({
        startedAt: '2026-07-21T00:02:00.000Z',
        endedAt: '2026-07-21T00:12:00.000Z',
      })],
      replayProgress: 0.1,
    })
    expect(companion.revealedProgress).toBe(0)
  })

  it('creates a dev-only simulator companion when no real route exists', () => {
    const [companion] = buildReplayMapCompanions({ ...base, sources: [], useFixture: true })
    expect(companion.id).toBe('simulator-companion')
    expect(companion.color).toBe('#c73f41')
  })

  it('does not fabricate a companion unless the caller enables the fixture', () => {
    expect(buildReplayMapCompanions({ ...base, sources: [] })).toEqual([])
  })

  it('prepares route geometry once and only samples it during reveal updates', () => {
    const prepared = prepareReplayMapCompanions({ ...base, sources: [source()] })
    const first = revealReplayMapCompanions({
      primaryTiming: base.primaryTiming,
      prepared,
      replayProgress: 0.1,
    })
    const second = revealReplayMapCompanions({
      primaryTiming: base.primaryTiming,
      prepared,
      replayProgress: 0.9,
    })
    expect(first[0].fullCoordinates).toBe(second[0].fullCoordinates)
    expect(first[0].revealedProgress).not.toBe(second[0].revealedProgress)
  })
})
