import { describe, expect, it } from 'vitest'

import type { ArenaEvent } from '@/types/arena'
import { getArenaEventDestination, getArenaEventRoute } from './arenaNavigation'

describe('arena navigation', () => {
  it('projects a session-aware Arena Event as the current Arena Session destination', () => {
    const destination = getArenaEventDestination({
      id: 'session-arena',
      session_context: { source_kind: 'venue', mode: 'casual' },
    } as ArenaEvent)

    expect(destination).toEqual({
      kind: 'session',
      route: '/arena-session/session-arena',
      badge: null,
      actionLabel: 'ดู Arena Session',
      readOnly: false,
    })
  })

  it.each([
    { id: 'missing-context' } as ArenaEvent,
    { id: 'null-context', session_context: null } as ArenaEvent,
  ])('projects an Arena Event without session_context as read-only Legacy Arena', (arena) => {
    expect(getArenaEventDestination(arena)).toEqual({
      kind: 'legacy',
      route: `/arena/${arena.id}`,
      badge: 'LEGACY · ดูได้เท่านั้น',
      actionLabel: 'ดูสนามเดิม',
      readOnly: true,
    })
  })

  it('routes session-aware Arena Events to the Arena Session screen', () => {
    const arena = { id: 'session-arena', session_context: { source_kind: 'venue', mode: 'casual' } } as ArenaEvent

    expect(getArenaEventRoute(arena)).toBe('/arena-session/session-arena')
  })

  it('keeps legacy Arena Events on the legacy Arena screen', () => {
    expect(getArenaEventRoute({ id: 'legacy-arena', session_context: null } as ArenaEvent)).toBe('/arena/legacy-arena')
    expect(getArenaEventRoute({ id: 'legacy-arena' } as ArenaEvent)).toBe('/arena/legacy-arena')
  })
})
