import type { GiftItem } from '@/lib/gifts/giftTypes'
import type { CosmeticRarity, OwnedCosmetic, ResolvedSlot } from './cosmeticTypes'
import type { LoadoutSlot } from './cosmeticLoadout'

export type ProfileStudioOwnershipFilter = 'all' | 'owned' | 'unowned'

export type ProfileStudioItem = {
  cosmeticId: string
  gift: GiftItem | null
  ownedCosmetic: OwnedCosmetic | null
  slot: LoadoutSlot
  code: string
  name: string
  description: string | null
  assetRef: string
  rarity: CosmeticRarity
  owned: boolean
}

export function mergeProfileStudioItems(
  shopItems: GiftItem[],
  ownedItems: OwnedCosmetic[],
): ProfileStudioItem[] {
  const byId = new Map<string, ProfileStudioItem>()

  for (const gift of shopItems) {
    const cosmetic = gift.reward_cosmetic
    if (gift.item_type !== 'cosmetic' || !cosmetic || !isStudioSlot(cosmetic.type)) continue
    byId.set(cosmetic.id, {
      cosmeticId: cosmetic.id,
      gift,
      ownedCosmetic: null,
      slot: cosmetic.type,
      code: cosmetic.code ?? gift.code,
      name: cosmetic.name,
      description: gift.description,
      assetRef: cosmetic.asset_ref,
      rarity: cosmetic.rarity,
      owned: gift.owned,
    })
  }

  for (const owned of ownedItems) {
    if (!isStudioSlot(owned.type)) continue
    const current = byId.get(owned.id)
    byId.set(owned.id, {
      cosmeticId: owned.id,
      gift: current?.gift ?? null,
      ownedCosmetic: owned,
      slot: owned.type,
      code: owned.code,
      name: owned.name,
      description: owned.description || current?.description || null,
      assetRef: owned.asset_ref,
      rarity: owned.rarity,
      owned: true,
    })
  }

  return [...byId.values()].sort((a, b) => {
    if (a.owned !== b.owned) return a.owned ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export function filterProfileStudioItems(
  items: ProfileStudioItem[],
  slot: LoadoutSlot,
  ownership: ProfileStudioOwnershipFilter,
): ProfileStudioItem[] {
  return items.filter((item) => {
    if (item.slot !== slot) return false
    if (ownership === 'owned') return item.owned
    if (ownership === 'unowned') return !item.owned
    return true
  })
}

export function studioItemToResolved(item: ProfileStudioItem): ResolvedSlot {
  return {
    id: item.cosmeticId,
    code: item.code,
    asset_ref: item.assetRef,
    name: item.name,
    rarity: item.rarity,
  }
}

export function getProfileStudioSlot(gift: GiftItem): LoadoutSlot | null {
  const type = gift.reward_cosmetic?.type
  return type && isStudioSlot(type) ? type : null
}

export function findProfileStudioItemByGiftId(
  items: ProfileStudioItem[],
  giftId: string | null | undefined,
): ProfileStudioItem | null {
  if (!giftId) return null
  return items.find((item) => item.gift?.id === giftId) ?? null
}

function isStudioSlot(type: string): type is LoadoutSlot {
  return type === 'frame' || type === 'title' || type === 'badge'
}
