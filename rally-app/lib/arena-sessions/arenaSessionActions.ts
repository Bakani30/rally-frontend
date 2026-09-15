import {
  confirmArenaFinalStake,
  startArenaSessionRound,
  updateArenaRoundStakeProposal,
} from '@/lib/arenas/arenaRepository'
import {
  chooseArenaTeamParticipation,
  invokeArenaSessionAction,
} from './arenaSessionRepository'
import type { ArenaActionOutput } from '@/types/arena'
import type {
  ArenaSessionActionOutput,
  ArenaTeamParticipationActionResult,
  ArenaTeamParticipationDecisionInput,
  CreateArenaSessionInput,
} from '@/types/arenaSession'

export const arenaSessionActions = {
  chooseTeamParticipation: (
    input: ArenaTeamParticipationDecisionInput,
  ): Promise<ArenaTeamParticipationActionResult> => chooseArenaTeamParticipation(input),
  create: (input: CreateArenaSessionInput): Promise<ArenaSessionActionOutput> =>
    invokeArenaSessionAction({ action: 'create', ...input }),
  recordPresence: (input: {
    arenaEventId: string
    currentLat: number
    currentLng: number
    accuracyM: number
  }): Promise<ArenaSessionActionOutput> =>
    invokeArenaSessionAction({ action: 'record_presence', ...input }),
  open: (arenaEventId: string): Promise<ArenaSessionActionOutput> =>
    invokeArenaSessionAction({ action: 'open', arenaEventId }),
  stageParty: (input: {
    arenaEventId: string
    partyId: string
    memberUserIds: string[]
  }): Promise<ArenaSessionActionOutput> =>
    invokeArenaSessionAction({ action: 'stage_party', ...input }),
  leave: (arenaEventId: string): Promise<ArenaSessionActionOutput> =>
    invokeArenaSessionAction({ action: 'leave', arenaEventId }),
  beginDrain: (arenaEventId: string): Promise<ArenaSessionActionOutput> =>
    invokeArenaSessionAction({ action: 'begin_drain', arenaEventId }),
  close: (input: { arenaEventId: string; cancel?: boolean }): Promise<ArenaSessionActionOutput> =>
    invokeArenaSessionAction({ action: 'close', ...input }),
  updateStakeProposal: (input: {
    roundId: string
    amount: number
    expectedStakeVersion: number
  }): Promise<ArenaActionOutput> =>
    updateArenaRoundStakeProposal(input),
  confirmFinalStake: (input: {
    roundId: string
    stakeVersion: number
    maxLoss: number
  }): Promise<ArenaActionOutput> =>
    confirmArenaFinalStake(input),
  startRound: (input: {
    roundId: string
    expectedStakeVersion: number
  }): Promise<ArenaActionOutput> =>
    startArenaSessionRound(input),
}
