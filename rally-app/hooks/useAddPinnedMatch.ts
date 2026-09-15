import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addPinnedMatch } from '@/lib/match/featuredMatchService'
import { pinnedMatchesKey } from '@/hooks/useProfilePinnedMatches'

// Owner pins a match (server caps at 3; throws pinned_match_limit past that).
export function useAddPinnedMatch(ownerId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (matchId: string) => addPinnedMatch(matchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pinnedMatchesKey(ownerId) })
    },
  })
}
