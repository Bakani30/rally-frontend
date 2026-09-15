import { describe, expect, it } from 'vitest'

import { parseArenaMatchPreviewRoute } from './arenaMatchLifecyclePreview'
import { getArenaSessionMatchPreviewRoute } from './arenaSessionMatchPreviewRoute'

function query(href: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(href.split('?')[1]).entries())
}

describe('arena session match preview route', () => {
  it.each(['match-1', 'preview match/1'])('round-trips %s through the lifecycle parser', (matchId) => {
    const href = getArenaSessionMatchPreviewRoute(matchId)

    expect(href).toMatch(/^\/dev\/arena-match-preview\?/)
    expect(parseArenaMatchPreviewRoute(query(href!))).toEqual({
      kind: 'preview',
      matchId,
      preview: {
        state: 'ready_to_submit',
        captain: 'a',
        score: { sideA: 0, sideB: 0 },
        reviewEpoch: 1,
        actionLog: [],
      },
    })
  })

  it('returns null for a blank match ID', () => {
    expect(getArenaSessionMatchPreviewRoute(' ')).toBeNull()
  })

  it('returns a fresh canonical route on each call', () => {
    const first = getArenaSessionMatchPreviewRoute('match-1')
    const second = getArenaSessionMatchPreviewRoute('match-1')

    expect(second).toBe(first)
    expect(second).toMatch(/^\/dev\/arena-match-preview\?state=ready_to_submit&/)
  })
})
