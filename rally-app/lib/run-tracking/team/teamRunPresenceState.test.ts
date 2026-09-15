import { describe, expect, it } from 'vitest'
import type { TeamRunLocation } from './teamRunPresenceTypes'
import {
  FROZEN_AFTER_MS,
  LOST_AFTER_MS,
  STALE_AFTER_MS,
  applyTeammateLocation,
  buildTeammateViews,
  derivePresencePhase,
  deriveTeammateLiveness,
  pruneLostTeammates,
  type TeammatePresenceMap,
} from './teamRunPresenceState'

function loc(overrides: Partial<TeamRunLocation> = {}): TeamRunLocation {
  return {
    userId: 'u1',
    lat: 13.7,
    lng: 100.5,
    accuracy: 5,
    timestamp: 1_000_000,
    phase: 'running',
    ...overrides,
  }
}

describe('derivePresencePhase', () => {
  it('maps idle to ready', () => {
    expect(derivePresencePhase({ status: 'idle', isAutoPaused: false, isVehiclePaused: false })).toBe('ready')
  })

  it('maps active running to running', () => {
    expect(derivePresencePhase({ status: 'active', isAutoPaused: false, isVehiclePaused: false })).toBe('running')
  })

  it('maps active + auto-pause to paused', () => {
    expect(derivePresencePhase({ status: 'active', isAutoPaused: true, isVehiclePaused: false })).toBe('paused')
  })

  it('maps active + vehicle-pause to paused', () => {
    expect(derivePresencePhase({ status: 'active', isAutoPaused: false, isVehiclePaused: true })).toBe('paused')
  })

  it('maps manual paused to paused', () => {
    expect(derivePresencePhase({ status: 'paused', isAutoPaused: false, isVehiclePaused: false })).toBe('paused')
  })

  it('maps stopped to ready', () => {
    expect(derivePresencePhase({ status: 'stopped', isAutoPaused: false, isVehiclePaused: false })).toBe('ready')
  })
})

describe('applyTeammateLocation', () => {
  it('adds a new teammate and stamps lastMovedAt with now', () => {
    const next = applyTeammateLocation({}, loc({ timestamp: 500 }), 900)
    expect(next.u1.location.timestamp).toBe(500)
    expect(next.u1.lastMovedAt).toBe(900)
  })

  it('advances lastMovedAt only when coordinates change', () => {
    const first = applyTeammateLocation({}, loc({ lat: 13.7, lng: 100.5, timestamp: 500 }), 900)
    const moved = applyTeammateLocation(first, loc({ lat: 13.8, lng: 100.5, timestamp: 1500 }), 1900)
    expect(moved.u1.lastMovedAt).toBe(1900)
  })

  it('keeps lastMovedAt when coordinates are unchanged (frozen GPS heartbeat)', () => {
    const first = applyTeammateLocation({}, loc({ lat: 13.7, lng: 100.5, timestamp: 500 }), 900)
    const same = applyTeammateLocation(first, loc({ lat: 13.7, lng: 100.5, timestamp: 6000 }), 6400)
    expect(same.u1.location.timestamp).toBe(6000)
    expect(same.u1.lastMovedAt).toBe(900)
  })

  it('ignores an out-of-order (older) update', () => {
    const first = applyTeammateLocation({}, loc({ timestamp: 5000, lat: 13.7 }), 5000)
    const stale = applyTeammateLocation(first, loc({ timestamp: 4000, lat: 99 }), 6000)
    expect(stale).toBe(first)
    expect(stale.u1.location.lat).toBe(13.7)
  })

  it('drops a payload whose userId is not an allowed participant (anti-spoof)', () => {
    const allowed = new Set(['u1', 'u2'])
    const spoof = applyTeammateLocation({}, loc({ userId: 'intruder' }), 900, allowed)
    expect(spoof).toEqual({})
  })

  it('accepts a payload from an allowed participant', () => {
    const allowed = new Set(['u1', 'u2'])
    const next = applyTeammateLocation({}, loc({ userId: 'u2' }), 900, allowed)
    expect(next.u2.location.userId).toBe('u2')
  })
})

describe('deriveTeammateLiveness', () => {
  const now = 100_000

  it('is live for a fresh, moving teammate', () => {
    const presence = { location: loc({ timestamp: now - 1000 }), lastMovedAt: now - 1000 }
    expect(deriveTeammateLiveness(presence, now)).toBe('live')
  })

  it('is paused when the broadcast phase is paused', () => {
    const presence = { location: loc({ timestamp: now - 1000, phase: 'paused' }), lastMovedAt: now - 1000 }
    expect(deriveTeammateLiveness(presence, now)).toBe('paused')
  })

  it('is stale when no message has arrived past the stale threshold', () => {
    const presence = { location: loc({ timestamp: now - STALE_AFTER_MS - 1 }), lastMovedAt: now - STALE_AFTER_MS - 1 }
    expect(deriveTeammateLiveness(presence, now)).toBe('stale')
  })

  it('is lost past the lost threshold', () => {
    const presence = { location: loc({ timestamp: now - LOST_AFTER_MS - 1 }), lastMovedAt: now - LOST_AFTER_MS - 1 }
    expect(deriveTeammateLiveness(presence, now)).toBe('lost')
  })

  it('is stale when heartbeats are fresh but the position has frozen', () => {
    const presence = { location: loc({ timestamp: now - 500 }), lastMovedAt: now - FROZEN_AFTER_MS - 1 }
    expect(deriveTeammateLiveness(presence, now)).toBe('stale')
  })
})

describe('pruneLostTeammates', () => {
  const now = 100_000

  it('removes lost teammates', () => {
    const map: TeammatePresenceMap = {
      gone: { location: loc({ userId: 'gone', timestamp: now - LOST_AFTER_MS - 1 }), lastMovedAt: now - LOST_AFTER_MS - 1 },
    }
    expect(pruneLostTeammates(map, now)).toEqual({})
  })

  it('keeps stale teammates (does not hard-drop them)', () => {
    const map: TeammatePresenceMap = {
      slow: { location: loc({ userId: 'slow', timestamp: now - STALE_AFTER_MS - 1 }), lastMovedAt: now - STALE_AFTER_MS - 1 },
    }
    expect(pruneLostTeammates(map, now)).toBe(map)
  })

  it('returns the same reference when nothing is pruned', () => {
    const map: TeammatePresenceMap = {
      live: { location: loc({ userId: 'live', timestamp: now - 1000 }), lastMovedAt: now - 1000 },
    }
    expect(pruneLostTeammates(map, now)).toBe(map)
  })

  it('drops entries not in the participant allowlist once it is known', () => {
    const map: TeammatePresenceMap = {
      real: { location: loc({ userId: 'real', timestamp: now - 1000 }), lastMovedAt: now - 1000 },
      intruder: { location: loc({ userId: 'intruder', timestamp: now - 1000 }), lastMovedAt: now - 1000 },
    }
    const pruned = pruneLostTeammates(map, now, new Set(['real']))
    expect(Object.keys(pruned)).toEqual(['real'])
  })
})

describe('buildTeammateViews', () => {
  const now = 100_000

  it('excludes lost teammates, tags liveness, and orders by userId', () => {
    const map: TeammatePresenceMap = {
      zoe: { location: loc({ userId: 'zoe', timestamp: now - 1000 }), lastMovedAt: now - 1000 },
      amy: { location: loc({ userId: 'amy', timestamp: now - STALE_AFTER_MS - 1 }), lastMovedAt: now - STALE_AFTER_MS - 1 },
      gone: { location: loc({ userId: 'gone', timestamp: now - LOST_AFTER_MS - 1 }), lastMovedAt: now - LOST_AFTER_MS - 1 },
    }
    const views = buildTeammateViews(map, now)
    expect(views.map((v) => v.location.userId)).toEqual(['amy', 'zoe'])
    expect(views.map((v) => v.liveness)).toEqual(['stale', 'live'])
  })
})
