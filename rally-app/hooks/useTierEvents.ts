import { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchUnseenTierEvents, markTierEventsSeen } from '@/lib/ranks/tierEventRepository'
import { triageTierEvents } from '@/lib/ranks/tierEventTriage'
import { useAuth } from '@/hooks/useAuth'

export const tierEventQueryKeys = {
  unseen: (userId: string | undefined) => ['tier-events', 'unseen', userId] as const,
  // Prefix-only key (no userId segment) for callers that want to invalidate
  // the unseen-events query for whichever user is currently signed in
  // without resolving the id themselves — see settlement invalidation call
  // sites in useMatch.ts / useMatchActions.ts.
  unseenPrefix: ['tier-events', 'unseen'] as const,
}

/**
 * Bridges the notifications/recap UI to unseen `tier_events`, pre-triaged
 * per spec §3.4: `momentQueue` is the latest promotion PER ACTIVITY (max 1
 * each), newest-first, that should show the full-screen PromotionMoment in
 * sequence; `momentEvent` is `momentQueue[0]` for convenience. `demotions`
 * are quiet notice rows for the notifications screen. CRITICAL: demotions
 * never appear in `momentQueue`/`momentEvent`. Older same-activity
 * promotions are marked seen automatically (no UI) as soon as the triage
 * result is known.
 */
export function useUnseenTierEvents(userId?: string) {
  const { user } = useAuth()
  const resolvedUserId = userId ?? user?.id
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: tierEventQueryKeys.unseen(resolvedUserId),
    queryFn: fetchUnseenTierEvents,
    enabled: !!resolvedUserId,
    staleTime: 30_000,
  })

  const markSeenMutation = useMutation({
    mutationFn: markTierEventsSeen,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tierEventQueryKeys.unseen(resolvedUserId) })
    },
  })

  const triage = useMemo(() => triageTierEvents(query.data ?? []), [query.data])
  const quietSeenIds = triage.quietSeenIds
  const markSeenMutate = markSeenMutation.mutate
  useEffect(() => {
    if (quietSeenIds.length > 0) markSeenMutate(quietSeenIds)
  }, [quietSeenIds, markSeenMutate])

  return {
    momentQueue: triage.momentQueue,
    momentEvent: triage.momentEvent,
    demotions: triage.noticeEvents,
    isLoading: query.isLoading,
    markSeen: (ids: string[]) => markSeenMutation.mutate(ids),
  }
}
