import { describe, expect, it } from 'vitest'

import type { ArenaEvent } from '@/types/arena'
import { getArenaDiscoveryPresentation } from './arenaDiscoveryPresentation'

describe('Arena discovery presentation', () => {
  it('places current Arena Sessions before read-only Legacy Arena cards', () => {
    const presentation = getArenaDiscoveryPresentation([
      { id: 'legacy-arena', session_context: null } as ArenaEvent,
      { id: 'session-arena', session_context: { source_kind: 'venue', mode: 'casual' } } as ArenaEvent,
    ])

    expect(presentation.current.map(({ arena }) => arena.id)).toEqual(['session-arena'])
    expect(presentation.legacy.map(({ arena }) => arena.id)).toEqual(['legacy-arena'])
  })

  it('gives every Legacy Arena card only its read-only action', () => {
    const presentation = getArenaDiscoveryPresentation([
      { id: 'legacy-arena' } as ArenaEvent,
    ])

    expect(presentation.legacy[0]?.destination).toMatchObject({
      kind: 'legacy',
      badge: 'LEGACY · ดูได้เท่านั้น',
      actionLabel: 'ดูสนามเดิม',
      readOnly: true,
    })
    expect(presentation.legacy[0]?.destination.actionLabel).not.toMatch(/เข้าคิว|queue/i)
  })
})
