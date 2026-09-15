import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { resolveEquippedTitles } from '@/lib/cosmetics/cosmeticService'

/**
 * Resolves every lobby participant's equipped title in one round-trip so the
 * court markers can render title frames. Keyed by a stable, sorted id list so
 * re-orders don't refetch.
 */
export function useLobbyEquippedTitles(userIds: string[]) {
  const ids = useMemo(
    () => Array.from(new Set(userIds.filter(Boolean))).sort(),
    [userIds],
  )

  return useQuery({
    queryKey: ['cosmetics', 'lobby-titles', ids],
    queryFn: () => resolveEquippedTitles(ids),
    enabled: ids.length > 0,
    staleTime: 60_000,
  })
}
