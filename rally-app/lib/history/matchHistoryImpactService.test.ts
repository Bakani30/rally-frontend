import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  MatchHistoryImpactRpcRow,
  MatchHistoryImpact,
} from './matchHistoryImpactTypes'
import { fetchMatchHistoryImpactRows } from './matchHistoryImpactRepository'
import {
  getMatchHistoryImpacts,
  MAX_MATCH_HISTORY_IMPACT_IDS,
} from './matchHistoryImpactService'

vi.mock('./matchHistoryImpactRepository', () => ({
  fetchMatchHistoryImpactRows: vi.fn(),
}))

const fetchRowsMock = vi.mocked(fetchMatchHistoryImpactRows)

beforeEach(() => {
  fetchRowsMock.mockReset()
})

function rpcRow(overrides: Partial<MatchHistoryImpactRpcRow> = {}): MatchHistoryImpactRpcRow {
  return {
    match_id: 'match-1',
    activity_type: 'basketball',
    settled_at: '2026-07-20T10:00:00.000Z',
    my_side: 0,
    my_stake_amount: 50,
    my_stake_currency: 'leaderboard_point',
    score_delta: 12,
    rating_before: 800,
    rating_after: 806,
    rating_delta: 6,
    ...overrides,
  }
}

describe('getMatchHistoryImpacts', () => {
  it('maps snake_case rows to camel_case and preserves nullable fields and server ratingDelta', async () => {
    fetchRowsMock.mockResolvedValue([
      rpcRow({
        match_id: 'match-nullable',
        my_stake_amount: null,
        my_stake_currency: null,
        score_delta: null,
        rating_before: null,
        rating_after: null,
        rating_delta: 4,
      }),
    ])

    const result = await getMatchHistoryImpacts(['match-nullable'])

    expect(result.get('match-nullable')).toEqual<MatchHistoryImpact>({
      matchId: 'match-nullable',
      activityType: 'basketball',
      settledAt: '2026-07-20T10:00:00.000Z',
      mySide: 0,
      myStakeAmount: null,
      myStakeCurrency: null,
      scoreDelta: null,
      ratingBefore: null,
      ratingAfter: null,
      ratingDelta: 4,
    })
  })

  it('deduplicates IDs, sorts them deterministically, and preserves that order in the Map', async () => {
    fetchRowsMock.mockResolvedValue([
      rpcRow({ match_id: 'match-z' }),
      rpcRow({ match_id: 'match-a' }),
      rpcRow({ match_id: 'match-b' }),
    ])

    const result = await getMatchHistoryImpacts(['match-z', 'match-a', 'match-z', 'match-b'])

    expect(fetchRowsMock).toHaveBeenCalledWith(['match-a', 'match-b', 'match-z'])
    expect([...result.keys()]).toEqual(['match-a', 'match-b', 'match-z'])
  })

  it('batches histories over the RPC limit without dropping recent matches', async () => {
    const ids = Array.from({ length: MAX_MATCH_HISTORY_IMPACT_IDS + 2 }, (_, index) => `match-${index}`)
    fetchRowsMock.mockImplementation(async (batch) => batch.map((matchId) => rpcRow({ match_id: matchId })))

    const result = await getMatchHistoryImpacts(ids)

    expect(result).toHaveLength(ids.length)
    expect(fetchRowsMock).toHaveBeenCalledTimes(2)
    expect(fetchRowsMock.mock.calls[0]?.[0]).toHaveLength(MAX_MATCH_HISTORY_IMPACT_IDS)
    expect(fetchRowsMock.mock.calls[1]?.[0]).toHaveLength(2)
  })

  it('maps response rows by matchId rather than by response position', async () => {
    fetchRowsMock.mockResolvedValue([
      rpcRow({ match_id: 'match-b', score_delta: -2 }),
      rpcRow({ match_id: 'match-a', score_delta: 8 }),
    ])

    const result = await getMatchHistoryImpacts(['match-a', 'match-b'])

    expect(result.get('match-a')?.scoreDelta).toBe(8)
    expect(result.get('match-b')?.scoreDelta).toBe(-2)
  })
})
