import { describe, expect, it } from 'vitest'

import type { GiftItem } from './giftTypes'
import { getCatalogRedeemState } from './redeemPolicy'

function gift(overrides: Partial<GiftItem> = {}): GiftItem {
  return {
    id: 'gift-1',
    code: 'REWARD_1',
    name: 'Reward',
    description: null,
    image_url: null,
    price_points: 500,
    price_credits: 20,
    stock_quantity: 3,
    per_user_limit: 1,
    starts_at: null,
    ends_at: null,
    voucher_expires_in_days: null,
    reward_type: 'voucher',
    reward_cosmetic: null,
    item_type: 'voucher',
    category: 'coupon',
    is_limited: false,
    price: [
      { currency: 'leaderboard_point', amount: 500 },
      { currency: 'credit', amount: 20 },
    ],
    stock_status: 'available',
    owned: false,
    ...overrides,
  }
}

describe('getCatalogRedeemState', () => {
  it('is ready when any server-priced option is affordable', () => {
    expect(getCatalogRedeemState({
      gift: gift(),
      availablePoints: 500,
      availableCredits: 0,
      canRedeemCreditRewards: false,
    })).toBe('ready')
  })

  it('shows locked only for credit-only rewards without Pro', () => {
    expect(getCatalogRedeemState({
      gift: gift({ price_points: null, price_credits: 20 }),
      availablePoints: 0,
      availableCredits: 20,
      canRedeemCreditRewards: false,
    })).toBe('locked')
  })

  it('shows insufficient balance when no available option is affordable', () => {
    expect(getCatalogRedeemState({
      gift: gift(),
      availablePoints: 499,
      availableCredits: 19,
      canRedeemCreditRewards: true,
    })).toBe('short')
  })

  it('keeps owned and sold-out hints ahead of balance hints', () => {
    const base = { availablePoints: 9999, availableCredits: 9999, canRedeemCreditRewards: true }
    expect(getCatalogRedeemState({ ...base, gift: gift({ owned: true }) })).toBe('owned')
    expect(getCatalogRedeemState({ ...base, gift: gift({ stock_status: 'sold_out' }) })).toBe('sold_out')
  })
})
