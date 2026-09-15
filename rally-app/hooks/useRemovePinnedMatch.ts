import { useMutation, useQueryClient } from '@tanstack/react-query'
import { removePinnedMatch } from '@/lib/match/featuredMatchService'
import { pinnedMatchesKey } from '@/hooks/useProfilePinnedMatches'

// Owner unpins a match.
export function useRemovePinnedMatch(ownerId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (matchId: string) => {
      if (!ownerId) throw new Error('Owner is required to remove a pinned match')
      return removePinnedMatch(ownerId, matchId)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pinnedMatchesKey(ownerId) })
    },
  })
}
