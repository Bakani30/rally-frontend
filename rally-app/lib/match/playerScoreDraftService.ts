import {
  upsertPlayerScoreDraftRecord,
  type UpsertPlayerScoreDraftRecordInput,
  type UpsertPlayerScoreDraftRecordResult,
} from './playerScoreDraftRepository'

export type UpsertPlayerScoreDraftInput = UpsertPlayerScoreDraftRecordInput
export type UpsertPlayerScoreDraftResult = UpsertPlayerScoreDraftRecordResult

export function upsertPlayerScoreDraft(
  input: UpsertPlayerScoreDraftInput,
): Promise<UpsertPlayerScoreDraftResult> {
  return upsertPlayerScoreDraftRecord(input)
}
