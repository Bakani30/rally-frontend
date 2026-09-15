import type { WalletCurrency } from '@/lib/wallet/walletTypes'
import { redeemVoucher } from '@/lib/vouchers/voucherService'
import type { GiftItem, RedeemRewardResult } from './giftTypes'
import {
  listActiveGiftItemsRecord,
  listGiftRedemptionsRecord,
  redeemGiftRecord,
} from './giftRepository'

export function listActiveGiftItems() {
  return listActiveGiftItemsRecord()
}

export function listGiftRedemptions(userId: string) {
  return listGiftRedemptionsRecord(userId)
}

export function redeemGift(input: { giftItemId: string; currency: WalletCurrency }) {
  return redeemGiftRecord(input)
}

export function redeemReward(input: {
  gift: GiftItem
  currency: WalletCurrency
}): Promise<RedeemRewardResult> {
  if (input.gift.item_type === 'voucher') {
    return redeemVoucher({ giftItemId: input.gift.id, currency: input.currency }).then((result) => ({
      kind: 'voucher' as const,
      ...result,
    }))
  }
  return redeemGift({ giftItemId: input.gift.id, currency: input.currency })
}
