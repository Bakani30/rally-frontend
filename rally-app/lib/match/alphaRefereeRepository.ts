import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type { AlphaRefereeDuty, ScoreLogPeriod } from '@/types/match'

export type AlphaRefereeActivity = 'running' | 'basketball' | 'badminton'
export type AlphaRefereeAccessSource = 'application' | 'appointment' | 'both'

export type AlphaRefereeEligibility = {
  activityType: AlphaRefereeActivity
  appliedAt: string | null
  eligible: boolean
  settledMatchCount: number
  requiredSettledMatches: 1
  accessSource: AlphaRefereeAccessSource | null
  appointedLevel: number | null
  appointmentValidUntil: string | null
}

export type ApplyAlphaRefereeRecordInput = {
  activityType: AlphaRefereeActivity
}

export type ApplyAlphaRefereeRecordResult = {
  activityType: AlphaRefereeActivity
  applicationStatus: 'applied' | 'eligible' | 'blocked'
  eligible: boolean
  settledMatchCount: number
  requiredSettledMatches: 1
  accessSource: AlphaRefereeAccessSource
  appointedLevel: number | null
}

export async function applyAlphaRefereeRecord(
  input: ApplyAlphaRefereeRecordInput,
): Promise<ApplyAlphaRefereeRecordResult> {
  const { data, error } = await invokeAuthenticatedFunction<ApplyAlphaRefereeRecordResult>(
    'apply-alpha-referee',
    { body: input },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to apply for Alpha Referee')
  if (!data?.activityType) throw new Error('apply-alpha-referee returned no activityType')
  return data
}

export type ListAlphaRefereeEligibilityRecordInput = {
  activityTypes?: AlphaRefereeActivity[]
}

export type ListAlphaRefereeEligibilityRecordResult = {
  activities: AlphaRefereeEligibility[]
}

export type ListAlphaRefereeDutiesRecordResult = {
  duties: AlphaRefereeDuty[]
}

export async function listAlphaRefereeEligibilityRecord(
  input: ListAlphaRefereeEligibilityRecordInput = {},
): Promise<ListAlphaRefereeEligibilityRecordResult> {
  const { data, error } = await invokeAuthenticatedFunction<ListAlphaRefereeEligibilityRecordResult>(
    'list-alpha-referee-eligibility',
    { body: input },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load Alpha Referee eligibility')
  if (!Array.isArray(data?.activities)) {
    throw new Error('list-alpha-referee-eligibility returned no activities')
  }
  return data
}

export async function listAlphaRefereeDutiesRecord(): Promise<ListAlphaRefereeDutiesRecordResult> {
  const { data, error } = await invokeAuthenticatedFunction<ListAlphaRefereeDutiesRecordResult>(
    'list-alpha-referee-duties',
    { body: {} },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load Alpha Referee duties')
  if (!Array.isArray(data?.duties)) {
    throw new Error('list-alpha-referee-duties returned no duties')
  }
  return data
}

export type AssignMatchRefereeRecordInput = {
  matchId: string
  refereeUserId: string
}

export type AssignMatchRefereeRecordResult = {
  assignmentId: string
  matchId: string
  refereeUserId: string
  activityType: AlphaRefereeActivity
  status: 'invited'
}

export async function assignMatchRefereeRecord(
  input: AssignMatchRefereeRecordInput,
): Promise<AssignMatchRefereeRecordResult> {
  const { data, error } = await invokeAuthenticatedFunction<AssignMatchRefereeRecordResult>(
    'assign-match-referee',
    { body: input },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to assign Alpha Referee')
  if (!data?.assignmentId) throw new Error('assign-match-referee returned no assignmentId')
  return data
}

export type TeamScoreRefereeResult = {
  kind: 'team_score'
  side0Score?: number
  side1Score?: number
  note?: string | null
  proofPaths?: string[]
  scoreLog?: ScoreLogPeriod[]
}

export type ManualRunningRefereeResult = {
  kind: 'manual_running_result'
  winnerSide: 0 | 1 | null
  isTie: boolean
  runningDraftId?: string | null
  note?: string | null
  proofPaths?: string[]
}

export type RefereeMatchResult = TeamScoreRefereeResult | ManualRunningRefereeResult

export type SubmitRefereeMatchResultRecordInput = {
  matchId: string
  result: RefereeMatchResult
}

export type SubmitRefereeMatchResultRecordResult = {
  refereeResultId: string
  matchId: string
  matchStatus: 'in_progress' | 'submitted'
  pendingPlayerAction: true
  playerAction: 'confirm_or_dispute_match_result' | 'accept_or_report_team_result'
  winnerSide: 0 | 1 | null
  isTie: boolean
}

export async function submitRefereeMatchResultRecord(
  input: SubmitRefereeMatchResultRecordInput,
): Promise<SubmitRefereeMatchResultRecordResult> {
  const { data, error } = await invokeAuthenticatedFunction<SubmitRefereeMatchResultRecordResult>(
    'submit-referee-match-result',
    { body: input },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to submit referee result')
  if (!data?.refereeResultId) {
    throw new Error('submit-referee-match-result returned no refereeResultId')
  }
  return data
}

export type RefereePlayerStatInput = {
  points: number
  rebounds: number
  assists: number
  blocks: number
  threePointersMade: number
}

export type UpsertAlphaRefereeLiveScoreDraftRecordInput = {
  matchId: string
  playerUserId: string
  stats: RefereePlayerStatInput
}

export type UpsertAlphaRefereeLiveScoreDraftRecordResult = {
  draftId: string
  matchId: string
  playerUserId: string
  sideIndex: 0 | 1
  status: 'open' | 'submitted' | 'correction_requested'
  stats: RefereePlayerStatInput
  side0Score: number
  side1Score: number
}

export async function upsertAlphaRefereeLiveScoreDraftRecord(
  input: UpsertAlphaRefereeLiveScoreDraftRecordInput,
): Promise<UpsertAlphaRefereeLiveScoreDraftRecordResult> {
  const { data, error } = await invokeAuthenticatedFunction<UpsertAlphaRefereeLiveScoreDraftRecordResult>(
    'upsert-alpha-referee-live-score-draft',
    { body: input },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to save referee live score')
  if (!data?.draftId) {
    throw new Error('upsert-alpha-referee-live-score-draft returned no draftId')
  }
  return data
}

export type AlphaRefereeQuarterBoundaryInput = {
  side0: number
  side1: number
  elapsedMs: number
}

export type SetAlphaRefereeQuarterBoundariesRecordInput = {
  matchId: string
  quarterBoundaries: AlphaRefereeQuarterBoundaryInput[]
}

export type SetAlphaRefereeQuarterBoundariesRecordResult = {
  draftId: string
  matchId: string
  status: 'open' | 'submitted' | 'correction_requested'
  quarterBoundaries: AlphaRefereeQuarterBoundaryInput[]
}

export async function setAlphaRefereeQuarterBoundariesRecord(
  input: SetAlphaRefereeQuarterBoundariesRecordInput,
): Promise<SetAlphaRefereeQuarterBoundariesRecordResult> {
  const { data, error } = await invokeAuthenticatedFunction<SetAlphaRefereeQuarterBoundariesRecordResult>(
    'upsert-alpha-referee-live-score-draft',
    { body: input },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to save quarter boundaries')
  if (!data?.draftId) {
    throw new Error('upsert-alpha-referee-live-score-draft returned no draftId')
  }
  return data
}

export type RefereeRunningDraftMarkType = 'start' | 'checkpoint' | 'finish'

export type RefereeRunningDraftMarkInput = {
  type: RefereeRunningDraftMarkType
  sideIndex: 0 | 1
  participantUserId?: string | null
  checkpointIndex?: number | null
  elapsedMs: number
  recordedAt?: string | null
  note?: string | null
}

export type UpsertAlphaRefereeRunningDraftRecordInput = {
  matchId: string
  mark: RefereeRunningDraftMarkInput
}

export type RefereeRunningDraftMarkRecord = {
  id: string
  draftId: string
  matchId: string
  participantUserId: string | null
  sideIndex: 0 | 1
  type: RefereeRunningDraftMarkType
  checkpointIndex: number | null
  elapsedMs: number
  recordedAt: string
  note: string | null
  createdAt: string
  updatedAt: string
}

export type RefereeRunningDraftDerivedResultRecord = {
  winnerSide: 0 | 1 | null
  isTie: boolean
  side0ElapsedMs: number
  side1ElapsedMs: number
} | null

export type UpsertAlphaRefereeRunningDraftRecordResult = {
  draftId: string
  matchId: string
  assignmentId: string
  refereeUserId: string
  status: 'open' | 'submitted' | 'correction_requested'
  targetDistanceMeters: number | null
  startedAt: string | null
  submittedAt: string | null
  correctionNote: string | null
  correctionRequestedAt: string | null
  marks: RefereeRunningDraftMarkRecord[]
  derivedResult: RefereeRunningDraftDerivedResultRecord
  createdAt: string
  updatedAt: string
}

export async function upsertAlphaRefereeRunningDraftRecord(
  input: UpsertAlphaRefereeRunningDraftRecordInput,
): Promise<UpsertAlphaRefereeRunningDraftRecordResult> {
  const { data, error } = await invokeAuthenticatedFunction<UpsertAlphaRefereeRunningDraftRecordResult>(
    'upsert-alpha-referee-running-draft',
    { body: input },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to save referee running draft')
  if (!data?.draftId) {
    throw new Error('upsert-alpha-referee-running-draft returned no draftId')
  }
  return data
}

export type RespondRefereeAssignmentRecordInput = {
  matchId: string
  response: 'accept' | 'decline'
}

export type RespondRefereeAssignmentRecordResult = {
  matchId: string
  status: 'assigned' | 'declined'
}

export async function respondRefereeAssignmentRecord(
  input: RespondRefereeAssignmentRecordInput,
): Promise<RespondRefereeAssignmentRecordResult> {
  const { data, error } = await invokeAuthenticatedFunction<RespondRefereeAssignmentRecordResult>(
    'respond-referee-assignment',
    { body: input },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to respond to referee assignment')
  if (!data?.matchId) throw new Error('respond-referee-assignment returned no matchId')
  return data
}

export type RequestAlphaRefereeResultCorrectionRecordInput = {
  matchId: string
  note: string
}

export type RequestAlphaRefereeResultCorrectionRecordResult = {
  matchId: string
  refereeResultId: string
  draftId: string
  status: 'correction_requested'
  note: string
}

export async function requestAlphaRefereeResultCorrectionRecord(
  input: RequestAlphaRefereeResultCorrectionRecordInput,
): Promise<RequestAlphaRefereeResultCorrectionRecordResult> {
  const { data, error } = await invokeAuthenticatedFunction<RequestAlphaRefereeResultCorrectionRecordResult>(
    'request-alpha-referee-result-correction',
    { body: input },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to request referee correction')
  if (!data?.draftId) {
    throw new Error('request-alpha-referee-result-correction returned no draftId')
  }
  return data
}
