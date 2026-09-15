import { allowPolicy, denyPolicy, policyFromBoolean, type PolicyDecision } from '@/lib/policy/policyDecision'
import type { UserWallet } from '@/lib/wallet/walletTypes'
import type { MatchWithRelations } from '@/types/match'

import { COOP_RUNNING_MIN_RUNNERS, deriveRunningMode } from './matchConfig'
import {
  canCancelMatch,
  canChallengeTeamResult,
  canEditMatchStake,
  canLeaveCoopRunMatch,
  canRequestMutualCancel,
  canRespondToMutualCancel,
  getMatchDetailState,
  getOpenTeamResultChallenge,
  getPendingCancelRequest,
} from './matchRules'
import { getCurrentMatchSubmission } from './matchSubmissions'

export type MatchDetailPolicy = {
  join: PolicyDecision<JoinPolicyReason>
  cancelMatch: PolicyDecision<CancelMatchPolicyReason>
  leaveMatch: PolicyDecision<LeaveMatchPolicyReason>
  requestMutualCancel: PolicyDecision<MutualCancelPolicyReason>
  respondMutualCancel: PolicyDecision<RespondMutualCancelPolicyReason>
  editStake: PolicyDecision<EditStakePolicyReason>
  challengeTeamResult: PolicyDecision<ChallengeTeamResultPolicyReason>
  reportResultNotConfirmed: PolicyDecision<ReportResultPolicyReason>
  startMatch: PolicyDecision<StartMatchPolicyReason>
  submitResult: PolicyDecision<SubmitResultPolicyReason>
}

export type JoinPolicyReason =
  | 'already_participant'
  | 'pending_invite_exists'
  | 'match_not_pending'
  | 'join_mode_closed'

export type CancelMatchPolicyReason = 'not_match_host' | 'match_not_pending'

export type LeaveMatchPolicyReason =
  | 'not_participant'
  | 'host_cannot_leave_pending'
  | 'match_not_leaveable'

export type MutualCancelPolicyReason =
  | 'cancel_request_pending'
  | 'not_active_match'
  | 'not_participant'

export type RespondMutualCancelPolicyReason =
  | 'no_cancel_request'
  | 'own_cancel_request'
  | 'same_side_cancel_request'
  | 'not_participant'

export type EditStakePolicyReason =
  | 'match_not_pending'
  | 'coop_zero_stake'
  | 'not_participant'

export type ChallengeTeamResultPolicyReason =
  | 'match_not_in_progress'
  | 'not_team_sport'
  | 'team_result_challenge_open'
  | 'not_participant'
  | 'waiting_for_both_team_results'

export type ReportResultPolicyReason =
  | 'match_not_submitted'
  | 'not_submitter'
  | 'no_opponent_to_report'

export type StartMatchPolicyReason =
  | 'not_match_host'
  | 'host_not_accepted'
  | 'waiting_for_all_players'
  | 'sides_not_ready'
  | 'coop_needs_min_runners'
  | 'match_not_accepted'

export type SubmitResultPolicyReason = 'match_not_active'

const joinableModes = new Set(['open', 'code', 'private'])
const teamSports = new Set(['basketball', 'badminton'])

export function buildMatchDetailPolicy(
  match: MatchWithRelations,
  userId: string,
  _currentWallet?: UserWallet | null,
): MatchDetailPolicy {
  const detail = getMatchDetailState(match, userId)
  const isParticipant = !!detail.myParticipant
  const pendingCancelRequest = getPendingCancelRequest(match)
  const openTeamResultChallenge = getOpenTeamResultChallenge(match)
  const teamResultSubmissions = match.match_team_result_submissions ?? []
  const hasBothTeamResults =
    teamResultSubmissions.some((submission) => submission.side_index === 0) &&
    teamResultSubmissions.some((submission) => submission.side_index === 1)
  const submission = getCurrentMatchSubmission(match)
  const participants = detail.participants

  return {
    join: resolveJoinDecision(match, isParticipant, !!detail.myPendingInvite),
    cancelMatch: resolveCancelMatchDecision(match, userId),
    leaveMatch: resolveLeaveDecision(match, userId, isParticipant),
    requestMutualCancel: resolveRequestMutualCancelDecision(match, userId, !!pendingCancelRequest),
    respondMutualCancel: resolveRespondMutualCancelDecision(match, userId, !!pendingCancelRequest),
    editStake: resolveEditStakeDecision(match, userId, isParticipant),
    challengeTeamResult: resolveChallengeTeamResultDecision(
      match,
      userId,
      isParticipant,
      !!openTeamResultChallenge,
      hasBothTeamResults,
    ),
    reportResultNotConfirmed: resolveReportResultNotConfirmedDecision(
      match,
      userId,
      submission?.submitted_by ?? null,
      participants.some((participant) => participant.user_id !== userId),
    ),
    startMatch: resolveStartMatchDecision(match, userId, detail),
    submitResult: policyFromBoolean(
      match.status === 'accepted' || match.status === 'in_progress',
      'match_not_active',
      { cta: 'Submit result' },
    ),
  }
}

function resolveJoinDecision(
  match: MatchWithRelations,
  isParticipant: boolean,
  hasPendingInvite: boolean,
): PolicyDecision<JoinPolicyReason> {
  if (isParticipant) return denyPolicy('already_participant', { cta: 'Joined' })
  if (hasPendingInvite) return denyPolicy('pending_invite_exists', { cta: 'Respond to invite' })
  if (match.status !== 'pending') return denyPolicy('match_not_pending', { cta: 'Join' })
  if (!joinableModes.has(match.join_mode)) return denyPolicy('join_mode_closed', { cta: 'Invite only' })
  return allowPolicy({ cta: 'Join' })
}

function resolveCancelMatchDecision(
  match: MatchWithRelations,
  userId: string,
): PolicyDecision<CancelMatchPolicyReason> {
  if (canCancelMatch(match, userId)) return allowPolicy({ cta: 'Cancel match' })
  if (match.created_by !== userId) return denyPolicy('not_match_host', { cta: 'Cancel match' })
  return denyPolicy('match_not_pending', { cta: 'Cancel match' })
}

function resolveLeaveDecision(
  match: MatchWithRelations,
  userId: string,
  isParticipant: boolean,
): PolicyDecision<LeaveMatchPolicyReason> {
  const canLeavePending = match.status === 'pending' && isParticipant && match.created_by !== userId
  if (canLeavePending || canLeaveCoopRunMatch(match, userId)) return allowPolicy({ cta: 'Leave match' })
  if (!isParticipant) return denyPolicy('not_participant', { cta: 'Leave match' })
  if (match.status === 'pending' && match.created_by === userId) {
    return denyPolicy('host_cannot_leave_pending', { cta: 'Leave match' })
  }
  return denyPolicy('match_not_leaveable', { cta: 'Leave match' })
}

function resolveRequestMutualCancelDecision(
  match: MatchWithRelations,
  userId: string,
  hasPendingCancelRequest: boolean,
): PolicyDecision<MutualCancelPolicyReason> {
  if (hasPendingCancelRequest) return denyPolicy('cancel_request_pending', { cta: 'Request cancel' })
  if (canRequestMutualCancel(match, userId)) return allowPolicy({ cta: 'Request cancel' })
  if (match.status !== 'accepted' && match.status !== 'in_progress') {
    return denyPolicy('not_active_match', { cta: 'Request cancel' })
  }
  return denyPolicy('not_participant', { cta: 'Request cancel' })
}

function resolveRespondMutualCancelDecision(
  match: MatchWithRelations,
  userId: string,
  hasPendingCancelRequest: boolean,
): PolicyDecision<RespondMutualCancelPolicyReason> {
  const pendingRequest = getPendingCancelRequest(match)
  if (!hasPendingCancelRequest || !pendingRequest) {
    return denyPolicy('no_cancel_request', { cta: 'Respond to cancel request' })
  }
  if (pendingRequest.requested_by === userId) {
    return denyPolicy('own_cancel_request', { cta: 'Respond to cancel request' })
  }
  if (canRespondToMutualCancel(match, userId)) return allowPolicy({ cta: 'Respond to cancel request' })
  const responder = (match.match_participants ?? []).find((participant) => participant.user_id === userId)
  return denyPolicy(responder ? 'same_side_cancel_request' : 'not_participant', {
    cta: 'Respond to cancel request',
  })
}

function resolveEditStakeDecision(
  match: MatchWithRelations,
  userId: string,
  isParticipant: boolean,
): PolicyDecision<EditStakePolicyReason> {
  if (canEditMatchStake(match, userId)) return allowPolicy({ cta: 'Edit stake' })
  if (match.status !== 'pending') return denyPolicy('match_not_pending', { cta: 'Edit stake' })
  if (match.is_coop && match.stake === 0) return denyPolicy('coop_zero_stake', { cta: 'Edit stake' })
  return denyPolicy(isParticipant ? 'match_not_pending' : 'not_participant', { cta: 'Edit stake' })
}

function resolveChallengeTeamResultDecision(
  match: MatchWithRelations,
  userId: string,
  isParticipant: boolean,
  hasOpenTeamResultChallenge: boolean,
  hasBothTeamResults: boolean,
): PolicyDecision<ChallengeTeamResultPolicyReason> {
  if (canChallengeTeamResult(match, userId)) return allowPolicy({ cta: 'Challenge score' })
  if (match.status !== 'in_progress') return denyPolicy('match_not_in_progress', { cta: 'Challenge score' })
  if (!teamSports.has(match.activity_type)) return denyPolicy('not_team_sport', { cta: 'Challenge score' })
  if (hasOpenTeamResultChallenge) {
    return denyPolicy('team_result_challenge_open', { cta: 'Challenge score' })
  }
  if (!isParticipant) return denyPolicy('not_participant', { cta: 'Challenge score' })
  if (!hasBothTeamResults) return denyPolicy('waiting_for_both_team_results', { cta: 'Challenge score' })
  return denyPolicy('not_participant', { cta: 'Challenge score' })
}

function resolveReportResultNotConfirmedDecision(
  match: MatchWithRelations,
  userId: string,
  submittedBy: string | null,
  hasOpponent: boolean,
): PolicyDecision<ReportResultPolicyReason> {
  if (match.status !== 'submitted') return denyPolicy('match_not_submitted', { cta: 'Report result' })
  if (submittedBy !== userId) return denyPolicy('not_submitter', { cta: 'Report result' })
  if (!hasOpponent) return denyPolicy('no_opponent_to_report', { cta: 'Report result' })
  return allowPolicy({ cta: 'Report result' })
}

function resolveStartMatchDecision(
  match: MatchWithRelations,
  userId: string,
  detail: ReturnType<typeof getMatchDetailState>,
  currentWallet?: UserWallet | null,
): PolicyDecision<StartMatchPolicyReason> {
  const runningMode = deriveRunningMode(match.activity_type, match.rule_params, match.is_coop)
  const isSinglePoolRunning = runningMode === 'coop' || runningMode === 'ffa'
  const participantCount = detail.participants.length
  const acceptedCount = detail.participants.filter((participant) => !!participant.accepted_at).length
  const hostAccepted = !!detail.myParticipant?.accepted_at
  const allJoinedParticipantsAccepted = participantCount > 0 && acceptedCount === participantCount
  const sidesReady = isSinglePoolRunning
    ? detail.sideA.length > 0
    : detail.sideA.length > 0 && detail.sideB.length > 0

  if (match.created_by !== userId) return denyPolicy('not_match_host', { cta: 'START' })
  if (!hostAccepted) {
    return denyPolicy('host_not_accepted', {
      cta: 'START',
      message: 'คุณยังไม่ได้ยอมรับเงื่อนไข',
    })
  }
  if (!allJoinedParticipantsAccepted) {
    return denyPolicy('waiting_for_all_players', {
      cta: 'START',
      message: `Waiting for lobby players to accept (${acceptedCount}/${participantCount})`,
    })
  }
  if (!sidesReady) {
    return denyPolicy('sides_not_ready', {
      cta: 'START',
      message: isSinglePoolRunning ? 'รอสมาชิกให้ครบใน pool เดียว' : 'ต้องมีผู้เล่นในห้องทั้งสองฝั่ง',
    })
  }
  if (runningMode === 'coop' && detail.sideA.length < COOP_RUNNING_MIN_RUNNERS) {
    return denyPolicy('coop_needs_min_runners', {
      cta: 'START',
      message: `วิ่งแบบทีมต้องมีอย่างน้อย ${COOP_RUNNING_MIN_RUNNERS} คน`,
    })
  }

  if (match.status !== 'pending' && match.status !== 'accepted') {
    return denyPolicy('match_not_accepted', {
      cta: 'START',
      message: 'รอ lobby พร้อมเริ่ม',
    })
  }
  return allowPolicy({ cta: 'START' })
}
