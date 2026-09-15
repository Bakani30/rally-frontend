import { describe, expect, it } from 'vitest'
import type { GiftItem } from './giftTypes'
import {
  DEMO_REDEEM_CATALOG,
  chooseRedeemCatalog,
  getDemoReward,
  isDemoReward,
  resolveRedeemCatalogErrorMode,
} from './redeemDemoCatalog'

function realGift(): GiftItem {
  return {
    id: 'gift-real-rally-pass',
    code: 'RALLY_PASS_01',
    name: 'Real Rally Pass',
    description: 'A server-provided catalog item',
    image_url: null,
    price_points: 500,
    price_credits: 10,
    stock_quantity: 10,
    per_user_limit: 1,
    starts_at: null,
    ends_at: null,
    voucher_expires_in_days: 14,
    reward_type: 'voucher',
    reward_cosmetic: null,
    item_type: 'voucher',
    category: 'coupon',
    is_limited: false,
    price: [
      { currency: 'leaderboard_point', amount: 500 },
      { currency: 'credit', amount: 10 },
    ],
    stock_status: 'available',
    owned: false,
  }
}

describe('redeem demo catalog', () => {
  it('exports six distinct demo rewards including two shoe products', () => {
    expect(DEMO_REDEEM_CATALOG).toHaveLength(6)
    expect(new Set(DEMO_REDEEM_CATALOG.map((gift) => gift.id)).size).toBe(6)
    expect(new Set(DEMO_REDEEM_CATALOG.map((gift) => gift.code)).size).toBe(6)
    expect(DEMO_REDEEM_CATALOG.map((gift) => gift.item_type)).toEqual([
      'voucher',
      'voucher',
      'cosmetic',
      'cosmetic',
      'voucher',
      'voucher',
    ])
    expect(DEMO_REDEEM_CATALOG.slice(-2).map((gift) => gift.code)).toEqual([
      'DEMO_PRODUCT_NOVA_ROAD_SHOE',
      'DEMO_PRODUCT_NOVA_COURT_SHOE',
    ])
    expect(DEMO_REDEEM_CATALOG.every((gift) => gift.price_points !== null && gift.price_credits !== null)).toBe(true)
    expect(DEMO_REDEEM_CATALOG.slice(0, 2).every((gift) => gift.voucher_expires_in_days !== null)).toBe(true)
    expect(DEMO_REDEEM_CATALOG.every((gift) => gift.stock_quantity !== null && gift.per_user_limit !== null)).toBe(true)
  })

  it('detects every demo id and resolves it without any redemption side effect', () => {
    for (const gift of DEMO_REDEEM_CATALOG) {
      expect(isDemoReward(gift)).toBe(true)
      expect(isDemoReward(gift.id)).toBe(true)
      expect(getDemoReward(gift.id)).toBe(gift)
    }

    expect(isDemoReward('gift-real-rally-pass')).toBe(false)
    expect(getDemoReward('gift-missing')).toBeUndefined()
  })

  it('never supplies demos in production', () => {
    const result = chooseRedeemCatalog({
      realItems: [],
      isPending: false,
      hasError: true,
      isDevelopment: false,
    })

    expect(result).toEqual({ items: [], isDemo: false })
  })

  it('never supplies demos while the real catalog is pending', () => {
    const result = chooseRedeemCatalog({
      realItems: [],
      isPending: true,
      hasError: true,
      isDevelopment: true,
    })

    expect(result).toEqual({ items: [], isDemo: false })
  })

  it('lets real data win over the demo fallback', () => {
    const items = [realGift()]
    const result = chooseRedeemCatalog({
      realItems: items,
      isPending: false,
      hasError: true,
      isDevelopment: true,
    })

    expect(result).toEqual({ items, isDemo: false })
  })

  it.each([
    { realItems: [] },
    { realItems: null },
    { realItems: undefined },
  ])('uses demos only for a successful empty development catalog', ({ realItems }) => {
    const result = chooseRedeemCatalog({
      realItems,
      isPending: false,
      hasError: false,
      isDevelopment: true,
    })

    expect(result.isDemo).toBe(true)
    expect(result.items).toEqual(DEMO_REDEEM_CATALOG)
  })

  it('does not hide a development endpoint failure behind demo products', () => {
    const result = chooseRedeemCatalog({
      realItems: [],
      isPending: false,
      hasError: true,
      isDevelopment: true,
    })

    expect(result).toEqual({ items: [], isDemo: false })
  })

  it('keeps cached catalog visible when a refresh fails even if filters show zero items', () => {
    expect(resolveRedeemCatalogErrorMode({ hasError: true, cachedItemCount: 2 })).toBe('inline')
  })

  it('uses a blocking error only when no cached catalog exists', () => {
    expect(resolveRedeemCatalogErrorMode({ hasError: true, cachedItemCount: 0 })).toBe('blocking')
    expect(resolveRedeemCatalogErrorMode({ hasError: false, cachedItemCount: 0 })).toBe('none')
  })
})
