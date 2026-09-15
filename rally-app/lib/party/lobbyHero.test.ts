import { describe, expect, it } from 'vitest'
import { formatSpendablePoints, getLobbyHeroPartyState } from '../lobbyHero'
import type { PartySummary } from '@/types/party'

const party: PartySummary = {
  id: 'party-1',
  name: 'Rally Five',
  activity_type: 'basketball',
  team_size: 3,
  visibility: 'discoverable',
  status: 'forming',
  expires_at: '2026-08-04T00:00:00.000Z',
  created_at: '2026-08-03T00:00:00.000Z',
  activeMemberCount: 4,
  host: null,
}

describe('lobbyHero', () => {
  it('keeps loading and unavailable points safe', () => {
    expect(formatSpendablePoints(null, true)).toBe('—')
    expect(formatSpendablePoints(null, false)).toBe('—')
  })

  it('formats only spendable points for the Hero stat', () => {
    expect(formatSpendablePoints(12345, false)).toBe('12,345')
  })

  it('prefers an active Party over a background loading or error state', () => {
    expect(getLobbyHeroPartyState(party, true, true)).toEqual({ kind: 'active', party })
  })

  it('distinguishes loading, error, and no-Party states', () => {
    expect(getLobbyHeroPartyState(null, true, false)).toEqual({ kind: 'loading' })
    expect(getLobbyHeroPartyState(null, false, true)).toEqual({ kind: 'error' })
    expect(getLobbyHeroPartyState(null, false, false)).toEqual({ kind: 'empty' })
  })
})
