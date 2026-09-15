import type {
  AlphaRefereeDuty,
  AlphaRefereeLiveScoreDraft,
  AlphaRefereePlayerStatDraft,
  AlphaRefereeResultSubmission,
  AlphaRefereeRunningDraft,
  BasketballPlayerStatDraft,
  MatchInvite,
  MatchParticipant,
  MatchRefereeAssignment,
  MatchResultCorrectionRequest,
  MatchTeamResultCorrectionRequest,
  MatchWithRelations,
  Side,
} from '@/types/match'
import { normalizeHandle, validateHandleFormat } from '@/lib/users/userLookupService'
import { deriveRunningMode } from './matchConfig'

export const COOP_RUN_MIN_TEAM_DISTANCE_METERS = 1000

export type InviteeSlot = {
  handle: string
  side: Side
  /** Why this person is being invited. Threads through to the invite-participant edge fn. */
  kind?: 'open' | 'challenge'
}

export type MatchDetailState = {
  participants: MatchParticipant[]
  pendingInvites: MatchInvite[]
  myParticipant: MatchParticipant | null
  myPendingInvite: MatchInvite | null
  mySide: Side | null
  oppSide: Side | null
  sideA: MatchParticipant[]
  sideB: MatchParticipant[]
  pendingInvitesA: MatchInvite[]
  pendingInvitesB: MatchInvite[]
  potA: number
  potB: number
  sideAFull: boolean
  sideBFull: boolean
}

export type AlphaRefereeDutyState =
  | 'not_ready'
  | 'live_draft'
  | 'needs_result'
  | 'waiting_players'
  | 'correction_requested'
  | 'cleared'
  | 'superseded'
  | 'closed'

export type RefereePlayerStatDraftInput = {
  points: number
  rebounds: number
  assists: number
  blocks: number
  threePointersMade: number
}

export function buildInviteeSlots(teamSize: number, isCoop = false): InviteeSlot[] {
  const slots: InviteeSlot[] = []
  if (isCoop) {
    for (let i = 0; i < teamSize - 1; i++) slots.push({ handle: '', side: 0 })
    return slots
  }
  for (let i = 0; i < teamSize - 1; i++) slots.push({ handle: '', side: 0 })
  for (let i = 0; i < teamSize; i++) slots.push({ handle: '', side: 1 })
  return slots
}

export function getParticipantDisplayName(participant: MatchParticipant): string {
  return participant.users?.display_name || participant.users?.email?.split('@')[0] || 'Player'
}

export function getPotForSide(participants: MatchParticipant[], side: Side): number {
  return participants
    .filter((participant) => participant.side === side)
    .reduce((sum, participant) => sum + participant.stake_contribution, 0)
}

function isActiveParticipant(participant: MatchParticipant): boolean {
  return participant.is_active !== false
}

function isActiveAcceptedParticipant(participant: MatchParticipant): boolean {
  return isActiveParticipant(participant) && participant.accepted_at != null
}

function submittedRunDistanceMeters(
  submission: NonNullable<MatchWithRelations['match_submissions']>[number],
): number {
  return (
    (submission.activity_sessions as { running_activity_details?: { distance_meters?: number | null } } | null)
      ?.running_activity_details?.distance_meters ?? 0
  )
}

export function getCoopRunActiveTeamProgress(match: MatchWithRelations): {
  required: number
  submitted: number
  distanceMeters: number
} {
  if (!match.is_coop || match.activity_type !== 'running') {
    return { required: 0, submitted: 0, distanceMeters: 0 }
  }

  const activeUserIds = new Set(
    (match.match_participants ?? [])
      .filter(isActiveAcceptedParticipant)
      .map((participant) => participant.user_id),
  )
  const submittedUserIds = new Set<string>()
  let distanceMeters = 0

  for (const submission of match.match_submissions ?? []) {
    if (!activeUserIds.has(submission.submitted_by)) continue
    if (submittedUserIds.has(submission.submitted_by)) continue
    submittedUserIds.add(submission.submitted_by)
    distanceMeters += Math.max(0, submittedRunDistanceMeters(submission))
  }

  return {
    required: activeUserIds.size,
    submitted: submittedUserIds.size,
    distanceMeters,
  }
}

export function willCoopRunSubmitCompleteBelowMinimum(
  match: MatchWithRelations,
  userId: string,
  pendingDistanceMeters: number,
): boolean {
  if (!match.is_coop || match.activity_type !== 'running') return false

  const activeUserIds = new Set(
    (match.match_participants ?? [])
      .filter(isActiveAcceptedParticipant)
      .map((participant) => participant.user_id),
  )
  if (!activeUserIds.has(userId)) return false

  const progress = getCoopRunActiveTeamProgress(match)
  const alreadySubmitted = (match.match_submissions ?? []).some((submission) =>
    submission.submitted_by === userId,
  )
  const submittedAfter = progress.submitted + (alreadySubmitted ? 0 : 1)
  const distanceAfter = progress.distanceMeters + (alreadySubmitted ? 0 : Math.max(0, pendingDistanceMeters))

  return progress.required > 0 &&
    submittedAfter >= progress.required &&
    distanceAfter < COOP_RUN_MIN_TEAM_DISTANCE_METERS
}

export function getMatchDetailState(
  match: MatchWithRelations,
  userId: string
): MatchDetailState {
  const participants = (match.match_participants ?? []).filter(isActiveParticipant)
  const pendingInvites = (match.match_invites ?? []).filter((i) => i.status === 'pending')
  const myParticipant = participants.find((p) => p.user_id === userId) ?? null
  const myPendingInvite = pendingInvites.find((i) => i.invitee_user_id === userId) ?? null
  const mySide: Side | null = myParticipant?.side ?? myPendingInvite?.side ?? null
  const oppSide: Side | null = mySide === 0 ? 1 : mySide === 1 ? 0 : null
  const sideA = participants.filter((p) => p.side === 0)
  const sideB = participants.filter((p) => p.side === 1)
  const pendingInvitesA = pendingInvites.filter((i) => i.side === 0)
  const pendingInvitesB = pendingInvites.filter((i) => i.side === 1)
  const potA = getPotForSide(participants, 0)
  const potB = getPotForSide(participants, 1)

  // Slot capacity considers participants + pending invites, since
  // the invitee is "holding" the slot until they decide.
  const sideAOccupancy = sideA.length + pendingInvitesA.length
  const sideBOccupancy = sideB.length + pendingInvitesB.length
  const runningMode = deriveRunningMode(match.activity_type, match.rule_params, match.is_coop)
  const isSinglePoolRunning = runningMode === 'coop' || runningMode === 'ffa'

  return {
    participants,
    pendingInvites,
    myParticipant,
    myPendingInvite,
    mySide,
    oppSide,
    sideA,
    sideB,
    pendingInvitesA,
    pendingInvitesB,
    potA,
    potB,
    sideAFull: sideAOccupancy >= match.team_size_per_side,
    sideBFull: isSinglePoolRunning ? true : sideBOccupancy >= match.team_size_per_side,
  }
}

export function validateInviteeHandles(invitees: InviteeSlot[]): string | null {
  const normalized: string[] = []
  for (const slot of invitees) {
    const err = validateHandleFormat(slot.handle)
    if (err) return err
    normalized.push(normalizeHandle(slot.handle))
  }
  if (new Set(normalized).size !== normalized.length) return 'Each invitee must be unique.'
  return null
}

export function canCancelMatch(match: MatchWithRelations, userId: string): boolean {
  return match.created_by === userId && match.status === 'pending'
}

/**
 * Co-op running matches let participants drop out mid-match before they
 * post a valid (≥1km) run. Once a runner has contributed a counted run
 * the server rejects the leave to keep the team result honest.
 */
export function canLeaveCoopRunMatch(match: MatchWithRelations, userId: string): boolean {
  if (!match.is_coop) return false
  if (match.activity_type !== 'running') return false
  if (match.status !== 'accepted' && match.status !== 'in_progress') return false
  const me = (match.match_participants ?? []).find((p) => p.user_id === userId)
  if (!me) return false
  if (!isActiveParticipant(me)) return false
  const submission = match.match_submissions?.find((s) => s.submitted_by === userId)
  const submittedDistance =
    (submission?.activity_sessions as { running_activity_details?: { distance_meters?: number } } | null)
      ?.running_activity_details?.distance_meters ?? 0
  if (submittedDistance >= 1000) return false
  return true
}

/**
 * The creator can finish a co-op team run early once the active team has
 * cleared the 1 km floor; runners who never posted a session are dropped
 * server-side. Mirrors finish_coop_run_atomic's guards so the affordance
 * only shows when the server would accept it.
 */
export function canFinishCoopRunMatch(match: MatchWithRelations, userId: string): boolean {
  if (!match.is_coop) return false
  if (match.activity_type !== 'running') return false
  if (match.status !== 'in_progress') return false
  if (match.created_by !== userId) return false
  return getCoopRunActiveTeamProgress(match).distanceMeters >= 1000
}

export function canEditMatchStake(match: MatchWithRelations, userId: string): boolean {
  if (match.status !== 'pending') return false
  // Coop matches with no stake have nothing to edit — hide the affordance.
  if (match.is_coop && match.stake === 0) return false
  return (match.match_participants ?? []).some((p) => p.user_id === userId && isActiveParticipant(p))
}

export function getInviteeName(invite: MatchInvite): string {
  const u = invite.invitee
  // Prefer display_name → handle → email-local-part → 'Player'.
  // Optimistic invites set email='' (the friend picker doesn't expose
  // it), so the empty-string branch falls through naturally; handle is
  // what the picker DOES return, so it's the next-best label.
  return (
    u?.display_name ||
    (u?.handle ? `@${u.handle}` : '') ||
    u?.email?.split('@')[0] ||
    'Player'
  )
}

export function getPendingCancelRequest(match: MatchWithRelations) {
  return (match.match_cancel_requests ?? []).find((request) => request.status === 'pending') ?? null
}

export function getOpenTeamResultChallenge(match: MatchWithRelations) {
  return (match.match_abuse_reports ?? []).find((report) =>
    report.reason === 'team_result_incorrect' &&
    (report.status === 'open' || report.status === 'reviewing')
  ) ?? null
}

export function getTeamResultChallengeTargetUserId(
  match: MatchWithRelations,
  userId: string,
): string | null {
  const participant = (match.match_participants ?? []).find((p) => p.user_id === userId && isActiveParticipant(p))
  const userSide = participant?.side
  if (userSide == null) return null

  return (match.match_team_result_submissions ?? []).find((submission) =>
    submission.side_index !== userSide
  )?.submitted_by ?? null
}

export function getCurrentAlphaRefereeResult(
  match: MatchWithRelations,
): AlphaRefereeResultSubmission | null {
  return asArray(match.alpha_referee_result_submissions).find((result) =>
    result.status === 'pending_player_action'
  ) ?? null
}

export function getLatestAlphaRefereeResult(
  match: MatchWithRelations,
): AlphaRefereeResultSubmission | null {
  const results = asArray(match.alpha_referee_result_submissions)
  if (results.length === 0) return null
  return [...results].sort((a, b) => {
    if (a.status === 'pending_player_action' && b.status !== 'pending_player_action') return -1
    if (b.status === 'pending_player_action' && a.status !== 'pending_player_action') return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })[0] ?? null
}

export function getLatestAlphaRefereeLiveScoreDraft(
  match: MatchWithRelations,
): AlphaRefereeLiveScoreDraft | null {
  const drafts = asArray(match.alpha_referee_live_score_drafts)
  if (drafts.length === 0) return null
  return [...drafts].sort((a, b) => {
    if (a.status === 'correction_requested' && b.status !== 'correction_requested') return -1
    if (b.status === 'correction_requested' && a.status !== 'correction_requested') return 1
    if (a.status === 'open' && b.status === 'submitted') return -1
    if (b.status === 'open' && a.status === 'submitted') return 1
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })[0] ?? null
}

export function getAlphaRefereePlayerStatDrafts(
  match: MatchWithRelations,
): AlphaRefereePlayerStatDraft[] {
  return getLatestAlphaRefereeLiveScoreDraft(match)?.player_stats ?? []
}

export function getLatestAlphaRefereeRunningDraft(
  match: MatchWithRelations,
): AlphaRefereeRunningDraft | null {
  const drafts = asArray(match.alpha_referee_running_drafts)
  if (drafts.length === 0) return null
  return [...drafts].sort((a, b) => {
    if (a.status === 'correction_requested' && b.status !== 'correction_requested') return -1
    if (b.status === 'correction_requested' && a.status !== 'correction_requested') return 1
    if (a.status === 'open' && b.status === 'submitted') return -1
    if (b.status === 'open' && a.status === 'submitted') return 1
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })[0] ?? null
}

export function getActiveAlphaRefereeAssignment(match: MatchWithRelations): MatchRefereeAssignment | null {
  return asArray(match.match_referee_assignments).find((assignment) => assignment.status === 'assigned') ?? null
}

export function getRefereeAssignmentInProgress(match: MatchWithRelations): MatchRefereeAssignment | null {
  return asArray(match.match_referee_assignments).find(
    (assignment) => assignment.status === 'invited' || assignment.status === 'assigned',
  ) ?? null
}

export function hasActiveAlphaRefereeAssignment(match: MatchWithRelations): boolean {
  return getActiveAlphaRefereeAssignment(match) !== null
}

export function shouldBlockBasketballPlayerFinalSubmit(match: MatchWithRelations): boolean {
  return match.activity_type === 'basketball' && hasActiveAlphaRefereeAssignment(match)
}

export function getAlphaRefereePlayerStatDraft(
  match: MatchWithRelations,
  userId: string,
): AlphaRefereePlayerStatDraft | null {
  return getAlphaRefereePlayerStatDrafts(match).find((draft) => draft.user_id === userId) ?? null
}

export function getBasketballPlayerSelfStatDrafts(
  match: MatchWithRelations,
): BasketballPlayerStatDraft[] {
  return asArray(match.basketball_player_stat_drafts)
}

export function getBasketballPlayerSelfStatDraft(
  match: MatchWithRelations,
  userId: string,
): BasketballPlayerStatDraft | null {
  return getBasketballPlayerSelfStatDrafts(match).find((draft) => draft.user_id === userId) ?? null
}

export function getAlphaRefereeDraftScoreBySide(match: MatchWithRelations): Record<Side, number> {
  const scores: Record<Side, number> = { 0: 0, 1: 0 }
  for (const stat of getAlphaRefereePlayerStatDrafts(match)) {
    scores[stat.side_index] += stat.points
  }
  return scores
}

export function validateRefereePlayerStatDraftInput(
  input: RefereePlayerStatDraftInput,
  longRangePointValue = 3,
): string | null {
  const longShotLabel = longRangePointValue === 3 ? '3PM' : '2PT'
  const fields: Array<[keyof RefereePlayerStatDraftInput, string]> = [
    ['points', 'PTS'],
    ['rebounds', 'REB'],
    ['assists', 'AST'],
    ['blocks', 'BLK'],
    ['threePointersMade', longShotLabel],
  ]
  for (const [key, label] of fields) {
    const value = input[key]
    if (!Number.isInteger(value) || value < 0) {
      return `${label} ต้องเป็นเลขจำนวนเต็ม 0 ขึ้นไป`
    }
    if (value > 10_000) {
      return `${label} สูงเกินไป`
    }
  }
  if (input.threePointersMade * longRangePointValue > input.points) {
    return `PTS ต้องไม่น้อยกว่า ${longShotLabel} x ${longRangePointValue}`
  }
  return null
}

export function getAlphaRefereeResultKindForMatch(
  match: MatchWithRelations | AlphaRefereeDuty,
): 'team_score' | 'manual_running_result' | null {
  const activityType = isAlphaRefereeDuty(match) ? match.match.activityType : match.activity_type
  const ruleParams = isAlphaRefereeDuty(match) ? match.match.ruleParams : match.rule_params
  const isCoop = isAlphaRefereeDuty(match) ? match.match.isCoop : match.is_coop
  if (activityType === 'basketball' || activityType === 'badminton') return 'team_score'
  if (activityType !== 'running') return null

  const ruleMode = typeof ruleParams?.mode === 'string' && ruleParams.mode ? ruleParams.mode : 'manual'
  const runningMode = typeof ruleParams?.running_mode === 'string' && ruleParams.running_mode
    ? ruleParams.running_mode
    : 'race'
  if (ruleMode !== 'manual' || runningMode === 'coop' || runningMode === 'ffa' || isCoop) return null
  return 'manual_running_result'
}

export function getAlphaRefereeDutyState(
  source: MatchWithRelations | AlphaRefereeDuty,
  userId: string | null | undefined,
): AlphaRefereeDutyState {
  if (!userId) return 'closed'

  const assignment = getAlphaRefereeAssignmentForUser(source, userId)
  if (!assignment || assignment.status !== 'assigned') return 'closed'

  const draft = getAlphaRefereeStateDraft(source)
  if (draft?.status === 'correction_requested') return 'correction_requested'

  const result = getAlphaRefereeStateResult(source)
  if (result?.status === 'pending_player_action') return 'waiting_players'
  if (result?.status === 'cleared') return 'cleared'
  if (result?.status === 'superseded') return 'superseded'

  const status = isAlphaRefereeDuty(source) ? source.match.status : source.status
  if (status === 'pending') return 'not_ready'
  if (status !== 'accepted' && status !== 'in_progress') return 'closed'

  const resultKind = getAlphaRefereeResultKindForMatch(source)
  if (!resultKind) return 'closed'
  if (resultKind === 'team_score' && hasTeamResultSubmissions(source)) return 'closed'
  if (resultKind === 'manual_running_result' && hasMatchSubmissions(source)) return 'closed'
  if (draft?.status === 'open') return 'live_draft'

  return 'needs_result'
}

function isAlphaRefereeDuty(source: MatchWithRelations | AlphaRefereeDuty): source is AlphaRefereeDuty {
  return 'match' in source && 'assignmentId' in source
}

function getAlphaRefereeAssignmentForUser(
  source: MatchWithRelations | AlphaRefereeDuty,
  userId: string,
): { referee_user_id?: string; refereeUserId?: string; status: 'invited' | 'assigned' | 'declined' | 'removed' } | null {
  if (isAlphaRefereeDuty(source)) {
    if (source.refereeUserId !== userId) return null
    return { refereeUserId: source.refereeUserId, status: source.assignmentStatus }
  }
  return asArray(source.match_referee_assignments).find((assignment) =>
    assignment.referee_user_id === userId
  ) ?? null
}

function getAlphaRefereeStateResult(
  source: MatchWithRelations | AlphaRefereeDuty,
): { status: AlphaRefereeResultSubmission['status'] } | null {
  if (isAlphaRefereeDuty(source)) return source.latestResult
  return getLatestAlphaRefereeResult(source)
}

function getAlphaRefereeStateDraft(
  source: MatchWithRelations | AlphaRefereeDuty,
): { status: AlphaRefereeLiveScoreDraft['status'] } | null {
  if (isAlphaRefereeDuty(source)) return source.latestDraft ?? null
  return getLatestAlphaRefereeLiveScoreDraft(source) ?? getLatestAlphaRefereeRunningDraft(source)
}

function hasTeamResultSubmissions(source: MatchWithRelations | AlphaRefereeDuty): boolean {
  if (isAlphaRefereeDuty(source)) return source.match.teamResults.length > 0
  return (source.match_team_result_submissions ?? []).length > 0
}

function hasMatchSubmissions(source: MatchWithRelations | AlphaRefereeDuty): boolean {
  if (isAlphaRefereeDuty(source)) return source.match.submissions.length > 0
  return (source.match_submissions ?? []).length > 0
}

function asArray<T>(value: T[] | T | null | undefined): T[] {
  if (Array.isArray(value)) return value
  return value ? [value] : []
}

export function getPendingTeamResultCorrection(
  match: MatchWithRelations,
): MatchTeamResultCorrectionRequest | null {
  return (match.match_team_result_correction_requests ?? []).find((r) => r.status === 'pending') ?? null
}

export function canRequestTeamResultCorrection(match: MatchWithRelations, userId?: string): boolean {
  if (!userId || match.status !== 'in_progress') return false
  const submissions = match.match_team_result_submissions ?? []
  const both = submissions.some((s) => s.side_index === 0) && submissions.some((s) => s.side_index === 1)
  if (!both) return false
  if (getPendingTeamResultCorrection(match)) return false
  return (match.match_participants ?? []).some((p) => p.user_id === userId && isActiveParticipant(p))
}

export function canRespondTeamResultCorrection(match: MatchWithRelations, userId?: string): boolean {
  const pending = getPendingTeamResultCorrection(match)
  if (!pending || !userId) return false
  const me = (match.match_participants ?? []).find((p) => p.user_id === userId && isActiveParticipant(p))
  return me != null && me.side !== pending.requested_side
}

export function getMyTeamCorrectionToRespond(
  match: MatchWithRelations,
  userId?: string,
): MatchTeamResultCorrectionRequest | null {
  return canRespondTeamResultCorrection(match, userId) ? getPendingTeamResultCorrection(match) : null
}

export function canChallengeTeamResult(match: MatchWithRelations, userId: string): boolean {
  if (match.status !== 'in_progress') return false
  if (
    match.activity_type !== 'basketball' &&
    match.activity_type !== 'badminton'
  ) return false
  if (getOpenTeamResultChallenge(match)) return false
  const participant = (match.match_participants ?? []).find((p) => p.user_id === userId && isActiveParticipant(p))
  if (!participant) return false
  const submissions = match.match_team_result_submissions ?? []
  return submissions.some((submission) => submission.side_index === 0) &&
    submissions.some((submission) => submission.side_index === 1)
}

export function canRequestMutualCancel(match: MatchWithRelations, userId: string): boolean {
  if (!['accepted', 'in_progress', 'submitted', 'disputed'].includes(match.status)) return false
  if (getPendingCancelRequest(match)) return false
  return (match.match_participants ?? []).some((p) => p.user_id === userId && isActiveParticipant(p))
}

export function canRespondToMutualCancel(match: MatchWithRelations, userId: string): boolean {
  const pendingRequest = getPendingCancelRequest(match)
  if (!pendingRequest || pendingRequest.requested_by === userId) return false

  const responder = (match.match_participants ?? []).find((p) => p.user_id === userId && isActiveParticipant(p))
  const requester = (match.match_participants ?? []).find((p) =>
    p.user_id === pendingRequest.requested_by && isActiveParticipant(p)
  )
  if (!responder || !requester) return false

  return match.is_coop || responder.side !== requester.side
}

export function getPendingCorrectionRequest(match: MatchWithRelations): MatchResultCorrectionRequest | null {
  return (match.match_result_correction_requests ?? []).find((r) => r.status === 'pending') ?? null
}

export function canRequestResultCorrection(match: MatchWithRelations, userId: string): boolean {
  if (match.status !== 'submitted' && match.status !== 'disputed') return false
  if (getPendingCorrectionRequest(match)) return false
  return (match.match_participants ?? []).some((p) => p.user_id === userId && isActiveParticipant(p))
}

export function canRespondToResultCorrection(match: MatchWithRelations, userId: string): boolean {
  const pending = getPendingCorrectionRequest(match)
  if (!pending || pending.requested_by === userId) return false
  const responder = (match.match_participants ?? []).find((p) => p.user_id === userId && isActiveParticipant(p))
  const requester = (match.match_participants ?? []).find((p) => p.user_id === pending.requested_by && isActiveParticipant(p))
  if (!responder || !requester) return false
  return match.is_coop || responder.side !== requester.side
}
