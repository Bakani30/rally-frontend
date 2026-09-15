import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type { Side } from '@/types/match'

export type BasketballPlayerStatsInput = {
  points: number
  rebounds: number
  assists: number
  blocks: number
  threePointersMade: number
}

export type UpsertBasketballPlayerStatDraftRecordInput = {
  matchId: string
  stats: BasketballPlayerStatsInput
  note?: string | null
  /** Present only for source=arena_round. Legacy Match payloads stay unchanged. */
  expectedReviewEpoch?: number
  expectedDraftRevision?: number | null
}

export type UpsertBasketballPlayerStatDraftRecordResult = {
  draftId: string
  matchId: string
  playerUserId: string
  sideIndex: Side
  stats: BasketballPlayerStatsInput
  note: string | null
  side0Score: number
  side1Score: number
  updatedAt: string
  draftRevision?: number
  reviewEpoch?: number
  idempotent?: boolean
}

export async function upsertBasketballPlayerStatDraftRecord(
  input: UpsertBasketballPlayerStatDraftRecordInput,
): Promise<UpsertBasketballPlayerStatDraftRecordResult> {
  const body: UpsertBasketballPlayerStatDraftRecordInput = {
    matchId: input.matchId,
    stats: input.stats,
  }
  if (input.note !== undefined) body.note = input.note
  if (input.expectedReviewEpoch !== undefined) {
    body.expectedReviewEpoch = input.expectedReviewEpoch
    // The server distinguishes an Arena actor with no draft (null) from a
    // legacy request that does not enter the Arena route at all.
    body.expectedDraftRevision = input.expectedDraftRevision ?? null
  }
  const { data, error } = await invokeAuthenticatedFunction<UpsertBasketballPlayerStatDraftRecordResult>(
    'upsert-basketball-player-stat-draft',
    { body },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to save basketball stat draft')
  if (!data?.draftId) {
    throw new Error('upsert-basketball-player-stat-draft returned no draftId')
  }
  return data
}
