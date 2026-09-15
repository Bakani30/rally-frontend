import type { ArenaRoundResultSnapshot } from '@/types/arenaResult'

export type ArenaStatDraftCas = {
  expectedReviewEpoch: number
  expectedDraftRevision: number | null
}

export class ArenaStatDraftSnapshotRequiredError extends Error {
  readonly code = 'arena_result_review_epoch_required'

  constructor() {
    super('Refresh the Arena result before saving player stats')
    this.name = 'ArenaStatDraftSnapshotRequiredError'
  }
}

/**
 * CAS tokens are accepted only from the authoritative snapshot for this exact
 * Match. A stale/mismatched cache entry must never leak tokens to another
 * Arena round.
 */
export function arenaStatDraftCasFromSnapshot(
  snapshot: ArenaRoundResultSnapshot | undefined,
  matchId: string,
): ArenaStatDraftCas | undefined {
  if (!snapshot || snapshot.matchId !== matchId) return undefined
  return {
    expectedReviewEpoch: snapshot.reviewEpoch,
    expectedDraftRevision: snapshot.actorDraft?.draftRevision ?? null,
  }
}
