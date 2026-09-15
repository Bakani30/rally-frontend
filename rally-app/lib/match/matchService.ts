import * as Crypto from 'expo-crypto'
import type { JoinMode, MatchLobby, MatchWithRelations, MyMatch, ProposedResultPayload, PublicStakeCurrency, Side } from '@/types/match'
import type { Activity } from './matchConfig'
import { MIN_STAKE } from './matchConfig'
import {
  isSupportedTeamSportLobbyTeamSize,
  type TeamSportLobbyActivity,
} from './basketballLobbyCourt'
import {
  acceptTeamResultRecord,
  acceptParticipantRecord,
  cancelInviteRecord,
  cancelMatchRecord,
  confirmMatchResultRecord,
  createMatchRecord,
  disputeMatchResultRecord,
  findJoinableMatchByCodeRecord,
  getMatchAnalysisSessionIdRecord,
  getMatchById,
  getPendingInviteStakeRecord,
  inviteParticipantRecord,
  joinMatchRecord,
  kickMatchParticipantRecord,
  type JoinMatchRecordResult,
  leaveMatchLobbyRecord,
  finishCoopRunRecord,
  type FinishCoopRunRecordResult,
  listOpenMatchLobbiesRecord,
  listMatchesByIds,
  listMyMatchesRecord,
  listMyPendingInvites as listMyPendingInvitesRecord,
  listUserMatchIds,
  reportMatchAbuseRecord,
  requestRematchRecord,
  requestTeamResultCorrectionRecord,
  respondInviteRecord,
  resultCorrectionRecord,
  startMatchRecord,
  unacceptParticipantRecord,
  updateLobbyPositionRecord,
  updateParticipantStakeRecord,
  type StartMatchRecordResult,
} from './matchRepository'
import type { InviteeSlot } from './matchRules'
import {
  canChallengeTeamResult,
  canCancelMatch,
  canFinishCoopRunMatch,
  canRequestMutualCancel,
  canRespondToResultCorrection,
  canRespondToMutualCancel,
  canRequestResultCorrection,
  getActiveAlphaRefereeAssignment,
  getOpenTeamResultChallenge,
} from './matchRules'
import { getCurrentMatchSubmission } from './matchSubmissions'
import { assertCanTransition } from './matchStateMachine'
import { validateProposedResult } from './resultCorrection'
import { resolveUserIdByHandle } from '@/lib/users/userLookupService'

export type JoinMatchResult = JoinMatchRecordResult

export type CreateMatchInput = {
  activity: Activity
  teamSize: number
  minStake: number
  creatorStake: number
  stakeCurrency?: PublicStakeCurrency
  ruleText?: string
  ruleParams?: Record<string, unknown>
  joinMode: JoinMode
  entryCode?: string
  deadline: Date
  invitees?: InviteeSlot[]
  creatorUserId: string
  isCoop?: boolean
}

export type CreateMatchResult = {
  matchId: string
  joinCode: string | null
}

export async function createMatch(
  input: CreateMatchInput,
  idempotencyKey: string,
): Promise<CreateMatchResult> {
  // The idempotency key is owned by the caller (useCreateMatch) and held STABLE
  // across a failed-then-retried create so the server returns the same lobby
  // instead of minting a duplicate. Generating it here per-call would defeat
  // the purpose — a retry would get a fresh key and dedup nothing.
  const result = await createMatchRecord({ ...input, idempotencyKey })

  const invitees = input.invitees ?? []
  if (invitees.length > 0) {
    for (const invitee of invitees) {
      const userId = await resolveUserIdByHandle(invitee.handle)
      if (userId === input.creatorUserId) throw new Error('You cannot invite yourself')

      await inviteParticipantRecord({
        matchId: result.matchId,
        userId,
        side: invitee.side,
        stake: input.creatorStake,
        kind: invitee.kind ?? 'open',
      })
    }
  }

  return result
}

export async function inviteParticipant(input: {
  matchId: string
  userId: string
  side: Side
  stake: number
}): Promise<void> {
  await inviteParticipantRecord({
    matchId: input.matchId,
    userId: input.userId,
    side: input.side,
    stake: input.stake,
  })
}

export function getMatch(matchId: string): Promise<MatchWithRelations | null> {
  return getMatchById(matchId)
}

export function getMatchAnalysisSessionId(matchId: string): Promise<string | null> {
  return getMatchAnalysisSessionIdRecord(matchId)
}

/**
 * One-tap rematch against the same opponent. The server clones the finished
 * match into a fresh pending room and re-invites the opponent (kind='rematch').
 * The idempotency key dedupes accidental double-taps into one room.
 */
export function requestRematch(
  originalMatchId: string,
): Promise<{ matchId: string; inviteId: string; idempotent: boolean }> {
  return requestRematchRecord({
    originalMatchId,
    idempotencyKey: Crypto.randomUUID(),
  })
}

export async function getMyMatches(userId: string): Promise<MyMatch[]> {
  return listMyMatchesRecord(userId)
}

export async function getVisibleMatchesForUser(userId: string): Promise<MyMatch[]> {
  const matchIds = await listUserMatchIds(userId)
  return listMatchesByIds(matchIds)
}

export function getMyPendingInvites(userId: string) {
  return listMyPendingInvitesRecord(userId)
}

export async function respondToInviteById(input: {
  inviteId: string
  action: 'accept' | 'decline'
  stake?: number
}): Promise<void> {
  let stake = input.stake
  if (input.action === 'accept') {
    if (stake == null) {
      stake = await getPendingInviteStakeRecord(input.inviteId)
    }
    if (!Number.isInteger(stake)) {
      throw new Error('Invite stake is unavailable')
    }
  }
  await respondInviteRecord({
    inviteId: input.inviteId,
    action: input.action,
    stake: input.action === 'accept' ? stake : undefined,
  })
}

export function getOpenMatchLobbies(): Promise<MatchLobby[]> {
  return listOpenMatchLobbiesRecord()
}

export function findJoinableMatchByCode(joinCode: string): Promise<MatchLobby | null> {
  const normalizedCode = joinCode.trim().toUpperCase()
  if (!normalizedCode) {
    throw new Error('Enter a join code')
  }

  return findJoinableMatchByCodeRecord(normalizedCode)
}

// Any participant confirms their own stake after reviewing the lobby.
// Creating or entering a room is not consent; this is the explicit commit.
export function acceptMatch(matchId: string): Promise<void> {
  return acceptParticipantRecord(matchId)
}

// Host (or any participant) revokes their own acceptance any time before the
// match starts — while still gathering consent ('pending') or after everyone is
// ready but pre-START ('accepted'). Revoking from 'accepted' reverts the room to
// 'pending' and releases the locked stakes server-side (see
// unaccept_participant_atomic). Used as anti-cheat when stake terms shift.
export async function unacceptMatch(input: {
  match: MatchWithRelations
  userId: string
}): Promise<void> {
  if (input.match.status !== 'pending' && input.match.status !== 'accepted') {
    throw new Error('You can only undo accept before the match starts')
  }
  const participant = input.match.match_participants.find((p) => p.user_id === input.userId)
  if (!participant) throw new Error('You are not a participant in this match')
  if (!participant.accepted_at) throw new Error('You have not accepted this match')

  return unacceptParticipantRecord(input.match.id)
}

export async function cancelInvite(inviteId: string): Promise<void> {
  return cancelInviteRecord(inviteId)
}

export async function respondToInvite(input: {
  match: MatchWithRelations
  inviteId: string
  action: 'accept' | 'decline'
  stake?: number
}): Promise<void> {
  if (input.match.status !== 'pending') {
    throw new Error('You can only respond while the match is pending')
  }
  const invite = (input.match.match_invites ?? []).find((i) => i.id === input.inviteId)
  if (!invite) throw new Error('Invite not found')
  if (invite.status !== 'pending') throw new Error('Invite is no longer pending')

  if (input.action === 'accept') {
    const stake = input.stake ?? input.match.stake
    if (!Number.isInteger(stake)) {
      throw new Error('Stake must be an integer')
    }
    if (stake < input.match.stake) {
      throw new Error(`Stake must be >= ${input.match.stake} (match minimum)`)
    }
  }

  await respondInviteRecord({
    inviteId: input.inviteId,
    action: input.action,
    stake: input.action === 'accept' ? input.stake : undefined,
  })
}

export async function startMatch(input: {
  match: MatchWithRelations
  userId: string
}): Promise<StartMatchRecordResult | null> {
  if (input.match.status === 'in_progress') return null
  const isParticipant = input.match.match_participants.some((p) => p.user_id === input.userId)
  // The assigned Alpha Referee runs the game and may start it on behalf of the
  // host, so they are allowed here even though they are not a player.
  const isAssignedReferee =
    getActiveAlphaRefereeAssignment(input.match)?.referee_user_id === input.userId
  if (!isParticipant && !isAssignedReferee) {
    throw new Error('You are not a participant in this match')
  }
  // Let the backend enforce status === 'accepted'; client cache may still show
  // 'pending' if the DB trigger flipped it before the last refetch landed.
  // Return the authoritative status/started_at so callers can flip the screen to
  // live immediately instead of waiting for a refetch or a remount.
  return startMatchRecord(input.match.id)
}


export async function updateParticipantStake(input: {
  match: MatchWithRelations
  userId: string
  newStake: number
}): Promise<void> {
  if (input.match.status !== 'pending') {
    throw new Error('Stake can only be edited while match is pending')
  }
  if (!Number.isInteger(input.newStake) || input.newStake < 0) {
    throw new Error('Stake must be a non-negative integer')
  }
  // Coop matches allow stake = 0; competitive matches require >= MIN_STAKE.
  const floor = input.match.is_coop ? input.match.stake : Math.max(MIN_STAKE, input.match.stake)
  if (input.newStake < floor) {
    throw new Error(`Stake must be >= ${floor} (match minimum)`)
  }
  const participant = input.match.match_participants.find((p) => p.user_id === input.userId)
  if (!participant) {
    throw new Error('You are not a participant in this match')
  }
  if (participant.stake_contribution === input.newStake) {
    return
  }

  return updateParticipantStakeRecord({
    matchId: input.match.id,
    newStake: input.newStake,
  })
}

export async function updateLobbyPosition(input: {
  match: MatchWithRelations
  userId: string
  side: Side
  positionKey: string
}): Promise<void> {
  if (!isTeamSportLobbyActivity(input.match.activity_type)) {
    throw new Error('Lobby positions are only available for basketball and badminton')
  }
  if (input.match.status !== 'pending' && input.match.status !== 'accepted') {
    throw new Error('Lobby positions can only be changed before the match starts')
  }
  if (!isSupportedTeamSportLobbyTeamSize(input.match.activity_type, input.match.team_size_per_side)) {
    throw new Error('Lobby positions are available for basketball 1v1/3v3/5v5 and badminton 1v1/2v2 rooms')
  }
  const participant = input.match.match_participants.find((p) => p.user_id === input.userId && p.is_active !== false)
  if (!participant) {
    throw new Error('You are not a participant in this match')
  }
  if (input.side !== 0 && input.side !== 1) {
    throw new Error('Team side must be Team A or Team B')
  }
  if (input.match.status === 'accepted' && participant.side !== input.side) {
    throw new Error('Team side can only be changed before everyone is ready')
  }
  return updateLobbyPositionRecord({
    matchId: input.match.id,
    side: input.side,
    positionKey: input.positionKey,
  })
}

export function isSupportedBasketballLobbyTeamSize(teamSize: number): teamSize is 1 | 3 | 5 {
  return isSupportedTeamSportLobbyTeamSize('basketball', teamSize)
}

function isTeamSportLobbyActivity(activityType: string): activityType is TeamSportLobbyActivity {
  return activityType === 'basketball' || activityType === 'badminton'
}

export function cancelMatch(input: { match: MatchWithRelations; userId: string }): Promise<void> {
  assertCanTransition(input.match.status, 'cancelled')
  if (!canCancelMatch(input.match, input.userId)) {
    throw new Error('Only the creator can cancel a pending match')
  }

  return cancelMatchRecord(input.match.id)
}

export function requestMutualCancel(input: { match: MatchWithRelations; userId: string }): Promise<void> {
  assertCanTransition(input.match.status, 'cancelled')
  if (!canRequestMutualCancel(input.match, input.userId)) {
    throw new Error('You can request mutual cancel only after the match is accepted')
  }

  return cancelMatchRecord(input.match.id, 'request')
}

export function respondToMutualCancel(input: {
  match: MatchWithRelations
  userId: string
  agree: boolean
}): Promise<void> {
  assertCanTransition(input.match.status, 'cancelled')
  if (!canRespondToMutualCancel(input.match, input.userId)) {
    throw new Error('Only the other side can respond to this cancel request')
  }

  return cancelMatchRecord(input.match.id, input.agree ? 'agree' : 'decline')
}

export function leaveMatch(input: { match: MatchWithRelations; userId: string }): Promise<void> {
  const { match, userId } = input
  const participant = match.match_participants.find((p) => p.user_id === userId)
  if (!participant) {
    throw new Error('You are not in this match')
  }

  const isCoopRunInProgress =
    match.is_coop &&
    match.activity_type === 'running' &&
    (match.status === 'accepted' || match.status === 'in_progress')

  if (match.status === 'pending') {
    if (match.created_by === userId) {
      throw new Error('Creator should cancel the match instead')
    }
    return leaveMatchLobbyRecord(match.id)
  }

  if (isCoopRunInProgress) {
    return leaveMatchLobbyRecord(match.id)
  }

  throw new Error('You can only leave before the match starts')
}

/**
 * Creator-only "finish now" for a co-op team run: settles whoever already
 * ran once the active team has cleared the 1 km floor. Runners who never
 * submitted are dropped server-side. The server enforces creator + floor;
 * this guard keeps the UI honest before the round-trip.
 */
export function finishCoopRun(input: {
  match: MatchWithRelations
  userId: string
}): Promise<FinishCoopRunRecordResult> {
  const { match, userId } = input
  if (!canFinishCoopRunMatch(match, userId)) {
    throw new Error('This team run cannot be finished yet')
  }
  return finishCoopRunRecord(match.id)
}

export function kickMatchParticipant(input: {
  match: MatchWithRelations
  hostUserId: string
  targetUserId: string
}): Promise<void> {
  const { match, hostUserId, targetUserId } = input
  if (match.created_by !== hostUserId) {
    throw new Error('Only the host can kick players')
  }
  if (targetUserId === hostUserId || targetUserId === match.created_by) {
    throw new Error('The host cannot kick themselves')
  }
  if (match.status !== 'pending' && match.status !== 'accepted') {
    throw new Error('Players can only be kicked before the match starts')
  }
  const target = match.match_participants.find((p) => p.user_id === targetUserId)
  if (!target) {
    throw new Error('That player is no longer in this match')
  }

  return kickMatchParticipantRecord({
    matchId: match.id,
    targetUserId,
  })
}

export function joinMatch(input: {
  matchId?: string
  joinCode?: string
  entryCode?: string
  side: Side
  stake: number
}): Promise<JoinMatchResult> {
  if (!input.matchId && !input.joinCode) {
    throw new Error('matchId or joinCode required')
  }

  return joinMatchRecord(input)
}

export async function confirmMatchResult(match: MatchWithRelations): Promise<void> {
  assertCanTransition(match.status, 'verified')
  const submission = getCurrentMatchSubmission(match)
  if (!submission) throw new Error('No submission found')

  return confirmMatchResultRecord({ matchId: match.id })
}

export async function acceptTeamResult(match: MatchWithRelations): Promise<void> {
  if (match.status !== 'in_progress') {
    throw new Error('Team results can only be accepted while the match is in progress')
  }
  if (
    match.activity_type !== 'basketball' &&
    match.activity_type !== 'badminton'
  ) {
    throw new Error('Only team sport results use this acceptance step')
  }
  const submissions = match.match_team_result_submissions ?? []
  if (!submissions.some((s) => s.side_index === 0) || !submissions.some((s) => s.side_index === 1)) {
    throw new Error('Both teams must submit scores before accepting')
  }
  if (getOpenTeamResultChallenge(match)) {
    throw new Error('Team result is waiting for admin review')
  }

  await acceptTeamResultRecord({ matchId: match.id })
}

export function challengeTeamResult(input: {
  match: MatchWithRelations
  reporterUserId: string
  reportedUserId: string | null
  note?: string | null
  evidencePaths?: string[]
}): Promise<string> {
  if (!canChallengeTeamResult(input.match, input.reporterUserId)) {
    if (getOpenTeamResultChallenge(input.match)) {
      throw new Error('This team result is already waiting for admin review')
    }
    throw new Error('Team result challenges are available after both teams submit scores')
  }
  if (input.reportedUserId === input.reporterUserId) {
    throw new Error('You cannot report yourself')
  }

  return reportMatchAbuseRecord({
    matchId: input.match.id,
    reportedUserId: input.reportedUserId,
    reason: 'team_result_incorrect',
    note: input.note ?? null,
    evidencePaths: input.evidencePaths ?? [],
  })
}

export async function disputeMatchResult(input: {
  match: MatchWithRelations
  userId: string
}): Promise<void> {
  assertCanTransition(input.match.status, 'disputed')
  const submission = getCurrentMatchSubmission(input.match)
  if (!submission) throw new Error('No submission found')
  if (submission.submitted_by === input.userId) {
    throw new Error('You cannot dispute your own submitted result')
  }
  const participant = input.match.match_participants.find((p) => p.user_id === input.userId)
  if (!participant) {
    throw new Error('You are not a participant in this match')
  }

  return disputeMatchResultRecord(input.match.id)
}

export function reportResultNotConfirmed(input: {
  match: MatchWithRelations
  reporterUserId: string
  reportedUserId: string | null
  note?: string | null
  evidencePaths?: string[]
}): Promise<string> {
  if (input.match.status !== 'submitted' && input.match.status !== 'disputed') {
    throw new Error('Reports are only available after a result is submitted')
  }
  const reporter = input.match.match_participants.find((p) => p.user_id === input.reporterUserId)
  if (!reporter) {
    throw new Error('Only match participants can report')
  }
  if (input.reportedUserId === input.reporterUserId) {
    throw new Error('You cannot report yourself')
  }

  return reportMatchAbuseRecord({
    matchId: input.match.id,
    reportedUserId: input.reportedUserId,
    reason: 'result_not_confirmed',
    note: input.note ?? null,
    evidencePaths: input.evidencePaths ?? [],
  })
}

export function requestResultCorrection(input: {
  match: MatchWithRelations
  userId: string
  proposed: ProposedResultPayload
}): Promise<void> {
  if (!canRequestResultCorrection(input.match, input.userId)) {
    throw new Error('You cannot request a correction for this match')
  }
  const validated = validateProposedResult(input.proposed, input.match.activity_type)
  if (!validated.ok) throw new Error(validated.reason)
  return resultCorrectionRecord(input.match.id, 'request', validated.payload)
}

export function agreeResultCorrection(input: {
  match: MatchWithRelations
  userId: string
}): Promise<void> {
  if (!canRespondToResultCorrection(input.match, input.userId)) {
    throw new Error('You cannot respond to this correction')
  }
  return resultCorrectionRecord(input.match.id, 'agree')
}

export function declineResultCorrection(input: {
  match: MatchWithRelations
  userId: string
}): Promise<void> {
  if (!canRespondToResultCorrection(input.match, input.userId)) {
    throw new Error('You cannot respond to this correction')
  }
  return resultCorrectionRecord(input.match.id, 'decline')
}

export function requestTeamResultCorrection(matchId: string) {
  return requestTeamResultCorrectionRecord(matchId, 'request')
}

export function agreeTeamResultCorrection(matchId: string) {
  return requestTeamResultCorrectionRecord(matchId, 'agree')
}

export function declineTeamResultCorrection(matchId: string) {
  return requestTeamResultCorrectionRecord(matchId, 'decline')
}
