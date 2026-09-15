export type ArenaResultStat = {
  side: 0 | 1
  isActor: boolean
  displayName: string | null
  handle: string | null
  avatarUrl: string | null
  points: number
  rebounds: number
  assists: number
  blocks: number
  threePointersMade: number
}

export type ArenaActorDraft = {
  points: number
  rebounds: number
  assists: number
  blocks: number
  threePointersMade: number
  note: string | null
  updatedAt: string
  draftRevision: number
}

export type ArenaResultCapabilities = {
  canSubmit: boolean
  canApprove: boolean
  canRequestCorrection: boolean
  canRequestCancel: boolean
  canAgreeCancel: boolean
  canDeclineCancel: boolean
  canWithdrawCancel: boolean
  canEditActorDraft: boolean
}

type ArenaResultSnapshotBase = {
  arenaEventId: string
  roundId: string
  matchId: string
  activityType: 'basketball'
  reviewEpoch: number
  draftReadiness: {
    draftCount: number
    requiredCount: number
    complete: boolean
  }
  actorDraft: ArenaActorDraft | null
  currentResult:
    | null
    | {
        kind: 'submitted'
        resultVersion: number
        statsVersion: number
        payloadHash: string
        submitterRole: 'captain' | 'referee'
        side0Score: number
        side1Score: number
        note: string | null
        submittedAt: string
        stats: ArenaResultStat[]
        approvals: {
          side0: boolean
          side1: boolean
          approvedCount: 0 | 1 | 2
          requiredCount: 2
          actorApproved: boolean
        }
      }
    | {
        kind: 'awaiting_resubmission'
        reason: 'correction_requested' | 'stat_edit'
        resultVersion: number
        statsVersion: number
        payloadHash: string
        previousSide0Score: number
        previousSide1Score: number
        note: string | null
        requestedByActor: boolean
      }
  cancellation:
    | { status: 'none'; cancelRequestId: null; requester: null }
    | { status: 'pending'; cancelRequestId: string; requester: 'self' | 'other' }
  actor: {
    role: 'captain' | 'player' | 'referee'
    side: 0 | 1 | null
    capabilities: ArenaResultCapabilities
  }
  outcome:
    | null
    | {
        status: 'settled'
        winnerSide: 0 | 1
        actorOutcome: 'win' | 'loss' | null
        rotation: {
          championStreak: number
          winnerRetired: boolean
          loserQueuePosition: number | null
          loserRetired: boolean
          appliedAt: string
        }
      }
    | {
        status: 'cancelled'
        winnerSide: null
        actorOutcome: 'cancelled' | null
        rotation: {
          actorQueuePosition: number | null
          otherTeamRequeued: boolean
          appliedAt: string
        }
      }
}

/**
 * Result routes may be opened from an old link before the paired Round starts
 * or after it closes before start. These narrow branches deliberately contain
 * no result data and no actions.
 */
export type ArenaResultPhase =
  | 'awaiting_start'
  | 'active'
  | 'awaiting_review'
  | 'awaiting_resubmission'
  | 'cancel_pending'
  | 'held'
  | 'settled'
  | 'cancelled'
  | 'closed_before_start'

/**
 * The parser validates the phase/status/result matrix at runtime. These
 * required tokens keep every mutation caller tied to an authoritative
 * snapshot, while the cancellation union prevents accidental requester IDs
 * or resolution actions without an opaque request identifier.
 */
export type ArenaRoundResultSnapshot = ArenaResultSnapshotBase & {
  phase: ArenaResultPhase
  matchStatus: 'pending' | 'in_progress' | 'disputed' | 'settled' | 'cancelled'
  roundStatus: 'stake_acceptance' | 'in_progress' | 'result_pending' | 'disputed' | 'settled' | 'cancelled'
}

export type SubmitArenaResultInput = {
  matchId: string
  side0Score: number
  side1Score: number
  note?: string
  expectedReviewEpoch: number
}

export type ApproveArenaResultInput = {
  matchId: string
  resultVersion: number
  payloadHash: string
  expectedReviewEpoch: number
}

export type RequestArenaResultCorrectionInput = ApproveArenaResultInput & {
  note?: string
}

export type MutualCancelArenaResultInput =
  | {
      matchId: string
      cancelAction: 'request'
      expectedReviewEpoch: number
    }
  | {
      matchId: string
      cancelAction: 'agree' | 'decline' | 'withdraw'
      cancelRequestId: string
      expectedReviewEpoch: number
    }

export type ArenaResultActionInput =
  | ({ action: 'submit_basketball_result' } & SubmitArenaResultInput)
  | ({ action: 'approve_basketball_result' } & ApproveArenaResultInput)
  | ({ action: 'request_basketball_result_correction' } & RequestArenaResultCorrectionInput)
  | ({ action: 'mutual_cancel_basketball_round' } & MutualCancelArenaResultInput)

export type ArenaResultActionOutput = {
  arenaId: string
  roundId: string
  matchId: string
  result: Record<string, unknown>
}
