import { useQuery, useQueryClient } from '@tanstack/react-query'
import { dailyMissionQueryKeys } from '@/lib/daily-mission/dailyMissionQueryKeys'
import type { DailyMissionSyncResult } from '@/lib/daily-mission/dailyMissionTypes'

/**
 * Read-only observer of today's daily-mission sync result.
 *
 * The sync mutation (useDailyMissionSync) is the sole writer — it publishes the
 * result via setQueryData on the same key. This query never fetches real data;
 * it only subscribes to the shared cache so any consumer (hub done-count, etc.)
 * re-renders whenever a sync completes. The queryFn is a no-op that returns the
 * cached value: without it, a broad invalidate/refetch of this key raises a
 * "missing queryFn" error (React Query v5). Returns `undefined` until the first
 * sync of the session lands.
 */
export function useDailyMissionToday(userId: string | undefined) {
  const queryClient = useQueryClient()
  const queryKey = dailyMissionQueryKeys.today(userId)
  return useQuery<DailyMissionSyncResult | undefined>({
    queryKey,
    queryFn: () => queryClient.getQueryData<DailyMissionSyncResult>(queryKey),
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
