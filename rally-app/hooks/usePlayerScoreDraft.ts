import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  upsertPlayerScoreDraft,
  type UpsertPlayerScoreDraftInput,
  type UpsertPlayerScoreDraftResult,
} from '@/lib/match/playerScoreDraftService'
import type { MatchWithRelations, PlayerScoreDraft } from '@/types/match'

export function useUpsertPlayerScoreDraft(matchId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpsertPlayerScoreDraftInput) => upsertPlayerScoreDraft(input),
    onSuccess: (result) => {
      queryClient.setQueryData<MatchWithRelations>(
        ['match', matchId],
        (old) => (old ? patchPlayerScoreDraftFromResult(old, result) : old),
      )
      queryClient.invalidateQueries({ queryKey: ['my-matches'] })
    },
  })
}

function patchPlayerScoreDraftFromResult(
  match: MatchWithRelations,
  result: UpsertPlayerScoreDraftResult,
): MatchWithRelations {
  const existing = Array.isArray(match.player_score_drafts)
    ? match.player_score_drafts
    : match.player_score_drafts
      ? [match.player_score_drafts]
      : []
  const found = existing.find((draft) =>
    draft.id === result.draftId || draft.side_index === result.sideIndex
  )
  const nextDraft: PlayerScoreDraft = {
    id: result.draftId,
    match_id: result.matchId,
    activity_type: result.activityType,
    side_index: result.sideIndex,
    submitted_by: result.submittedBy,
    status: result.status,
    team_score: result.teamScore,
    basketball_stats: result.basketballStats,
    badminton_sets: result.badmintonSets,
    note: result.note,
    proof_urls: result.proofUrls,
    submitted_at: result.submitted ? result.updatedAt : null,
    created_at: found?.created_at ?? result.updatedAt,
    updated_at: result.updatedAt,
  }

  return {
    ...match,
    player_score_drafts: found
      ? existing.map((draft) =>
        draft.id === result.draftId || draft.side_index === result.sideIndex ? nextDraft : draft,
      )
      : [...existing, nextDraft],
  }
}
