import { describe, expect, it } from 'vitest'

import { getNewActivityEntryRoute } from './newMatchEntryRoute'

describe('new match entry routes', () => {
  it('routes Basketball creation to Arena Session creation', () => {
    expect(getNewActivityEntryRoute('basketball')).toBe('/arena-session/new')
  })

  it.each(['running', 'badminton'] as const)('keeps %s in the existing match creation flow', (activity) => {
    expect(getNewActivityEntryRoute(activity)).toBeNull()
  })
})
