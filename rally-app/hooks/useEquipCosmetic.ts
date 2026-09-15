import { useMutation, useQueryClient } from '@tanstack/react-query'
import { equip } from '@/lib/cosmetics/cosmeticService'
import type { LeaderboardActivity } from '@/lib/leaderboard/leaderboardConfig'
import type { CosmeticType } from '@/lib/cosmetics/cosmeticTypes'
import { cosmeticQueryKeys } from '@/hooks/useEquippedCosmetics'
import { profileQueryKeys } from '@/lib/profile/profileQueryKeys'

export function useEquipCosmetic(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { slot: CosmeticType; cosmeticId: string | null; activity?: LeaderboardActivity }) =>
      equip(input.slot, input.cosmeticId, input.activity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cosmeticQueryKeys.equipped(userId) })
      queryClient.invalidateQueries({ queryKey: cosmeticQueryKeys.equippedFramesByActivity(userId) })
      queryClient.invalidateQueries({ queryKey: cosmeticQueryKeys.owned(userId) })
      queryClient.invalidateQueries({
        queryKey: profileQueryKeys.public(userId ? `id:${userId}` : undefined),
      })
    },
  })
}
