import { describe, expect, it } from 'vitest'
import { assembleCrewMembers, buildCrewRoster, type CrewMemberInput } from './crewRoster'
import type { TeammateView } from './teamRunPresenceState'
import type { TeamRunLocation } from './teamRunPresenceTypes'

function member(overrides: Partial<CrewMemberInput> = {}): CrewMemberInput {
  return {
    userId: 'u',
    name: 'Runner',
    initials: 'RN',
    relation: 'ally',
    distanceMeters: 1000,
    paceSecondsPerKm: 360,
    liveness: 'live',
    phase: 'running',
    lastSeenSecondsAgo: 1,
    ...overrides,
  }
}

describe('buildCrewRoster', () => {
  it('always lists the self member first', () => {
    const rows = buildCrewRoster([
      member({ userId: 'a', relation: 'ally', distanceMeters: 5000 }),
      member({ userId: 'me', relation: 'self', distanceMeters: 100 }),
    ])
    expect(rows[0].userId).toBe('me')
  })

  it('orders the rest by distance descending', () => {
    const rows = buildCrewRoster([
      member({ userId: 'near', distanceMeters: 800 }),
      member({ userId: 'far', distanceMeters: 3200 }),
      member({ userId: 'mid', distanceMeters: 1500 }),
    ])
    expect(rows.map((r) => r.userId)).toEqual(['far', 'mid', 'near'])
  })

  it('marks a stale teammate as weak signal', () => {
    const [row] = buildCrewRoster([member({ liveness: 'stale', phase: 'running' })])
    expect(row.status).toBe('weak')
  })

  it('marks a paused teammate as paused (by liveness or phase)', () => {
    expect(buildCrewRoster([member({ liveness: 'paused' })])[0].status).toBe('paused')
    expect(buildCrewRoster([member({ liveness: 'live', phase: 'paused' })])[0].status).toBe('paused')
  })

  it('marks a live moving teammate as running', () => {
    expect(buildCrewRoster([member({ liveness: 'live', phase: 'running' })])[0].status).toBe('running')
  })

  it('prefers weak over paused when a paused teammate has also gone stale', () => {
    const [row] = buildCrewRoster([member({ liveness: 'stale', phase: 'paused' })])
    expect(row.status).toBe('weak')
  })

  it('computes each member gap ahead of / behind the local runner', () => {
    const rows = buildCrewRoster([
      member({ userId: 'me', relation: 'self', distanceMeters: 1000 }),
      member({ userId: 'ahead', relation: 'rival', distanceMeters: 1500 }),
      member({ userId: 'behind', relation: 'rival', distanceMeters: 800 }),
    ])
    const byId = Object.fromEntries(rows.map((r) => [r.userId, r.gapVsSelfMeters]))
    expect(byId.me).toBe(0)
    expect(byId.ahead).toBe(500)
    expect(byId.behind).toBe(-200)
  })
})

function view(overrides: Partial<TeamRunLocation> = {}, liveness: TeammateView['liveness'] = 'live'): TeammateView {
  const location: TeamRunLocation = {
    userId: 'ally-1',
    lat: 0,
    lng: 0,
    accuracy: 5,
    timestamp: 9000,
    phase: 'running',
    distanceMeters: 1200,
    paceSecondsPerKm: 400,
    ...overrides,
  }
  return { location, liveness, lastMovedAt: location.timestamp }
}

describe('assembleCrewMembers', () => {
  const base = {
    self: { userId: 'me', distanceMeters: 500, paceSecondsPerKm: 360, phase: 'running' as const },
    relationForTeammates: 'ally' as const,
    profiles: {
      me: { name: 'ฉัน', initials: 'ME' },
      'ally-1': { name: 'ก้อง', initials: 'KG' },
    },
    now: 10_000,
  }

  it('puts self first with its own identity and live status', () => {
    const members = assembleCrewMembers({ ...base, teammates: [view()] })
    expect(members[0]).toMatchObject({ userId: 'me', name: 'ฉัน', relation: 'self', liveness: 'live' })
  })

  it('maps a teammate view to its profile, pace, and last-seen seconds', () => {
    const members = assembleCrewMembers({ ...base, teammates: [view({ timestamp: 8500 })] })
    expect(members[1]).toMatchObject({
      userId: 'ally-1',
      name: 'ก้อง',
      relation: 'ally',
      distanceMeters: 1200,
      paceSecondsPerKm: 400,
      lastSeenSecondsAgo: 2,
    })
  })

  it('falls back gracefully when a teammate has no profile or pace', () => {
    const members = assembleCrewMembers({
      ...base,
      profiles: { me: { name: 'ฉัน', initials: 'ME' } },
      teammates: [view({ userId: 'ghost', paceSecondsPerKm: undefined })],
    })
    expect(members[1]).toMatchObject({ userId: 'ghost', name: 'เพื่อน', initials: '?', paceSecondsPerKm: null })
  })
})
