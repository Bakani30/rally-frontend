import { beforeEach, describe, expect, it, vi } from 'vitest'

import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import { upsertBasketballPlayerStatDraftRecord } from './basketballPlayerStatDraftRepository'

vi.mock('@/lib/supabase/invokeFunction', () => ({
  invokeAuthenticatedFunction: vi.fn(),
}))

const stats = {
  points: 7,
  rebounds: 2,
  assists: 1,
  blocks: 0,
  threePointersMade: 1,
}

describe('upsertBasketballPlayerStatDraftRecord', () => {
  beforeEach(() => {
    vi.mocked(invokeAuthenticatedFunction).mockReset()
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: { draftId: 'draft-id' },
      error: null,
    } as never)
  })

  it('keeps legacy stat payloads byte-compatible', async () => {
    await upsertBasketballPlayerStatDraftRecord({ matchId: 'legacy-match', stats, note: null })

    expect(invokeAuthenticatedFunction).toHaveBeenCalledWith('upsert-basketball-player-stat-draft', {
      body: { matchId: 'legacy-match', stats, note: null },
    })
  })

  it('sends both Arena CAS tokens, including a null first-draft revision', async () => {
    await upsertBasketballPlayerStatDraftRecord({
      matchId: 'arena-match',
      stats,
      expectedReviewEpoch: 3,
      expectedDraftRevision: null,
    })

    expect(invokeAuthenticatedFunction).toHaveBeenCalledWith('upsert-basketball-player-stat-draft', {
      body: {
        matchId: 'arena-match',
        stats,
        expectedReviewEpoch: 3,
        expectedDraftRevision: null,
      },
    })
  })
})
