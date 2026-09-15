import { createElement } from 'react'
import { Text, View } from 'react-native'
import type { Meta, StoryObj } from '@storybook/react-native'

import { RedeemShopView, type RedeemShopViewProps } from '@/components/gifts/RedeemShopView'

import {
  REDEEM_SHOP_STORY_FIXTURES,
  REDEEM_SHOP_STORY_STATES,
  type RedeemShopStoryState,
} from './redeemShopStoryFixtures'

export type RedeemShopStoryArgs = { state: RedeemShopStoryState }

const supportedStates = new Set<string>(REDEEM_SHOP_STORY_STATES)

export function parseRedeemShopStoryArgs(input: unknown): RedeemShopStoryArgs {
  if (!isPlainArgsRecord(input) || Reflect.ownKeys(input).length !== 1 || !Object.hasOwn(input, 'state')) {
    throw new Error('Redeem Shop Storybook args must contain exactly one supported state')
  }
  if (typeof input.state !== 'string' || !supportedStates.has(input.state)) {
    throw new Error('Redeem Shop Storybook args must contain exactly one supported state')
  }
  return { state: input.state as RedeemShopStoryState }
}

export function renderRedeemShopStory(rawArgs: unknown) {
  let state: RedeemShopStoryState
  try {
    state = parseRedeemShopStoryArgs(rawArgs).state
  } catch {
    return createElement(StorybookValidationDiagnostic, {
      message: 'Invalid Redeem Shop story args. Choose a supported display state from Controls.',
    })
  }
  return createElement(RedeemShopView, redeemShopPropsFor(state))
}

function redeemShopPropsFor(state: RedeemShopStoryState): RedeemShopViewProps {
  const fixture = REDEEM_SHOP_STORY_FIXTURES[state]
  if (!fixture) throw new Error(`Missing Redeem Shop fixture for ${state}`)
  return {
    ...fixture,
    onBack: () => logLocalAction('back', state),
    onOpenWallet: () => logLocalAction('open wallet', state),
    onOpenHistory: () => logLocalAction('open history', state),
    onOpenProfileStudio: () => logLocalAction('open profile studio', state),
    onOpenStudio: () => logLocalAction('open studio', state),
    onRetry: () => logLocalAction('retry catalog', state),
    onOpenGiftDetail: (gift) => logLocalAction('open detail', { state, giftId: gift.id }),
  }
}

function logLocalAction(name: string, input?: unknown) {
  console.info(`[Storybook] Redeem Shop ${name}`, input ?? '')
}

function StorybookValidationDiagnostic({ message }: { message: string }) {
  return createElement(
    View,
    { accessibilityRole: 'alert', accessibilityLabel: 'Storybook validation error' },
    createElement(Text, null, message),
  )
}

function isPlainArgsRecord(input: unknown): input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return false
  const prototype = Object.getPrototypeOf(input)
  return prototype === Object.prototype || prototype === null
}

type RedeemShopStoryMeta = Omit<Meta<typeof RedeemShopView>, 'argTypes'> & {
  argTypes: {
    state: { control: { type: 'select' }; options: readonly RedeemShopStoryState[]; description: string }
  }
}

const meta = {
  title: 'Rewards/Redeem Shop',
  component: RedeemShopView,
  excludeStories: /^(parseRedeemShopStoryArgs|renderRedeemShopStory)$/,
  argTypes: {
    state: {
      control: { type: 'select' },
      options: [...REDEEM_SHOP_STORY_STATES],
      description: 'Read-only local display fixture. Actions log locally and never navigate, redeem, or mutate balances.',
    },
  },
  parameters: {
    controls: {
      exclude: [
        'catalog', 'wallet', 'onBack', 'onOpenWallet', 'onOpenHistory', 'onOpenProfileStudio',
        'onOpenStudio', 'onRetry', 'onOpenGiftDetail',
      ],
    },
  },
} satisfies RedeemShopStoryMeta

export default meta

type Story = StoryObj<RedeemShopStoryArgs>

function stateStory(state: RedeemShopStoryState): Story {
  return { args: { state }, render: renderRedeemShopStory }
}

export const Ready = stateStory('ready')
export const WalletLoading = stateStory('wallet_loading')
export const WalletUnavailable = stateStory('wallet_unavailable')
export const CatalogLoading = stateStory('catalog_loading')
export const EmptyCatalog = stateStory('empty_catalog')
export const InlineError = stateStory('inline_error')
export const BlockingError = stateStory('blocking_error')
export const CreditLocked = stateStory('credit_locked')
export const Owned = stateStory('owned')
export const SoldOut = stateStory('sold_out')
