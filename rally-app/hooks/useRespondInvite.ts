import { useMutation, useQueryClient } from '@tanstack/react-query'
import { respondToInviteById } from '@/lib/match/matchService'
import { notificationSummaryRootQueryKey } from '@/lib/notifications/notificationSummary'
import type { MyPendingInvite } from '@/types/match'

/**
 * Notifications-screen mutation. Both accept and decline immediately
 * remove the invite card from the pending list — the card disappearing
 * is the user-visible signal that the action succeeded. The realtime
 * subscription on match_invites then writes the canonical state back.
 *
 * Cache invalidation runs in onSettled so a failed mutation still
 * pulls fresh data (in case some other client mutated in parallel).
 */
type Ctx = { prev: MyPendingInvite[] | undefined; userKeys: readonly unknown[][] }

export function useRespondInvite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { inviteId: string; action: 'accept' | 'decline'; stake?: number }) =>
      respondToInviteById(input),
    onMutate: (input) => {
      // Snapshot every my-pending-invites query (keyed by userId) so we
      // can roll back exactly what we touched on error.
      const queries = queryClient.getQueriesData<MyPendingInvite[]>({
        queryKey: ['my-pending-invites'],
      })
      for (const [key, data] of queries) {
        if (!data) continue
        queryClient.setQueryData<MyPendingInvite[]>(
          key,
          data.filter((inv) => inv.inviteId !== input.inviteId),
        )
      }
      const ctx: Ctx = {
        prev: queries[0]?.[1] ?? undefined,
        userKeys: queries.map(([key]) => key as unknown[]),
      }
      // Snapshot full data for rollback (rare path).
      ;(ctx as Ctx & { snapshots: Map<unknown[], MyPendingInvite[]> }).snapshots = new Map(
        queries.filter(([, d]) => d).map(([key, data]) => [key as unknown[], data!]),
      )
      return ctx
    },
    onError: (_err, _input, ctx) => {
      const snapshots = (ctx as (Ctx & { snapshots?: Map<unknown[], MyPendingInvite[]> }) | undefined)
        ?.snapshots
      snapshots?.forEach((data, key) => queryClient.setQueryData(key, data))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['my-pending-invites'] })
      queryClient.invalidateQueries({ queryKey: ['my-matches'] })
      queryClient.invalidateQueries({ queryKey: notificationSummaryRootQueryKey })
    },
  })
}
