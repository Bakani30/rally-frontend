import type { ArenaEvent } from './arena'

export type ArenaSessionActivity = 'basketball' | 'badminton'
export type ArenaSessionTeamSize = 1 | 2 | 3 | 5
export type ArenaSessionJoinMode = 'open' | 'code' | 'private'

export type CreateArenaSessionInput = {
  idempotencyKey: string
  title: string
  activityType: ArenaSessionActivity
  teamSize: ArenaSessionTeamSize
  ruleText: string
  targetScore: number
  timeLimitSeconds: number
  joinMode: ArenaSessionJoinMode
  mode: 'casual'
} & (
  | { venueId: string; anchorLat?: never; anchorLng?: never }
  | { venueId?: never; anchorLat: number; anchorLng: number }
)

export type ArenaSessionActionInput =
  | ({ action: 'create' } & CreateArenaSessionInput)
  | { action: 'record_presence'; arenaEventId: string; currentLat: number; currentLng: number; accuracyM: number }
  | { action: 'open'; arenaEventId: string }
  | { action: 'stage_party'; arenaEventId: string; partyId: string; memberUserIds: string[] }
  | { action: 'leave'; arenaEventId: string }
  | { action: 'begin_drain'; arenaEventId: string }
  | { action: 'close'; arenaEventId: string; cancel?: boolean }

export type ArenaEventActionInput =
  | { action: 'update_stake_proposal'; roundId: string; amount: number; expectedStakeVersion: number }
  | { action: 'confirm_final_stake'; roundId: string; stakeVersion: number; maxLoss: number }
  | { action: 'start_round'; roundId: string; expectedStakeVersion: number }

export type ArenaPresenceResult = {
  arena_event_id?: string
  user_id?: string
  status?: string
  distance_m?: number
  accuracy_m?: number
  version?: number
  verified_at?: string | null
  revoked_at?: string | null
  revoke_reason?: string | null
}

export type ArenaSessionActionOutput = {
  resourceId: string
  result: {
    arenaEventId?: string
    arenaTeamId?: string
    draining?: boolean
    drainDeadlineAt?: string
  } & ArenaPresenceResult & Record<string, unknown>
}

export type ArenaSessionMembershipCandidate = {
  arenaId: string
  arenaTeamId: string
  userId: string
  acceptedAt: string | null
  isActive: boolean
}

export type ArenaSessionResolverInput = {
  userId: string
  arena: ArenaEvent | null
  membershipCandidate?: ArenaSessionMembershipCandidate | null
}

export type ArenaSessionMemberState = {
  arenaId: string
  teamId: string
  userId: string
  acceptedAt: string | null
}

export type ArenaSessionTeamStatus = 'queued' | 'on_deck' | 'active' | 'champion' | 'disputed'

export type ArenaSessionCanonicalTeamState = {
  [Status in ArenaSessionTeamStatus]: ArenaSessionMemberState & { status: Status }
}[ArenaSessionTeamStatus]

export type ArenaSessionState =
  | { status: 'idle' }
  | { status: 'syncing'; arenaId: string }
  | (ArenaSessionMemberState & { status: 'member_unavailable' })
  | (ArenaSessionMemberState & { status: 'forming'; phase: 'staged' | 'unready' })
  | ArenaSessionCanonicalTeamState
  | { status: 'closed' | 'cancelled'; arenaId: string }

export type ArenaSessionSnapshotSessionState =
  | 'preparing'
  | 'open'
  | 'draining'
  | 'closed'
  | 'cancelled'

export type ArenaSessionSnapshotActorRole = 'host' | 'member' | 'observer'
export type ArenaSessionSnapshotMemberState = 'staged' | 'ready' | 'left'
export type ArenaSessionSnapshotPresenceStatus = 'valid' | 'revoked' | 'required'

export type ArenaRoundPhase =
  | 'queue'
  | 'stake_confirmation'
  | 'ready_to_start'
  | 'active'
  | 'result_review'
  | 'settled'
  | 'cancelled'
  | 'void'

export type ArenaSessionLiveRoundPhase = Exclude<
  ArenaRoundPhase,
  'queue' | 'settled' | 'cancelled' | 'void'
>

export type ArenaSessionRoundCapabilities = {
  isRoundCaptain: boolean
  canEditOwnStake: boolean
  canConfirmStake: boolean
  canStartRound: boolean
}

export type ArenaSessionActorRoundState = {
  proposalAmount: number | null
  confirmed: boolean
  capabilities: ArenaSessionRoundCapabilities
}

export type ArenaTeamParticipationDecision = 'continue' | 'retire'
export type ArenaTeamParticipationState =
  | 'decision_required'
  | 'ready_to_pair'
  | 'paired'
  | 'retired'

export type ArenaTeamParticipationDetailedSnapshot = {
  participationCycleId: string
  teamId: string
  lane: 'champion' | 'queue'
  state: ArenaTeamParticipationState
  revision: number
  queuePosition: number | null
  blocksPairing: boolean
  capabilities: {
    canContinue: boolean
    canRetire: boolean
  }
}

export type ArenaTeamParticipationCoarseSnapshot = {
  blocksPairing: boolean
}

/**
 * The server returns the detailed form only to eligible roster/Party actors.
 * All other actors receive this coarse pairing state and no decision authority.
 */
export type ArenaTeamParticipationSnapshot =
  | ArenaTeamParticipationDetailedSnapshot
  | ArenaTeamParticipationCoarseSnapshot

export type ArenaTeamParticipationDecisionInput = {
  arenaId: string
  participationCycleId: string
  expectedRevision: number
  decision: ArenaTeamParticipationDecision
}

export type ArenaTeamParticipationActionResult = {
  arenaId: string
  result: {
    participationCycleId: string
    teamId: string
    state: ArenaTeamParticipationState
    revision: number
    decision: ArenaTeamParticipationDecision
    idempotent: boolean
  }
}

export type ArenaSessionLiveRoundStake = {
  version: number
  courtAvailableAt: string | null
  confirmationDeadlineAt: string | null
  confirmedCount: number
  requiredCount: number
}

export type ArenaSessionSnapshotTeamStatus =
  | 'forming'
  | 'queued'
  | 'on_deck'
  | 'active'
  | 'champion'
  | 'retired'
  | 'disputed'
  | 'removed'

export type ArenaSessionSnapshotRoundStatus =
  | 'stake_acceptance'
  | 'in_progress'
  | 'result_pending'
  | 'disputed'
  | 'settled'
  | 'cancelled'

export type ArenaSessionSnapshot = {
  /** Present on current server snapshots; older cached snapshots may omit it. */
  serverTime?: string
  session: {
    arenaEventId: string
    sourceKind: 'ad_hoc' | 'venue'
    mode: 'casual' | 'conquest'
    title: string
    activityType: ArenaSessionActivity
    teamSize: ArenaSessionTeamSize
    joinMode: ArenaSessionJoinMode
    sessionState: ArenaSessionSnapshotSessionState
    openedAt: string | null
    drainingAt: string | null
    drainDeadlineAt: string | null
    closedAt: string | null
    cancelledAt: string | null
    createdAt: string
    updatedAt: string
  }
  actor: {
    role: ArenaSessionSnapshotActorRole
    memberState?: ArenaSessionSnapshotMemberState
    teamId?: string
    presenceStatus: ArenaSessionSnapshotPresenceStatus
    canJoin: boolean
    /** Optional keeps older cached snapshots safe; server responses include both capabilities. */
    canOpen?: boolean
    canRecordPresence?: boolean
    activeMatchId?: string
    roundState?: ArenaSessionActorRoundState
  }
  /** Required after the Gate 3 quiesced cutover; repository parsing fails closed when absent. */
  teamParticipation: ArenaTeamParticipationSnapshot
  teams: {
    teamId: string
    name: string
    partyName?: string
    status: ArenaSessionSnapshotTeamStatus
    queuePosition: number | null
    members: {
      displayName: string | null
      handle: string | null
      avatarUrl: string | null
    }[]
  }[]
  rounds: {
    roundId: string
    status: ArenaSessionSnapshotRoundStatus
    championTeamId: string | null
    challengerTeamId: string | null
    winnerTeamId: string | null
    loserTeamId: string | null
    startedAt: string | null
    submittedAt: string | null
    settledAt: string | null
  }[]
  liveRound: {
    roundId: string
    status: 'stake_acceptance' | 'in_progress' | 'result_pending' | 'disputed'
    phase: ArenaSessionLiveRoundPhase
    /** Present only when the actor is a selected player in this live Round. */
    stake?: ArenaSessionLiveRoundStake
    champion: {
      teamId: string
      score: number | null
      members: {
        displayName: string | null
        handle: string | null
        avatarUrl: string | null
        positionKey: string | null
        /** Current server snapshots include this; older cached members may omit it. */
        isCaptain?: boolean
      }[]
    }
    challenger: {
      teamId: string
      score: number | null
      members: {
        displayName: string | null
        handle: string | null
        avatarUrl: string | null
        positionKey: string | null
        /** Current server snapshots include this; older cached members may omit it. */
        isCaptain?: boolean
      }[]
    }
  } | null
}

export type ArenaSessionBoardStatus =
  | 'forming'
  | 'queued'
  | 'on_deck'
  | 'active'
  | 'champion'
  | 'disputed'
  | 'draining'
  | 'closed'
  | 'cancelled'
  | 'member_unavailable'

export type ArenaSessionBoardModel = {
  snapshot: ArenaSessionSnapshot
  status: ArenaSessionBoardStatus
  actorRole: ArenaSessionSnapshotActorRole
  actorMemberState: ArenaSessionSnapshotMemberState | null
  presenceStatus: ArenaSessionSnapshotPresenceStatus
  canJoin: boolean
  canRecordPresence: boolean
  canReady: boolean
  canLeave: boolean
  canStage: boolean
  canOpen: boolean
  canBeginDrain: boolean
  canClose: boolean
  activeMatchId: string | null
  roundPhase: ArenaRoundPhase
  roundId: string | null
  roundState: ArenaSessionActorRoundState | null
  stake: ArenaSessionLiveRoundStake | null
  canEditOwnStake: boolean
  canConfirmStake: boolean
  canStartRound: boolean
  teamParticipation: ArenaTeamParticipationSnapshot
  drainDeadlineAt: string | null
  team: ArenaSessionSnapshot['teams'][number] | null
  teams: ArenaSessionSnapshot['teams']
  rounds: ArenaSessionSnapshot['rounds']
}
