import { describe, expect, it } from 'vitest'
import {
  CATEGORY_OPTIONS,
  COSMETIC_CATEGORY_OPTIONS,
  formatCurrencyPrice,
  getGiftFilterKeys,
  getGiftPriceOptions,
  getNextCampaignIndex,
  matchesRewardCategory,
  matchesCosmeticCategory,
  matchesRewardQuery,
  resolveRewardMedia,
  splitRedeemCatalog,
} from '@/components/gifts/redeemCatalog'
import type { GiftItem } from './giftTypes'

function gift(item_type: GiftItem['item_type']): GiftItem {
  return {
    id: 'gift-1', code: 'REWARD_1', name: 'Reward', description: null, image_url: null,
    price_points: 500, price_credits: 20, stock_quantity: 3, per_user_limit: 1,
    starts_at: null, ends_at: null, voucher_expires_in_days: null,
    reward_type: item_type, reward_cosmetic: null, item_type, price: [
      { currency: 'leaderboard_point', amount: 500 }, { currency: 'credit', amount: 20 },
    ], stock_status: 'available', owned: false, category: item_type === 'voucher' ? 'coupon' : 'gift', is_limited: false,
  }
}

describe('redeem catalog policy', () => {
  it('maps explicit public categories and the cross-cutting limited tag', () => {
    expect(CATEGORY_OPTIONS.map((option) => option.key)).toEqual(['all', 'coupon', 'gift', 'limited', 'event'])
    expect(getGiftFilterKeys(gift('voucher'))).toEqual(['coupon'])
    expect(getGiftFilterKeys(gift('cosmetic'))).toEqual(['cosmetic'])
    expect(getGiftFilterKeys({
      ...gift('voucher'),
      category: 'event',
      is_limited: true,
    })).toEqual(['event', 'limited'])
  })

  it('keeps cosmetics out of every reward shelf filter and splits both zones', () => {
    const voucher = gift('voucher')
    const cosmetic = gift('cosmetic')

    expect(matchesRewardCategory(voucher, 'all')).toBe(true)
    expect(matchesRewardCategory(cosmetic, 'all')).toBe(false)
    expect(splitRedeemCatalog([voucher, cosmetic])).toEqual({
      rewards: [voucher],
      cosmetics: [cosmetic],
    })
  })

  it('filters cosmetic products by their explicit cosmetic type', () => {
    const frame = {
      ...gift('cosmetic'),
      reward_cosmetic: {
        id: 'frame-1',
        type: 'frame' as const,
        name: 'Arena Frame',
        asset_ref: 'frame/arena',
        rarity: 'rare' as const,
      },
    }

    expect(COSMETIC_CATEGORY_OPTIONS.map((option) => option.key)).toEqual([
      'all', 'frame', 'title', 'badge', 'emote',
    ])
    expect(matchesCosmeticCategory(frame, 'all')).toBe(true)
    expect(matchesCosmeticCategory(frame, 'frame')).toBe(true)
    expect(matchesCosmeticCategory(frame, 'badge')).toBe(false)
    expect(matchesCosmeticCategory(gift('voucher'), 'all')).toBe(false)
  })

  it('keeps price options and currency formatting deterministic', () => {
    expect(getGiftPriceOptions(gift('voucher'))).toEqual([
      { currency: 'leaderboard_point', amount: 500 },
      { currency: 'credit', amount: 20 },
    ])
    expect(formatCurrencyPrice(5000, 'leaderboard_point')).toBe('5,000 pts')
    expect(formatCurrencyPrice(20, 'credit')).toBe('20 cr')
  })

  it('searches only real item fields and does not invent partner metadata', () => {
    const voucher = gift('voucher')
    expect(matchesRewardQuery(voucher, 'REWARD_1')).toBe(true)
    expect(matchesRewardQuery(voucher, 'Partner deal')).toBe(false)
  })

  it('prefers server images and maps demo rewards to local catalog media', () => {
    expect(resolveRewardMedia({
      code: 'REAL_REWARD',
      image_url: 'https://cdn.example.com/reward.jpg',
    })).toEqual({ kind: 'remote', uri: 'https://cdn.example.com/reward.jpg' })

    expect(resolveRewardMedia({
      code: 'DEMO_VOUCHER_RECOVERY_PASS',
      image_url: null,
    })).toEqual({ kind: 'local', key: 'recovery-pass' })

    expect(resolveRewardMedia({
      code: 'UNKNOWN_REWARD',
      image_url: null,
    })).toEqual({ kind: 'fallback' })
  })

  it('advances campaign slides and wraps back to the first slide', () => {
    expect(getNextCampaignIndex(0, 2)).toBe(1)
    expect(getNextCampaignIndex(1, 2)).toBe(0)
    expect(getNextCampaignIndex(4, 0)).toBe(0)
  })
})
