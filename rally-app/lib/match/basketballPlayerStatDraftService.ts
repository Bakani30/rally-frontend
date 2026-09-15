import {
  upsertBasketballPlayerStatDraftRecord,
  type BasketballPlayerStatsInput,
  type UpsertBasketballPlayerStatDraftRecordInput,
  type UpsertBasketballPlayerStatDraftRecordResult,
} from './basketballPlayerStatDraftRepository'

export type BasketballPlayerSelfStatInput = BasketballPlayerStatsInput
export type UpsertBasketballPlayerStatDraftInput = UpsertBasketballPlayerStatDraftRecordInput
export type UpsertBasketballPlayerStatDraftResult = UpsertBasketballPlayerStatDraftRecordResult

export function upsertBasketballPlayerStatDraft(
  input: UpsertBasketballPlayerStatDraftInput,
): Promise<UpsertBasketballPlayerStatDraftResult> {
  return upsertBasketballPlayerStatDraftRecord(input)
}
