import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cosmeticQueryKeys } from '@/hooks/useEquippedCosmetics'
import { listActiveGiftItems, listGiftRedemptions, redeemGift, redeemReward } from '@/lib/gifts/giftService'
import type { GiftItem } from '@/lib/gifts/giftTypes'
import { profileQueryKeys } from '@/lib/profile/profileQueryKeys'
import { voucherQueryKeys } from './useVouchers'
import type { WalletCurrency } from '@/lib/wallet/walletTypes'

export const giftQueryKeys = {
  catalog: (userId: string | undefined) => ['gift-items', userId] as const,
}

export function useGiftItems(userId: string | undefined) {
  return useQuery({
    queryKey: giftQueryKeys.catalog(userId),
    queryFn: listActiveGiftItems,
    enabled: Boolean(userId),
  })
}

export function useGiftRedemptions(userId: string | undefined) {
  return useQuery({
    queryKey: ['gift-redemptions', userId],
    queryFn: () => listGiftRedemptions(userId!),
    enabled: Boolean(userId),
  })
}

export function useRedeemGift(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { giftItemId: string; currency: WalletCurrency }) => redeemGift(input),
    onSuccess: () => invalidateRedemptionQueries(queryClient, userId),
  })
}

export function useRedeemReward(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { gift: GiftItem; currency: WalletCurrency }) => redeemReward(input),
    onSuccess: () => invalidateRedemptionQueries(queryClient, userId),
  })
}

function invalidateRedemptionQueries(queryClient: ReturnType<typeof useQueryClient>, userId: string | undefined) {
  queryClient.invalidateQueries({ queryKey: giftQueryKeys.catalog(userId) })
  queryClient.invalidateQueries({ queryKey: ['gift-redemptions', userId] })
  queryClient.invalidateQueries({ queryKey: ['wallet-summary', userId] })
  queryClient.invalidateQueries({ queryKey: voucherQueryKeys.catalog() })
  queryClient.invalidateQueries({ queryKey: ['vouchers', 'mine', userId] })
  queryClient.invalidateQueries({ queryKey: cosmeticQueryKeys.owned(userId) })
  queryClient.invalidateQueries({ queryKey: cosmeticQueryKeys.equipped(userId) })
  queryClient.invalidateQueries({
    queryKey: profileQueryKeys.public(userId ? `id:${userId}` : undefined),
  })
}
