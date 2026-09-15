import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setFeaturedMatch } from '@/lib/match/featuredMatchService'
import { featuredMatchKey } from '@/hooks/useProfileFeaturedMatch'

// Owner sets (matchId) or clears (null) their featured match.
export function useSetFeaturedMatch(ownerId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (matchId: string | null) => setFeaturedMatch(matchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: featuredMatchKey(ownerId) })
    },
  })
}
