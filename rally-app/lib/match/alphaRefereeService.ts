import {
  applyAlphaRefereeRecord,
  assignMatchRefereeRecord,
  listAlphaRefereeDutiesRecord,
  listAlphaRefereeEligibilityRecord,
  requestAlphaRefereeResultCorrectionRecord,
  respondRefereeAssignmentRecord,
  setAlphaRefereeQuarterBoundariesRecord,
  submitRefereeMatchResultRecord,
  upsertAlphaRefereeLiveScoreDraftRecord,
  upsertAlphaRefereeRunningDraftRecord,
  type ApplyAlphaRefereeRecordInput,
  type ApplyAlphaRefereeRecordResult,
  type AssignMatchRefereeRecordInput,
  type AssignMatchRefereeRecordResult,
  type ListAlphaRefereeDutiesRecordResult,
  type ListAlphaRefereeEligibilityRecordInput,
  type ListAlphaRefereeEligibilityRecordResult,
  type RefereePlayerStatInput,
  type RequestAlphaRefereeResultCorrectionRecordInput,
  type RequestAlphaRefereeResultCorrectionRecordResult,
  type RespondRefereeAssignmentRecordInput,
  type RespondRefereeAssignmentRecordResult,
  type SetAlphaRefereeQuarterBoundariesRecordInput,
  type SetAlphaRefereeQuarterBoundariesRecordResult,
  type SubmitRefereeMatchResultRecordInput,
  type SubmitRefereeMatchResultRecordResult,
  type UpsertAlphaRefereeLiveScoreDraftRecordInput,
  type UpsertAlphaRefereeLiveScoreDraftRecordResult,
  type UpsertAlphaRefereeRunningDraftRecordInput,
  type UpsertAlphaRefereeRunningDraftRecordResult,
} from './alphaRefereeRepository'

export type {
  AlphaRefereeAccessSource,
  AlphaRefereeActivity,
  AlphaRefereeEligibility,
  ManualRunningRefereeResult,
  RefereeMatchResult,
  RefereeRunningDraftMarkInput,
  TeamScoreRefereeResult,
} from './alphaRefereeRepository'

export type ApplyAlphaRefereeInput = ApplyAlphaRefereeRecordInput
export type ApplyAlphaRefereeResult = ApplyAlphaRefereeRecordResult
export type ListAlphaRefereeEligibilityInput = ListAlphaRefereeEligibilityRecordInput
export type ListAlphaRefereeEligibilityResult = ListAlphaRefereeEligibilityRecordResult
export type ListAlphaRefereeDutiesResult = ListAlphaRefereeDutiesRecordResult
export type AssignMatchRefereeInput = AssignMatchRefereeRecordInput
export type AssignMatchRefereeResult = AssignMatchRefereeRecordResult
export type SubmitRefereeMatchResultInput = SubmitRefereeMatchResultRecordInput
export type SubmitRefereeMatchResultResult = SubmitRefereeMatchResultRecordResult
export type UpsertAlphaRefereeLiveScoreDraftInput = UpsertAlphaRefereeLiveScoreDraftRecordInput
export type UpsertAlphaRefereeLiveScoreDraftResult = UpsertAlphaRefereeLiveScoreDraftRecordResult
export type UpsertAlphaRefereeRunningDraftInput = UpsertAlphaRefereeRunningDraftRecordInput
export type UpsertAlphaRefereeRunningDraftResult = UpsertAlphaRefereeRunningDraftRecordResult
export type RequestAlphaRefereeResultCorrectionInput = RequestAlphaRefereeResultCorrectionRecordInput
export type RequestAlphaRefereeResultCorrectionResult = RequestAlphaRefereeResultCorrectionRecordResult
export type RespondRefereeAssignmentInput = RespondRefereeAssignmentRecordInput
export type RespondRefereeAssignmentResult = RespondRefereeAssignmentRecordResult
export type SetAlphaRefereeQuarterBoundariesInput = SetAlphaRefereeQuarterBoundariesRecordInput
export type SetAlphaRefereeQuarterBoundariesResult = SetAlphaRefereeQuarterBoundariesRecordResult
export type { RefereePlayerStatInput }

export function applyAlphaReferee(
  input: ApplyAlphaRefereeInput,
): Promise<ApplyAlphaRefereeResult> {
  return applyAlphaRefereeRecord(input)
}

export function listAlphaRefereeEligibility(
  input: ListAlphaRefereeEligibilityInput = {},
): Promise<ListAlphaRefereeEligibilityResult> {
  return listAlphaRefereeEligibilityRecord(input)
}

export function listAlphaRefereeDuties(): Promise<ListAlphaRefereeDutiesResult> {
  return listAlphaRefereeDutiesRecord()
}

export function assignMatchReferee(
  input: AssignMatchRefereeInput,
): Promise<AssignMatchRefereeResult> {
  return assignMatchRefereeRecord(input)
}

export function submitRefereeMatchResult(
  input: SubmitRefereeMatchResultInput,
): Promise<SubmitRefereeMatchResultResult> {
  return submitRefereeMatchResultRecord(input)
}

export function upsertAlphaRefereeLiveScoreDraft(
  input: UpsertAlphaRefereeLiveScoreDraftInput,
): Promise<UpsertAlphaRefereeLiveScoreDraftResult> {
  return upsertAlphaRefereeLiveScoreDraftRecord(input)
}

export function upsertAlphaRefereeRunningDraft(
  input: UpsertAlphaRefereeRunningDraftInput,
): Promise<UpsertAlphaRefereeRunningDraftResult> {
  return upsertAlphaRefereeRunningDraftRecord(input)
}

export function setAlphaRefereeQuarterBoundaries(
  input: SetAlphaRefereeQuarterBoundariesInput,
): Promise<SetAlphaRefereeQuarterBoundariesResult> {
  return setAlphaRefereeQuarterBoundariesRecord(input)
}

export function requestAlphaRefereeResultCorrection(
  input: RequestAlphaRefereeResultCorrectionInput,
): Promise<RequestAlphaRefereeResultCorrectionResult> {
  return requestAlphaRefereeResultCorrectionRecord(input)
}

export function respondRefereeAssignment(
  input: RespondRefereeAssignmentInput,
): Promise<RespondRefereeAssignmentResult> {
  return respondRefereeAssignmentRecord(input)
}
