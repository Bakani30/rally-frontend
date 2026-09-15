import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  confirmArenaFinalStake,
  startArenaSessionRound,
  updateArenaRoundStakeProposal,
} from '@/lib/arenas/arenaRepository'
import { arenaSessionActions } from './arenaSessionActions'

vi.mock('@/lib/arenas/arenaRepository', () => ({
  updateArenaRoundStakeProposal: vi.fn(),
  confirmArenaFinalStake: vi.fn(),
  startArenaSessionRound: vi.fn(),
}))

vi.mock('./arenaSessionRepository', () => ({
  invokeArenaSessionAction: vi.fn(),
}))

describe('arenaSessionActions round stake wrappers', () => {
  beforeEach(() => {
    vi.mocked(updateArenaRoundStakeProposal).mockReset()
    vi.mocked(confirmArenaFinalStake).mockReset()
    vi.mocked(startArenaSessionRound).mockReset()
    vi.mocked(updateArenaRoundStakeProposal).mockResolvedValue({ arenaId: 'arena-1' })
    vi.mocked(confirmArenaFinalStake).mockResolvedValue({ arenaId: 'arena-1' })
    vi.mocked(startArenaSessionRound).mockResolvedValue({ arenaId: 'arena-1' })
  })

  it('updates a stake proposal through the Arena event action', async () => {
    await arenaSessionActions.updateStakeProposal({
      roundId: 'round-1',
      amount: 42,
      expectedStakeVersion: 3,
    })

    expect(updateArenaRoundStakeProposal).toHaveBeenCalledWith({
      roundId: 'round-1',
      amount: 42,
      expectedStakeVersion: 3,
    })
  })

  it('confirms the final stake through the Arena event action', async () => {
    await arenaSessionActions.confirmFinalStake({
      roundId: 'round-1',
      stakeVersion: 3,
      maxLoss: 42,
    })

    expect(confirmArenaFinalStake).toHaveBeenCalledWith({
      roundId: 'round-1',
      stakeVersion: 3,
      maxLoss: 42,
    })
  })

  it('starts a round with the expected stake version through the Arena event action', async () => {
    await arenaSessionActions.startRound({
      roundId: 'round-1',
      expectedStakeVersion: 3,
    })

    expect(startArenaSessionRound).toHaveBeenCalledWith({
      roundId: 'round-1',
      expectedStakeVersion: 3,
    })
  })
})
