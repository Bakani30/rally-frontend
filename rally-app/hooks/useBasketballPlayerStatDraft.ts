import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  upsertBasketballPlayerStatDraft,
  type UpsertBasketballPlayerStatDraftInput,
  type UpsertBasketballPlayerStatDraftResult,
} from '@/lib/match/basketballPlayerStatDraftService'
import type { MatchWithRelations } from '@/types/match'
import type { ArenaRoundResultSnapshot } from '@/types/arenaResult'
import {
  arenaStatDraftCasFromSnapshot,
  ArenaStatDraftSnapshotRequiredError,
} from '@/lib/match/arenaStatDraftCas'
import { arenaResultQueryKey } from './useArenaResult'

export function useUpsertBasketballPlayerStatDraft(matchId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpsertBasketballPlayerStatDraftInput) => {
      const arenaSnapshot = queryClient.getQueryData<ArenaRoundResultSnapshot>(
        arenaResultQueryKey(input.matchId),
      )
      const arenaCas = arenaStatDraftCasFromSnapshot(arenaSnapshot, input.matchId)
      const cachedMatch = queryClient.getQueryData<Pick<MatchWithRelations, 'source'>>([
        'match', input.matchId,
      ])
      if (!arenaCas && cachedMatch?.source === 'arena_round') {
        // Arena cannot fall through to the legacy RPC while the authoritative
        // snapshot (and its CAS tokens) is unavailable.
        throw new ArenaStatDraftSnapshotRequiredError()
      }
      return upsertBasketballPlayerStatDraft({
        matchId: input.matchId,
        stats: input.stats,
        ...(input.note === undefined ? {} : { note: input.note }),
        ...(arenaCas ?? {}),
      })
    },
    onSuccess: (result) => {
      queryClient.setQueryData<MatchWithRelations>(
        ['match', matchId],
        (old) => (old ? patchSelfStatDraftFromResult(old, result) : old),
      )
    },
  })
}

function patchSelfStatDraftFromResult(
  match: MatchWithRelations,
  result: UpsertBasketballPlayerStatDraftResult,
): MatchWithRelations {
  const existing = Array.isArray(match.basketball_player_stat_drafts)
    ? match.basketball_player_stat_drafts
    : match.basketball_player_stat_drafts
      ? [match.basketball_player_stat_drafts]
      : []
  const found = existing.find((draft) => draft.id === result.draftId || draft.user_id === result.playerUserId)
  const nextDraft = {
    id: result.draftId,
    match_id: result.matchId,
    user_id: result.playerUserId,
    side_index: result.sideIndex,
    points: result.stats.points,
    rebounds: result.stats.rebounds,
    assists: result.stats.assists,
    blocks: result.stats.blocks,
    three_pointers_made: result.stats.threePointersMade,
    note: result.note,
    created_at: found?.created_at ?? result.updatedAt,
    updated_at: result.updatedAt,
  }

  return {
    ...match,
    basketball_player_stat_drafts: found
      ? existing.map((draft) =>
        draft.id === result.draftId || draft.user_id === result.playerUserId ? nextDraft : draft,
      )
      : [...existing, nextDraft],
  }
}
