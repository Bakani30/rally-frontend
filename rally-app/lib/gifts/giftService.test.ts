import { beforeEach, describe, expect, it, vi } from 'vitest'

import { redeemGiftRecord } from './giftRepository'
import { redeemReward } from './giftService'
import { redeemVoucher } from '@/lib/vouchers/voucherService'
import type { GiftItem } from './giftTypes'

vi.mock('./giftRepository', () => ({
  listActiveGiftItemsRecord: vi.fn(),
  listGiftRedemptionsRecord: vi.fn(),
  redeemGiftRecord: vi.fn(),
}))

vi.mock('@/lib/vouchers/voucherService', () => ({ redeemVoucher: vi.fn() }))

function gift(item_type: GiftItem['item_type']): GiftItem {
  return {
    id: 'gift-1', code: 'REWARD_1', name: 'Reward', description: null, image_url: null,
    price_points: 500, price_credits: null, stock_quantity: null, per_user_limit: null,
    starts_at: null, ends_at: null, voucher_expires_in_days: null,
    reward_type: item_type, reward_cosmetic: null, item_type, price: [{ currency: 'leaderboard_point', amount: 500 }],
    stock_status: 'available', owned: false,
    category: item_type === 'voucher' ? 'coupon' : 'gift', is_limited: false,
  }
}

describe('redeemReward routing', () => {
  beforeEach(() => {
    vi.mocked(redeemGiftRecord).mockReset()
    vi.mocked(redeemVoucher).mockReset()
  })

  it('routes cosmetic rewards to redeem-gift and preserves the result kind', async () => {
    vi.mocked(redeemGiftRecord).mockResolvedValue({ kind: 'cosmetic', redemptionId: 'red-1', status: 'fulfilled', balanceAfter: 100, currency: 'leaderboard_point' })
    await expect(redeemReward({ gift: gift('cosmetic'), currency: 'leaderboard_point' })).resolves.toEqual({
      kind: 'cosmetic', redemptionId: 'red-1', status: 'fulfilled', balanceAfter: 100, currency: 'leaderboard_point',
    })
    expect(redeemGiftRecord).toHaveBeenCalledWith({ giftItemId: 'gift-1', currency: 'leaderboard_point' })
    expect(redeemVoucher).not.toHaveBeenCalled()
  })

  it('routes voucher rewards to redeem-voucher and keeps shortCode private to the result', async () => {
    vi.mocked(redeemVoucher).mockResolvedValue({ voucherId: 'voucher-1', redemptionId: 'red-2', shortCode: 'RALLY-42', expiresAt: null, balanceAfter: 80, currency: 'credit' })
    const result = await redeemReward({ gift: gift('voucher'), currency: 'credit' })
    expect(result).toEqual({ kind: 'voucher', voucherId: 'voucher-1', redemptionId: 'red-2', shortCode: 'RALLY-42', expiresAt: null, balanceAfter: 80, currency: 'credit' })
    expect(redeemVoucher).toHaveBeenCalledWith({ giftItemId: 'gift-1', currency: 'credit' })
    expect(redeemGiftRecord).not.toHaveBeenCalled()
  })
})
