import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { resolveEquippedFramesForActivity } from '@/lib/cosmetics/cosmeticService'
import type { LeaderboardActivity } from '@/lib/leaderboard/leaderboardConfig'

/**
 * Resolves every lobby participant's equipped profile frame AND current
 * activity tier in one round-trip so the court markers can render frames
 * plus a rank badge. Keyed by a stable, sorted id list so re-orders don't
 * refetch. Scoped to the match's activity so a player's basketball-tier
 * frame/tier doesn't leak into a running lobby (Rank Identity v1).
 */
export function useLobbyEquippedFrames(userIds: string[], activity: LeaderboardActivity) {
  const ids = useMemo(
    () => Array.from(new Set(userIds.filter(Boolean))).sort(),
    [userIds],
  )

  return useQuery({
    queryKey: ['cosmetics', 'lobby-frames', activity, ids],
    queryFn: () => resolveEquippedFramesForActivity(ids, activity),
    enabled: ids.length > 0,
    staleTime: 60_000,
  })
}
