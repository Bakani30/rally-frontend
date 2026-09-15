import { describe, expect, it } from 'vitest'

import {
  formatArenaStakeDeadline,
  getArenaSessionStakeControlState,
  getValidActorProposalAmount,
  parseArenaStakeAmount,
} from './arenaSessionStake'

const readyCaptain = {
  proposalAmount: 40,
  confirmed: false,
  capabilities: {
    isRoundCaptain: true,
    canEditOwnStake: true,
    canConfirmStake: true,
    canStartRound: true,
  },
} as const

describe('arena session stake presentation state', () => {
  it('accepts only positive safe integer proposals', () => {
    expect(parseArenaStakeAmount('42')).toBe(42)
    expect(parseArenaStakeAmount(' 42 ')).toBe(42)
    expect(parseArenaStakeAmount('')).toBeNull()
    expect(parseArenaStakeAmount('4.2')).toBeNull()
    expect(parseArenaStakeAmount('0')).toBeNull()
    expect(getValidActorProposalAmount(42)).toBe(42)
    expect(getValidActorProposalAmount(null)).toBeNull()
    expect(getValidActorProposalAmount(4.2)).toBeNull()
  })

  it('keeps confirm maxLoss bound to the actor proposal and current draft', () => {
    const state = getArenaSessionStakeControlState({
      phase: 'ready_to_start',
      roundState: readyCaptain,
      draftAmount: 40,
      controlsFresh: true,
    })

    expect(state.ownProposalAmount).toBe(40)
    expect(state.canConfirmStake).toBe(true)
    expect(state.canSaveProposal).toBe(false)

    const unsaved = getArenaSessionStakeControlState({
      phase: 'stake_confirmation',
      roundState: readyCaptain,
      draftAmount: 50,
      controlsFresh: true,
    })
    expect(unsaved.hasUnsavedProposal).toBe(true)
    expect(unsaved.canConfirmStake).toBe(false)
    expect(unsaved.canSaveProposal).toBe(true)
  })

  it('shows a disabled captain-only start affordance for non-captains', () => {
    const state = getArenaSessionStakeControlState({
      phase: 'ready_to_start',
      roundState: {
        ...readyCaptain,
        capabilities: {
          ...readyCaptain.capabilities,
          isRoundCaptain: false,
          canStartRound: false,
        },
      },
      draftAmount: 40,
      controlsFresh: true,
    })

    expect(state.canStartRound).toBe(false)
    expect(state.startDisabledReason).toBe('captain')
  })

  it('disables every round action while cached capabilities are not fresh', () => {
    const state = getArenaSessionStakeControlState({
      phase: 'ready_to_start',
      roundState: readyCaptain,
      draftAmount: 40,
      controlsFresh: false,
    })

    expect(state.canSaveProposal).toBe(false)
    expect(state.canConfirmStake).toBe(false)
    expect(state.canStartRound).toBe(false)
    expect(state.startDisabledReason).toBe('waiting')
  })

  it('formats a safe localized deadline without exposing raw values', () => {
    expect(formatArenaStakeDeadline('2026-08-05T10:05:00.000Z', 'en')).toContain('Confirm by')
    expect(formatArenaStakeDeadline('not-a-date', 'th')).toBe('ยังไม่กำหนด')
  })
})
