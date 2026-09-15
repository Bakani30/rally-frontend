import type { CosmeticRarity, CosmeticType } from '@/lib/cosmetics/cosmeticTypes'
import type { WalletCurrency } from '@/lib/wallet/walletTypes'

export type GiftRewardType = 'none' | 'cosmetic' | 'voucher'

export type GiftRewardCosmetic = {
  id: string
  code?: string
  type: CosmeticType
  name: string
  asset_ref: string
  rarity: CosmeticRarity
}

export type GiftItemType = 'cosmetic' | 'voucher'
export type GiftStockStatus = 'available' | 'sold_out'
export type GiftShopCategory = 'coupon' | 'gift' | 'event'

export type GiftPrice = {
  currency: WalletCurrency
  amount: number
}

export type GiftItem = {
  id: string
  code: string
  name: string
  description: string | null
  image_url: string | null
  price_points: number | null
  price_credits: number | null
  stock_quantity: number | null
  per_user_limit: number | null
  starts_at: string | null
  ends_at: string | null
  voucher_expires_in_days: number | null
  reward_type: GiftRewardType
  reward_cosmetic: GiftRewardCosmetic | null
  item_type: GiftItemType
  category: GiftShopCategory
  is_limited: boolean
  price: GiftPrice[]
  stock_status: GiftStockStatus
  owned: boolean
}

export type GiftRedemption = {
  id: string
  user_id: string
  gift_item_id: string
  currency: WalletCurrency
  amount: number
  status: 'pending' | 'fulfilled' | 'cancelled' | 'refunded'
  created_at: string
}

export type RedeemCosmeticResult = {
  kind: 'cosmetic'
  redemptionId: string
  status: 'pending' | 'fulfilled' | 'cancelled'
  balanceAfter: number
  currency: WalletCurrency
}

export type RedeemRewardResult = RedeemCosmeticResult | {
  kind: 'voucher'
  voucherId: string
  redemptionId: string
  shortCode: string
  expiresAt: string | null
  balanceAfter: number
  currency: WalletCurrency
}
