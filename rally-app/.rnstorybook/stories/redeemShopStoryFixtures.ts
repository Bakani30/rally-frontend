import type { RedeemShopViewProps } from '@/components/gifts/RedeemShopView'
import { DEMO_REDEEM_CATALOG } from '@/lib/gifts/redeemDemoCatalog'
import type { GiftItem } from '@/lib/gifts/giftTypes'

export const REDEEM_SHOP_STORY_STATES = [
  'ready', 'wallet_loading', 'wallet_unavailable', 'catalog_loading', 'empty_catalog',
  'inline_error', 'blocking_error', 'credit_locked', 'owned', 'sold_out',
] as const

export type RedeemShopStoryState = (typeof REDEEM_SHOP_STORY_STATES)[number]

type RedeemShopFixture = Pick<RedeemShopViewProps, 'catalog' | 'wallet'>

function freezeDeep<Value>(value: Value): Value {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child)
    Object.freeze(value)
  }
  return value
}

function displayItems(): GiftItem[] {
  return DEMO_REDEEM_CATALOG.map((gift) => ({
    ...gift,
    image_url: null,
    price: gift.price.map((price) => ({ ...price })),
    reward_cosmetic: gift.reward_cosmetic ? { ...gift.reward_cosmetic } : null,
  }))
}

const baseItems = freezeDeep(displayItems())
const readyWallet = freezeDeep({
  status: 'ready' as const,
  availablePoints: 5000,
  availableCredits: 80,
  canRedeemCreditRewards: true,
  pendingRedemptions: 1,
})

function fixture(overrides: Partial<RedeemShopFixture> = {}): RedeemShopFixture {
  return {
    catalog: { items: baseItems, isDemo: true, errorMode: 'none', isPending: false, isFetching: false },
    wallet: readyWallet,
    ...overrides,
  }
}

function withFirstItem(transform: (gift: GiftItem) => GiftItem): GiftItem[] {
  return baseItems.map((gift, index) => index === 0 ? transform(gift) : gift)
}

export const REDEEM_SHOP_STORY_FIXTURES: Record<RedeemShopStoryState, RedeemShopFixture> = freezeDeep({
  ready: fixture(),
  wallet_loading: fixture({ wallet: { ...readyWallet, status: 'loading', availablePoints: 0, availableCredits: 0, canRedeemCreditRewards: false } }),
  wallet_unavailable: fixture({ wallet: { ...readyWallet, status: 'unavailable', availablePoints: 0, availableCredits: 0, canRedeemCreditRewards: false } }),
  catalog_loading: fixture({ catalog: { items: [], isDemo: false, errorMode: 'none', isPending: true, isFetching: false } }),
  empty_catalog: fixture({ catalog: { items: [], isDemo: false, errorMode: 'none', isPending: false, isFetching: false } }),
  inline_error: fixture({ catalog: { items: baseItems, isDemo: false, errorMode: 'inline', isPending: false, isFetching: false } }),
  blocking_error: fixture({ catalog: { items: [], isDemo: false, errorMode: 'blocking', isPending: false, isFetching: false } }),
  credit_locked: fixture({
    catalog: {
      items: withFirstItem((gift) => ({ ...gift, price_points: null, price_credits: 12, price: [{ currency: 'credit', amount: 12 }] })),
      isDemo: false, errorMode: 'none', isPending: false, isFetching: false,
    },
    wallet: { ...readyWallet, canRedeemCreditRewards: false },
  }),
  owned: fixture({
    catalog: { items: withFirstItem((gift) => ({ ...gift, owned: true })), isDemo: false, errorMode: 'none', isPending: false, isFetching: false },
  }),
  sold_out: fixture({
    catalog: { items: withFirstItem((gift) => ({ ...gift, stock_status: 'sold_out' })), isDemo: false, errorMode: 'none', isPending: false, isFetching: false },
  }),
})
