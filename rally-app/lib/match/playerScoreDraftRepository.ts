import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type { PlayerScoreDraftBadmintonSet, PlayerScoreDraftBasketballStat, Side } from '@/types/match'

export type UpsertPlayerScoreDraftRecordInput = {
  matchId: string
  submit?: boolean
  note?: string | null
  proofPaths?: string[]
  basketballStats?: PlayerScoreDraftBasketballStat[]
  badmintonSets?: PlayerScoreDraftBadmintonSet[]
}

export type UpsertPlayerScoreDraftRecordResult = {
  draftId: string
  matchId: string
  activityType: 'basketball' | 'badminton'
  sideIndex: Side
  submittedBy: string
  status: 'open' | 'submitted'
  teamScore: number
  basketballStats: PlayerScoreDraftBasketballStat[]
  badmintonSets: PlayerScoreDraftBadmintonSet[]
  note: string | null
  proofUrls: string[]
  submitted: boolean
  updatedAt: string
  submitResult: unknown | null
}

export async function upsertPlayerScoreDraftRecord(
  input: UpsertPlayerScoreDraftRecordInput,
): Promise<UpsertPlayerScoreDraftRecordResult> {
  const { data, error } = await invokeAuthenticatedFunction<UpsertPlayerScoreDraftRecordResult>(
    'upsert-player-score-draft',
    { body: input },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to save player score draft')
  if (!data?.draftId) {
    throw new Error('upsert-player-score-draft returned no draftId')
  }
  return data
}
