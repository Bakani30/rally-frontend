import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({
  hero: [] as Array<Record<string, unknown>>,
  campaign: [] as Array<Record<string, unknown>>,
  filters: [] as Array<Record<string, unknown>>,
  modes: [] as Array<Record<string, unknown>>,
  cards: [] as Array<Record<string, unknown>>,
  cosmetics: [] as Array<Record<string, unknown>>,
  pressables: [] as Array<Record<string, unknown>>,
}))

vi.mock('react-native', () => ({
  Platform: { select: <T,>(values: { ios?: T; android?: T; default?: T }) => values.ios ?? values.default ?? values.android },
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: ({ children }: { children?: React.ReactNode }) => React.createElement('span', null, children),
  View: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  useWindowDimensions: () => ({ width: 390 }),
}))
vi.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: () => React.createElement('i') }))
vi.mock('@/hooks/useAppTheme', () => ({ useSportTheme: () => new Proxy({}, { get: () => '#eb773c' }) }))
vi.mock('@/hooks/useI18n', () => ({ useI18n: () => ({ t: (key: string, values?: { count?: string }) => values?.count ? `${key}:${values.count}` : key }) }))
vi.mock('@/components/layout/Screen', () => ({ Screen: ({ children }: { children?: React.ReactNode }) => React.createElement('main', null, children) }))
vi.mock('@/components/ui/Skeleton', () => ({ Skeleton: () => React.createElement('i', null, 'skeleton') }))
vi.mock('@/components/motion/PressableScale', () => ({
  PressableScale: (props: Record<string, unknown>) => {
    harness.pressables.push(props)
    return React.createElement('button', { onClick: props.onPress as (() => void) | undefined }, props.children as React.ReactNode)
  },
}))
vi.mock('@/components/gifts/RedeemHeroStage', () => ({
  RedeemHeroStage: (props: Record<string, unknown>) => { harness.hero.push(props); return React.createElement('div', null, `wallet:${props.walletStatus}`) },
}))
vi.mock('@/components/gifts/RedeemCampaignBanner', () => ({
  RedeemCampaignBanner: (props: Record<string, unknown>) => { harness.campaign.push(props); return React.createElement('div', null, 'campaign') },
}))
vi.mock('@/components/gifts/RedeemFilterBar', () => ({
  RedeemFilterBar: (props: Record<string, unknown>) => { harness.filters.push(props); return React.createElement('div', null, `filter:${props.activeCategory}`) },
}))
vi.mock('@/components/gifts/RedeemStoreModeSwitch', () => ({
  RedeemStoreModeSwitch: (props: Record<string, unknown>) => { harness.modes.push(props); return React.createElement('div', null, `mode:${props.value}`) },
}))
vi.mock('@/components/gifts/RedeemRewardCard', () => ({
  RedeemRewardCard: (props: {
    gift: { id: string; owned: boolean; stock_status: string; price_points: number | null; price_credits: number | null }
    canRedeemCreditRewards: boolean
    alreadyOwned: boolean
    onOpenDetail: () => void
  }) => {
    harness.cards.push({
      gift: props.gift,
      canRedeemCreditRewards: props.canRedeemCreditRewards,
      alreadyOwned: props.alreadyOwned,
      onOpenDetail: props.onOpenDetail,
    })
    return React.createElement('div', null, `gift:${props.gift.id}`)
  },
}))
vi.mock('@/components/gifts/RedeemCosmeticsZone', () => ({
  RedeemCosmeticsZone: (props: Record<string, unknown>) => { harness.cosmetics.push(props); return React.createElement('div', null, 'cosmetics') },
}))

import { RedeemShopView, type RedeemShopViewProps } from '@/components/gifts/RedeemShopView'
import { DEMO_REDEEM_CATALOG } from '@/lib/gifts/redeemDemoCatalog'
import { matchesRewardCategory, matchesRewardQuery, splitRedeemCatalog } from '@/components/gifts/redeemCatalog'

import { REDEEM_SHOP_STORY_FIXTURES, REDEEM_SHOP_STORY_STATES } from './redeemShopStoryFixtures'

import {
  BlockingError,
  CatalogLoading,
  CreditLocked,
  EmptyCatalog,
  InlineError,
  Owned,
  Ready,
  SoldOut,
  WalletLoading,
  WalletUnavailable,
  parseRedeemShopStoryArgs,
  renderRedeemShopStory,
} from './RedeemShop.stories'
import meta from './RedeemShop.stories'

;(globalThis as { React?: typeof React }).React = React

function propsFor(overrides: Partial<RedeemShopViewProps> = {}): RedeemShopViewProps {
  return {
    catalog: { items: DEMO_REDEEM_CATALOG, isDemo: true, errorMode: 'none', isPending: false, isFetching: false },
    wallet: { status: 'ready', availablePoints: 5000, availableCredits: 80, canRedeemCreditRewards: true, pendingRedemptions: 1 },
    onBack: () => undefined,
    onOpenWallet: () => undefined,
    onOpenHistory: () => undefined,
    onOpenProfileStudio: () => undefined,
    onOpenStudio: () => undefined,
    onRetry: () => undefined,
    onOpenGiftDetail: () => undefined,
    ...overrides,
  }
}

describe('RedeemShop Storybook presentation', () => {
  beforeEach(() => {
    for (const values of Object.values(harness)) values.length = 0
  })

  it('composes ready, wallet, loading, empty, inline-error, and blocking-error display branches through the production View', () => {
    const cases = [
      propsFor(),
      propsFor({ wallet: { status: 'loading', availablePoints: 0, availableCredits: 0, canRedeemCreditRewards: false, pendingRedemptions: 0 } }),
      propsFor({ wallet: { status: 'unavailable', availablePoints: 0, availableCredits: 0, canRedeemCreditRewards: false, pendingRedemptions: 0 } }),
      propsFor({ catalog: { items: [], isDemo: false, errorMode: 'none', isPending: true, isFetching: false } }),
      propsFor({ catalog: { items: [], isDemo: false, errorMode: 'none', isPending: false, isFetching: false } }),
      propsFor({ catalog: { items: DEMO_REDEEM_CATALOG, isDemo: false, errorMode: 'inline', isPending: false, isFetching: false } }),
      propsFor({ catalog: { items: [], isDemo: false, errorMode: 'blocking', isPending: false, isFetching: false } }),
    ]
    for (const props of cases) {
      const html = renderToStaticMarkup(React.createElement(RedeemShopView, props))
      expect(html).toContain(`wallet:${props.wallet.status}`)
      if (props.catalog.isPending) expect(html).toContain('skeleton')
      if (props.catalog.errorMode === 'inline') expect(html).toContain('loadFailedFallback')
      if (props.catalog.errorMode === 'blocking') expect(html).toContain('loadFailedTitle')
    }
  })

  it('preserves pure rewards filtering and catalog split behavior', () => {
    const zones = splitRedeemCatalog(DEMO_REDEEM_CATALOG)
    expect(zones.rewards).toHaveLength(4)
    expect(zones.cosmetics).toHaveLength(2)
    expect(zones.rewards.filter((gift) => matchesRewardQuery(gift, 'arena'))).toHaveLength(1)
    expect(zones.rewards.filter((gift) => matchesRewardCategory(gift, 'event'))).toHaveLength(1)
    expect(zones.rewards.filter((gift) => matchesRewardCategory(gift, 'limited'))).toHaveLength(2)
  })

  it('forwards rewards-mode route intents reachable in the static render', () => {
    const actions = { back: vi.fn(), wallet: vi.fn(), history: vi.fn(), profile: vi.fn(), retry: vi.fn(), detail: vi.fn() }
    const props = propsFor({
      onBack: actions.back, onOpenWallet: actions.wallet, onOpenHistory: actions.history,
      onOpenProfileStudio: actions.profile, onOpenStudio: () => undefined, onRetry: actions.retry, onOpenGiftDetail: actions.detail,
      catalog: { items: DEMO_REDEEM_CATALOG, isDemo: false, errorMode: 'inline', isPending: false, isFetching: false },
    })
    renderToStaticMarkup(React.createElement(RedeemShopView, props))
    ;(harness.hero.at(-1)?.onBack as (() => void) | undefined)?.()
    ;(harness.hero.at(-1)?.onOpenWallet as (() => void) | undefined)?.()
    ;(harness.hero.at(-1)?.onOpenHistory as (() => void) | undefined)?.()
    ;(harness.hero.at(-1)?.onOpenProfileStudio as (() => void) | undefined)?.()
    ;(harness.cards.at(-1)?.onOpenDetail as (() => void) | undefined)?.()
    const retry = harness.pressables.find((pressable) => pressable.onPress && pressable.accessibilityRole === 'button')?.onPress as (() => void) | undefined
    retry?.()
    expect(actions.back).toHaveBeenCalledOnce()
    expect(actions.wallet).toHaveBeenCalledOnce()
    expect(actions.history).toHaveBeenCalledOnce()
    expect(actions.profile).toHaveBeenCalledOnce()
    expect(actions.detail).toHaveBeenCalledWith(DEMO_REDEEM_CATALOG.at(-1))
    expect(actions.retry).toHaveBeenCalledOnce()
  })

  it('publishes strict safe state stories, including credit locked, owned, and sold-out fixtures', () => {
    const stories = [Ready, WalletLoading, WalletUnavailable, CatalogLoading, EmptyCatalog, InlineError, BlockingError, CreditLocked, Owned, SoldOut]
    expect(stories.map((story) => story.args?.state)).toEqual([
      'ready', 'wallet_loading', 'wallet_unavailable', 'catalog_loading', 'empty_catalog', 'inline_error', 'blocking_error', 'credit_locked', 'owned', 'sold_out',
    ])
    expect(Object.keys(meta.argTypes ?? {})).toEqual(['state'])
    expect(() => parseRedeemShopStoryArgs({ state: 'ready', onRetry: () => undefined })).toThrow()
    expect(renderToStaticMarkup(renderRedeemShopStory({ state: 'ready', extra: true }))).toContain('Invalid Redeem Shop story args')
    expect(renderToStaticMarkup(renderRedeemShopStory({ state: 'ready' }))).toContain('wallet:ready')

    harness.cards.length = 0
    renderToStaticMarkup(renderRedeemShopStory({ state: 'credit_locked' }))
    expect(harness.cards[0]).toMatchObject({
      canRedeemCreditRewards: false,
      gift: { price_points: null, price_credits: 12 },
    })
    harness.cards.length = 0
    renderToStaticMarkup(renderRedeemShopStory({ state: 'owned' }))
    expect(harness.cards[0]).toMatchObject({ alreadyOwned: true, gift: { owned: true } })
    harness.cards.length = 0
    renderToStaticMarkup(renderRedeemShopStory({ state: 'sold_out' }))
    expect(harness.cards[0]).toMatchObject({ gift: { stock_status: 'sold_out' } })
  })

  it('keeps actual local fixtures recursively frozen with no remote image URLs', () => {
    expect(REDEEM_SHOP_STORY_STATES).toEqual([
      'ready', 'wallet_loading', 'wallet_unavailable', 'catalog_loading', 'empty_catalog',
      'inline_error', 'blocking_error', 'credit_locked', 'owned', 'sold_out',
    ])
    expect(Object.keys(REDEEM_SHOP_STORY_FIXTURES)).toEqual([...REDEEM_SHOP_STORY_STATES])
    expect(isFrozenDeep(REDEEM_SHOP_STORY_FIXTURES)).toBe(true)
    expect(Object.values(REDEEM_SHOP_STORY_FIXTURES).every((fixture) => (
      fixture.catalog.items.every((gift) => gift.image_url === null)
    ))).toBe(true)
    expect(REDEEM_SHOP_STORY_FIXTURES.credit_locked.wallet.canRedeemCreditRewards).toBe(false)
    expect(REDEEM_SHOP_STORY_FIXTURES.credit_locked.catalog.items[0]).toMatchObject({
      price_points: null,
      price_credits: 12,
    })
    expect(REDEEM_SHOP_STORY_FIXTURES.owned.catalog.items[0]?.owned).toBe(true)
    expect(REDEEM_SHOP_STORY_FIXTURES.sold_out.catalog.items[0]?.stock_status).toBe('sold_out')
  })
})

function isFrozenDeep(value: unknown): boolean {
  if (!value || typeof value !== 'object') return true
  if (!Object.isFrozen(value)) return false
  return Object.values(value).every(isFrozenDeep)
}
