import { supabase } from '@/lib/supabase'
import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type { CosmeticRarity, CosmeticType } from '@/lib/cosmetics/cosmeticTypes'
import type { WalletCurrency } from '@/lib/wallet/walletTypes'
import type { GiftItem, GiftRedemption, RedeemCosmeticResult } from './giftTypes'

type ListShopItemsResponse = {
  items: Array<{
    id: string
    code: string
    name: string
    description: string
    imageUrl: string | null
    itemType: 'cosmetic' | 'voucher'
    category: 'coupon' | 'gift' | 'event'
    isLimited: boolean
    price: Array<{ currency: WalletCurrency; amount: number }>
    stockStatus: 'available' | 'sold_out'
    stockQuantity: number | null
    perUserLimit: number | null
    startsAt: string | null
    endsAt: string | null
    voucherExpiresInDays: number | null
    owned: boolean
    rewardCosmetic?: {
      id: string
      type: CosmeticType
      name: string
      assetRef: string
      rarity: CosmeticRarity
    } | null
  }>
}

export async function listActiveGiftItemsRecord(): Promise<GiftItem[]> {
  const { data, error } = await invokeAuthenticatedFunction<ListShopItemsResponse>(
    'list-shop-items',
    { body: { type: 'all' } },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load shop items')
  return (data?.items ?? []).map(mapShopItemToGiftItem)
}

export async function listGiftRedemptionsRecord(userId: string): Promise<GiftRedemption[]> {
  const { data, error } = await supabase
    .from('gift_redemptions')
    .select('id, user_id, gift_item_id, currency, amount, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as GiftRedemption[]
}

export async function redeemGiftRecord(input: {
  giftItemId: string
  currency: WalletCurrency
}): Promise<RedeemCosmeticResult> {
  const { data, error } = await invokeAuthenticatedFunction<Omit<RedeemCosmeticResult, 'kind'>>(
    'redeem-gift',
    { body: { giftItemId: input.giftItemId, currency: input.currency } },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to redeem gift')
  if (!data?.redemptionId) throw new Error('redeem-gift returned no redemption id')
  return { ...data, kind: 'cosmetic' }
}

function mapShopItemToGiftItem(item: ListShopItemsResponse['items'][number]): GiftItem {
  const rewardCosmetic = item.rewardCosmetic
    ? {
        id: item.rewardCosmetic.id,
        type: item.rewardCosmetic.type,
        name: item.rewardCosmetic.name,
        asset_ref: item.rewardCosmetic.assetRef,
        rarity: item.rewardCosmetic.rarity,
      }
    : null

  return {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description || null,
    image_url: item.imageUrl,
    price_points: item.price.find((p) => p.currency === 'leaderboard_point')?.amount ?? null,
    price_credits: item.price.find((p) => p.currency === 'credit')?.amount ?? null,
    stock_quantity: item.stockQuantity,
    per_user_limit: item.perUserLimit,
    starts_at: item.startsAt,
    ends_at: item.endsAt,
    voucher_expires_in_days: item.voucherExpiresInDays,
    reward_type: item.itemType,
    reward_cosmetic: rewardCosmetic,
    item_type: item.itemType,
    category: item.category,
    is_limited: item.isLimited,
    price: item.price,
    stock_status: item.stockStatus,
    owned: item.owned,
  }
}
