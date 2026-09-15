import type { AppLanguage } from '@/lib/i18n/language'
import type {
  ArenaRoundPhase,
  ArenaSessionActorRoundState,
} from '@/types/arenaSession'

export type ArenaStakeStartDisabledReason = 'captain' | 'waiting' | null

export type ArenaSessionStakeControlState = {
  ownProposalAmount: number | null
  draftAmount: number | null
  hasUnsavedProposal: boolean
  canSaveProposal: boolean
  canConfirmStake: boolean
  canStartRound: boolean
  startDisabledReason: ArenaStakeStartDisabledReason
}

const STAKE_CONTROL_PHASES = new Set<ArenaRoundPhase>([
  'stake_confirmation',
  'ready_to_start',
])

export function parseArenaStakeAmount(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null

  const amount = Number(trimmed)
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null
}

export function getValidActorProposalAmount(
  proposalAmount: number | null | undefined,
): number | null {
  return typeof proposalAmount === 'number'
    && Number.isSafeInteger(proposalAmount)
    && proposalAmount > 0
    ? proposalAmount
    : null
}

export function getArenaSessionStakeControlState(input: {
  phase: ArenaRoundPhase
  roundState: ArenaSessionActorRoundState
  draftAmount: number | null
  controlsFresh: boolean
}): ArenaSessionStakeControlState {
  const ownProposalAmount = getValidActorProposalAmount(input.roundState.proposalAmount)
  const hasUnsavedProposal = input.draftAmount !== ownProposalAmount
  const isStakeControlPhase = STAKE_CONTROL_PHASES.has(input.phase)
  const canSaveProposal = input.controlsFresh
    && isStakeControlPhase
    && input.roundState.capabilities.canEditOwnStake
    && input.draftAmount !== null
    && hasUnsavedProposal
  const canConfirmStake = input.controlsFresh
    && isStakeControlPhase
    && input.roundState.capabilities.canConfirmStake
    && ownProposalAmount !== null
    && !input.roundState.confirmed
    && !hasUnsavedProposal
  const canStartRound = input.controlsFresh
    && isStakeControlPhase
    && input.roundState.capabilities.canStartRound
  const startDisabledReason = canStartRound
    ? null
    : isStakeControlPhase && input.controlsFresh && !input.roundState.capabilities.isRoundCaptain
      ? 'captain'
      : isStakeControlPhase
        ? 'waiting'
        : null

  return {
    ownProposalAmount,
    draftAmount: input.draftAmount,
    hasUnsavedProposal,
    canSaveProposal,
    canConfirmStake,
    canStartRound,
    startDisabledReason,
  }
}

export function formatArenaStakeDeadline(
  deadlineAt: string | null,
  language: AppLanguage,
): string {
  if (!deadlineAt) return language === 'th' ? 'ยังไม่กำหนด' : 'No deadline'

  const deadline = new Date(deadlineAt)
  if (!Number.isFinite(deadline.getTime())) return language === 'th' ? 'ยังไม่กำหนด' : 'No deadline'

  const time = new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(deadline)

  return language === 'th' ? `ยืนยันก่อน ${time}` : `Confirm by ${time}`
}
