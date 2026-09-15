import type { GiftItem } from '@/lib/gifts/giftTypes'
import type { CosmeticType } from '@/lib/cosmetics/cosmeticTypes'
import type { WalletCurrency } from '@/lib/wallet/walletTypes'

export type CategoryKey = 'all' | 'coupon' | 'gift' | 'limited' | 'event'
export type ProductCategoryKey = Exclude<CategoryKey, 'all'> | 'cosmetic'

export const CATEGORY_OPTIONS: {
  key: CategoryKey
  labelKey: 'filterAll' | 'filterCoupons' | 'filterGifts' | 'filterLimited' | 'filterEvents'
  icon: 'view-grid-outline' | 'ticket-percent-outline' | 'gift-outline' | 'fire' | 'calendar-star'
}[] = [
  { key: 'all', labelKey: 'filterAll', icon: 'view-grid-outline' },
  { key: 'coupon', labelKey: 'filterCoupons', icon: 'ticket-percent-outline' },
  { key: 'gift', labelKey: 'filterGifts', icon: 'gift-outline' },
  { key: 'limited', labelKey: 'filterLimited', icon: 'fire' },
  { key: 'event', labelKey: 'filterEvents', icon: 'calendar-star' },
]

export type CosmeticCategoryKey = 'all' | CosmeticType

export const COSMETIC_CATEGORY_OPTIONS: {
  key: CosmeticCategoryKey
  labelKey: 'filterAll' | 'cosmeticFrames' | 'cosmeticTitles' | 'cosmeticBadges' | 'cosmeticEmotes'
  icon: 'view-grid-outline' | 'card-account-details-outline' | 'format-title' | 'shield-star-outline' | 'emoticon-outline'
}[] = [
  { key: 'all', labelKey: 'filterAll', icon: 'view-grid-outline' },
  { key: 'frame', labelKey: 'cosmeticFrames', icon: 'card-account-details-outline' },
  { key: 'title', labelKey: 'cosmeticTitles', icon: 'format-title' },
  { key: 'badge', labelKey: 'cosmeticBadges', icon: 'shield-star-outline' },
  { key: 'emote', labelKey: 'cosmeticEmotes', icon: 'emoticon-outline' },
]

export type RewardPresentation = {
  partnerInitials: string
  searchText: string
}

export type RewardLocalMediaKey =
  | 'arena-pass'
  | 'recovery-pass'
  | 'colosseum-frame'
  | 'victory-badge'
  | 'nova-road-shoe'
  | 'nova-court-shoe'

export type RewardMedia =
  | { kind: 'remote'; uri: string }
  | { kind: 'local'; key: RewardLocalMediaKey }
  | { kind: 'fallback' }

const LOCAL_MEDIA_BY_CODE: Partial<Record<string, RewardLocalMediaKey>> = {
  DEMO_VOUCHER_ARENA_PASS: 'arena-pass',
  DEMO_VOUCHER_RECOVERY_PASS: 'recovery-pass',
  DEMO_COSMETIC_COLOSSEUM_FRAME: 'colosseum-frame',
  DEMO_COSMETIC_VICTORY_BADGE: 'victory-badge',
  DEMO_PRODUCT_NOVA_ROAD_SHOE: 'nova-road-shoe',
  DEMO_PRODUCT_NOVA_COURT_SHOE: 'nova-court-shoe',
}

export function getGiftFilterKeys(gift: GiftItem): ProductCategoryKey[] {
  const keys: ProductCategoryKey[] = [gift.item_type === 'cosmetic' ? 'cosmetic' : gift.category]
  if (gift.is_limited) keys.push('limited')
  return keys
}

export function createRewardPresentation(gift: GiftItem): RewardPresentation {
  const cosmetic = gift.reward_cosmetic
  const searchableMetadata = cosmetic
    ? `${cosmetic.type} ${cosmetic.rarity}`
    : `${gift.item_type} ${gift.category} ${gift.is_limited ? 'limited' : ''}`

  return {
    partnerInitials: initials(gift.name),
    searchText: `${gift.code} ${gift.name} ${gift.description ?? ''} ${searchableMetadata}`.toLowerCase(),
  }
}

export function resolveRewardMedia(
  gift: Pick<GiftItem, 'code' | 'image_url'>,
): RewardMedia {
  if (gift.image_url) return { kind: 'remote', uri: gift.image_url }

  const key = LOCAL_MEDIA_BY_CODE[gift.code]
  if (key) return { kind: 'local', key }

  return { kind: 'fallback' }
}

export function matchesRewardCategory(gift: GiftItem, category: CategoryKey): boolean {
  if (isCosmeticReward(gift)) return false
  if (category === 'all') return true
  return getGiftFilterKeys(gift).includes(category)
}

export function isCosmeticReward(gift: GiftItem): boolean {
  return gift.item_type === 'cosmetic'
}

export function matchesCosmeticCategory(
  gift: GiftItem,
  category: CosmeticCategoryKey,
): boolean {
  if (!isCosmeticReward(gift)) return false
  if (category === 'all') return true
  return gift.reward_cosmetic?.type === category
}

export function splitRedeemCatalog(items: GiftItem[]): {
  rewards: GiftItem[]
  cosmetics: GiftItem[]
} {
  const rewards: GiftItem[] = []
  const cosmetics: GiftItem[] = []

  for (const item of items) {
    if (isCosmeticReward(item)) cosmetics.push(item)
    else rewards.push(item)
  }

  return { rewards, cosmetics }
}

export function matchesRewardQuery(gift: GiftItem, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  return createRewardPresentation(gift).searchText.includes(normalized)
}

export function getNextCampaignIndex(currentIndex: number, campaignCount: number): number {
  if (campaignCount <= 0) return 0
  return (currentIndex + 1) % campaignCount
}

export function getGiftPrice(gift: GiftItem, currency: WalletCurrency): number | null {
  return currency === 'credit' ? gift.price_credits : gift.price_points
}

export function getGiftPriceOptions(gift: GiftItem): { currency: WalletCurrency; amount: number }[] {
  const options: { currency: WalletCurrency; amount: number }[] = []
  if (gift.price_points !== null) options.push({ currency: 'leaderboard_point', amount: gift.price_points })
  if (gift.price_credits !== null) options.push({ currency: 'credit', amount: gift.price_credits })
  return options
}

export function formatCurrencyPrice(amount: number, currency: WalletCurrency): string {
  return currency === 'credit'
    ? `${amount.toLocaleString()} cr`
    : `${amount.toLocaleString()} pts`
}

export function currencyShortLabel(currency: WalletCurrency): string {
  return currency === 'credit' ? 'cr' : 'pts'
}

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('') || 'R'
}
