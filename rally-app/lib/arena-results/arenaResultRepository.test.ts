import { beforeEach, describe, expect, it, vi } from 'vitest'
import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import {
  approveArenaResult,
  fetchArenaResultSnapshot,
  mutualCancelArenaResult,
  requestArenaResultCorrection,
  submitArenaResult,
} from './arenaResultRepository'

vi.mock('@/lib/supabase/invokeFunction', () => ({
  invokeAuthenticatedFunction: vi.fn(),
}))

vi.mock('@/lib/supabase/edgeError', () => ({
  extractEdgeFunctionError: vi.fn(),
}))

const HASH = 'a'.repeat(64)

describe('arenaResultRepository', () => {
  beforeEach(() => {
    vi.mocked(invokeAuthenticatedFunction).mockReset()
    vi.mocked(extractEdgeFunctionError).mockReset()
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: { arenaId: 'arena-id', roundId: 'round-id', matchId: 'match-id', result: {} },
      error: null,
    } as never)
  })

  it('uses only actor-scoped result GET and canonical result action bodies', async () => {
    await fetchArenaResultSnapshot('match/id')
    await submitArenaResult({
      matchId: 'match-id', side0Score: 11, side1Score: 8, note: 'Final', expectedReviewEpoch: 3,
    } as never)
    await approveArenaResult({
      matchId: 'match-id', resultVersion: 2, payloadHash: HASH, expectedReviewEpoch: 3,
    } as never)
    await requestArenaResultCorrection({
      matchId: 'match-id',
      resultVersion: 2,
      payloadHash: HASH,
      note: 'Please review',
      expectedReviewEpoch: 3,
    } as never)
    await mutualCancelArenaResult({
      matchId: 'match-id',
      cancelAction: 'agree',
      cancelRequestId: '77777777-7777-4777-8777-777777777777',
      expectedReviewEpoch: 3,
    } as never)

    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(
      1,
      'arena-events?view=result&matchId=match%2Fid',
      { method: 'GET' },
    )
    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(2, 'arena-events', {
      body: {
        action: 'submit_basketball_result',
        matchId: 'match-id',
        side0Score: 11,
        side1Score: 8,
        note: 'Final',
        expectedReviewEpoch: 3,
      },
    })
    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(
      3,
      'arena-events',
      {
        body: {
          action: 'approve_basketball_result',
          matchId: 'match-id',
          resultVersion: 2,
          payloadHash: HASH,
          expectedReviewEpoch: 3,
        },
      },
    )
    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(4, 'arena-events', {
      body: {
        action: 'request_basketball_result_correction',
        matchId: 'match-id',
        resultVersion: 2,
        payloadHash: HASH,
        note: 'Please review',
        expectedReviewEpoch: 3,
      },
    })
    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(5, 'arena-events', {
      body: {
        action: 'mutual_cancel_basketball_round',
        matchId: 'match-id',
        cancelAction: 'agree',
        cancelRequestId: '77777777-7777-4777-8777-777777777777',
        expectedReviewEpoch: 3,
      },
    })

    for (const call of vi.mocked(invokeAuthenticatedFunction).mock.calls) {
      expect(JSON.stringify(call)).not.toMatch(/userId|actorId|roundId|arenaId|wallet|winner/i)
    }
  })

  it('extracts the stable Edge error envelope for result reads and actions', async () => {
    const edgeError = { code: 'arena_result_version_conflict', message: 'stale' }
    const extracted = Object.assign(new Error('Result changed'), {
      code: 'arena_result_version_conflict',
      status: 409,
    })
    vi.mocked(extractEdgeFunctionError).mockResolvedValue(extracted)
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({ data: null, error: edgeError } as never)

    await expect(fetchArenaResultSnapshot('match-id')).rejects.toBe(extracted)
    await expect(approveArenaResult({
      matchId: 'match-id',
      resultVersion: 2,
      payloadHash: HASH,
      expectedReviewEpoch: 3,
    })).rejects.toBe(extracted)

    expect(extractEdgeFunctionError).toHaveBeenNthCalledWith(
      1,
      edgeError,
      'Failed to load Arena result',
    )
    expect(extractEdgeFunctionError).toHaveBeenNthCalledWith(
      2,
      edgeError,
      'Arena result action failed',
    )
  })

  it('allow-lists every POST body when hostile runtime inputs add actor fields or override action', async () => {
    await submitArenaResult({
      action: 'mutual_cancel_basketball_round',
      matchId: 'match-id',
      side0Score: 11,
      side1Score: 8,
      expectedReviewEpoch: 3,
      actorId: 'actor-id',
      userId: 'user-id',
      extra: 'ignored',
    } as never)
    await approveArenaResult({
      action: 'submit_basketball_result',
      matchId: 'match-id',
      resultVersion: 2,
      payloadHash: HASH,
      expectedReviewEpoch: 3,
      actorId: 'actor-id',
      extra: 'ignored',
    } as never)
    await requestArenaResultCorrection({
      action: 'approve_basketball_result',
      matchId: 'match-id',
      resultVersion: 2,
      payloadHash: HASH,
      expectedReviewEpoch: 3,
      userId: 'user-id',
      extra: 'ignored',
    } as never)
    await mutualCancelArenaResult({
      action: 'request_basketball_result_correction',
      matchId: 'match-id',
      cancelAction: 'agree',
      cancelRequestId: '77777777-7777-4777-8777-777777777777',
      expectedReviewEpoch: 3,
      actorId: 'actor-id',
      userId: 'user-id',
      extra: 'ignored',
    } as never)

    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(1, 'arena-events', {
      body: {
        action: 'submit_basketball_result',
        matchId: 'match-id',
        side0Score: 11,
        side1Score: 8,
        expectedReviewEpoch: 3,
      },
    })
    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(2, 'arena-events', {
      body: {
        action: 'approve_basketball_result',
        matchId: 'match-id',
        resultVersion: 2,
        payloadHash: HASH,
        expectedReviewEpoch: 3,
      },
    })
    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(3, 'arena-events', {
      body: {
        action: 'request_basketball_result_correction',
        matchId: 'match-id',
        resultVersion: 2,
        payloadHash: HASH,
        expectedReviewEpoch: 3,
      },
    })
    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(4, 'arena-events', {
      body: {
        action: 'mutual_cancel_basketball_round',
        matchId: 'match-id',
        cancelAction: 'agree',
        cancelRequestId: '77777777-7777-4777-8777-777777777777',
        expectedReviewEpoch: 3,
      },
    })
  })
})
