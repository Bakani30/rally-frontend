import { describe, expect, it } from 'vitest'
import type { GiftItem } from '@/lib/gifts/giftTypes'
import type { OwnedCosmetic } from './cosmeticTypes'
import {
  filterProfileStudioItems,
  findProfileStudioItemByGiftId,
  getProfileStudioSlot,
  mergeProfileStudioItems,
} from './profileStudio'

function shopCosmetic(id: string, type: 'frame' | 'title' | 'badge' | 'emote'): GiftItem {
  return {
    id: `gift-${id}`, code: `SHOP_${id}`, name: id, description: 'shop copy', image_url: null,
    price_points: 500, price_credits: null, stock_quantity: 4, per_user_limit: 1,
    starts_at: null, ends_at: null, voucher_expires_in_days: null,
    reward_type: 'cosmetic', item_type: 'cosmetic', category: 'gift', is_limited: false,
    reward_cosmetic: { id, code: id, type, name: id, asset_ref: `${type}/${id}`, rarity: 'rare' },
    price: [{ currency: 'leaderboard_point', amount: 500 }], stock_status: 'available', owned: false,
  }
}

function ownedCosmetic(id: string, type: 'frame' | 'title' | 'badge'): OwnedCosmetic {
  return {
    id, code: id, type, name: `Owned ${id}`, description: 'inventory copy', asset_ref: `${type}/${id}`,
    rarity: 'epic', is_default: false, acquired_at: '2026-07-20T00:00:00.000Z', acquired_via: 'purchase',
  }
}

describe('profile studio catalog', () => {
  it('merges shop and inventory by cosmetic id with inventory as ownership truth', () => {
    const items = mergeProfileStudioItems(
      [shopCosmetic('shared', 'title'), shopCosmetic('shop-only', 'badge')],
      [ownedCosmetic('shared', 'title'), ownedCosmetic('owned-only', 'frame')],
    )

    expect(items).toHaveLength(3)
    expect(items.find((item) => item.cosmeticId === 'shared')).toMatchObject({
      owned: true,
      name: 'Owned shared',
      gift: { id: 'gift-shared' },
    })
    expect(items.find((item) => item.cosmeticId === 'owned-only')?.gift).toBeNull()
  })

  it('hides unsupported slots and filters ownership without changing the source list', () => {
    const items = mergeProfileStudioItems(
      [shopCosmetic('badge-new', 'badge'), shopCosmetic('emote-hidden', 'emote')],
      [ownedCosmetic('badge-owned', 'badge')],
    )

    expect(filterProfileStudioItems(items, 'badge', 'owned').map((item) => item.cosmeticId)).toEqual(['badge-owned'])
    expect(filterProfileStudioItems(items, 'badge', 'unowned').map((item) => item.cosmeticId)).toEqual(['badge-new'])
    expect(items.some((item) => item.cosmeticId === 'emote-hidden')).toBe(false)
  })

  it('resolves a supported cosmetic gift into its studio item and slot', () => {
    const frameGift = shopCosmetic('frame-new', 'frame')
    const emoteGift = shopCosmetic('emote-hidden', 'emote')
    const items = mergeProfileStudioItems([frameGift, emoteGift], [])

    expect(getProfileStudioSlot(frameGift)).toBe('frame')
    expect(getProfileStudioSlot(emoteGift)).toBeNull()
    expect(findProfileStudioItemByGiftId(items, frameGift.id)?.cosmeticId).toBe('frame-new')
    expect(findProfileStudioItemByGiftId(items, 'missing')).toBeNull()
  })
})
