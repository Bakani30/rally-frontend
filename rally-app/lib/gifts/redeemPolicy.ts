import type { GiftItem } from './giftTypes'
import type { WalletCurrency } from '@/lib/wallet/walletTypes'

export type RedeemState = 'ready' | 'short' | 'locked' | 'sold_out' | 'owned'

export function balanceFor(
  currency: WalletCurrency,
  availablePoints: number,
  availableCredits: number,
): number {
  return currency === 'credit' ? availableCredits : availablePoints
}

export function getRedeemState(input: {
  gift: GiftItem
  currency: WalletCurrency
  price: number
  balance: number
  canRedeemCreditRewards: boolean
}): RedeemState {
  if (input.gift.owned) return 'owned'
  if (input.gift.stock_status === 'sold_out') return 'sold_out'
  if (input.currency === 'credit' && !input.canRedeemCreditRewards) return 'locked'
  if (input.balance < input.price) return 'short'
  return 'ready'
}

export function getCatalogRedeemState(input: {
  gift: GiftItem
  availablePoints: number
  availableCredits: number
  canRedeemCreditRewards: boolean
}): RedeemState {
  if (input.gift.owned) return 'owned'
  if (input.gift.stock_status === 'sold_out') return 'sold_out'
  if (input.gift.price_points !== null && input.availablePoints >= input.gift.price_points) return 'ready'
  if (
    input.gift.price_credits !== null
    && input.canRedeemCreditRewards
    && input.availableCredits >= input.gift.price_credits
  ) return 'ready'
  if (
    input.gift.price_points === null
    && input.gift.price_credits !== null
    && !input.canRedeemCreditRewards
  ) return 'locked'
  return 'short'
}
