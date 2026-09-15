import { useQuery } from '@tanstack/react-query'
import {
  listOwned,
  resolveEquipped,
  resolveEquippedFramesByActivity,
} from '@/lib/cosmetics/cosmeticService'

export const cosmeticQueryKeys = {
  equipped: (userId: string | undefined) => ['cosmetics', 'equipped', userId] as const,
  equippedFramesByActivity: (userId: string | undefined) =>
    ['cosmetics', 'equippedFramesByActivity', userId] as const,
  owned: (userId: string | undefined) => ['cosmetics', 'owned', userId] as const,
}

export function useEquippedCosmetics(userId: string | undefined) {
  return useQuery({
    queryKey: cosmeticQueryKeys.equipped(userId),
    queryFn: () => resolveEquipped(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  })
}

// Per-activity equipped rank frames — always the signed-in user's own
// Locker, so this only needs `userId` to gate/key the query.
export function useEquippedFramesByActivity(userId: string | undefined) {
  return useQuery({
    queryKey: cosmeticQueryKeys.equippedFramesByActivity(userId),
    queryFn: () => resolveEquippedFramesByActivity(),
    enabled: !!userId,
    staleTime: 60_000,
  })
}

export function useOwnedCosmetics(userId: string | undefined) {
  return useQuery({
    queryKey: cosmeticQueryKeys.owned(userId),
    queryFn: () => listOwned(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  })
}
