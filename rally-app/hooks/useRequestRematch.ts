import { useMutation, useQueryClient } from '@tanstack/react-query'

import { requestRematch } from '@/lib/match/matchService'

/**
 * One-tap rematch. Sends a request to clone the finished match into a fresh
 * pending room and re-invite the same opponent. On success we refresh the
 * caller's match list (the new room) and pending invites (the re-invite).
 */
export function useRequestRematch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (originalMatchId: string) => requestRematch(originalMatchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-matches'] })
      queryClient.invalidateQueries({ queryKey: ['my-pending-invites'] })
    },
  })
}
