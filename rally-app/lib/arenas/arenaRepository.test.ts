import { beforeEach, describe, expect, it, vi } from 'vitest'

import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import {
  confirmArenaFinalStake,
  startArenaRound,
  startArenaSessionRound,
  updateArenaRoundStakeProposal,
} from './arenaRepository'

vi.mock('@/lib/supabase/invokeFunction', () => ({
  invokeAuthenticatedFunction: vi.fn(),
}))

vi.mock('@/lib/supabase/edgeError', () => ({
  extractEdgeFunctionError: vi.fn(),
}))

describe('Arena Round trusted action repository', () => {
  beforeEach(() => {
    vi.mocked(invokeAuthenticatedFunction).mockReset().mockResolvedValue({
      data: { arenaId: 'arena-1', roundId: 'round-1' },
      error: null,
    } as never)
  })

  it.each([
    [
      () => updateArenaRoundStakeProposal({
        roundId: 'round-1',
        amount: 42,
        expectedStakeVersion: 3,
      }),
      {
        action: 'update_stake_proposal',
        roundId: 'round-1',
        amount: 42,
        expectedStakeVersion: 3,
      },
    ],
    [
      () => confirmArenaFinalStake({
        roundId: 'round-1',
        stakeVersion: 3,
        maxLoss: 42,
      }),
      {
        action: 'confirm_final_stake',
        roundId: 'round-1',
        stakeVersion: 3,
        maxLoss: 42,
      },
    ],
    [
      () => startArenaRound('round-1'),
      { action: 'start_round', roundId: 'round-1' },
    ],
    [
      () => startArenaSessionRound({ roundId: 'round-1', expectedStakeVersion: 3 }),
      { action: 'start_round', roundId: 'round-1', expectedStakeVersion: 3 },
    ],
  ] as const)('sends one exact actor-bound Arena action without a caller user id', async (run, body) => {
    await run()

    expect(invokeAuthenticatedFunction).toHaveBeenCalledWith('arena-events', { body })
    expect(JSON.stringify(body)).not.toContain('userId')
    expect(JSON.stringify(body)).not.toContain('actorId')
  })
})
