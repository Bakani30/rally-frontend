import { createElement } from 'react'
import { Text, View } from 'react-native'
import type { Meta, StoryObj } from '@storybook/react-native'

import { HomeView, type HomeViewProps } from '@/components/home/HomeView'

import {
  HOME_STORY_FIXTURES,
  HOME_STORY_STATES,
  type HomeStoryState,
} from './homeStoryFixtures'

export type HomeStoryArgs = { state: HomeStoryState }

const supportedStates = new Set<string>(HOME_STORY_STATES)

export function parseHomeStoryArgs(input: unknown): HomeStoryArgs {
  if (!isPlainArgsRecord(input) || Reflect.ownKeys(input).length !== 1 || !Object.hasOwn(input, 'state')) {
    throw new Error('Home Storybook args must contain exactly one supported state')
  }
  if (typeof input.state !== 'string' || !supportedStates.has(input.state)) {
    throw new Error('Home Storybook args must contain exactly one supported state')
  }
  return { state: input.state as HomeStoryState }
}

export function renderHomeStory(rawArgs: unknown) {
  let state: HomeStoryState
  try {
    state = parseHomeStoryArgs(rawArgs).state
  } catch {
    return createElement(StorybookValidationDiagnostic, {
      message: 'Invalid Home story args. Choose a supported display state from Controls.',
    })
  }
  return createElement(HomeStoryPreview, { state })
}

function HomeStoryPreview({ state }: HomeStoryArgs) {
  return createElement(View, { style: { flex: 1 } }, createElement(HomeView, homePropsFor(state)))
}

function homePropsFor(state: HomeStoryState): HomeViewProps {
  const fixture = HOME_STORY_FIXTURES[state]
  if (!fixture) throw new Error(`Missing Home fixture for ${state}`)

  return {
    ...fixture,
    onRefresh: () => logLocalAction('refresh', state),
    onOpenWallet: () => logLocalAction('open wallet', state),
    onPressHeroSlide: (slide) => logLocalAction('open hero', { state, slideId: slide.id }),
    onPressShortcut: (shortcut) => logLocalAction('open shortcut', { state, shortcut }),
    onSelectQuest: (quest) => logLocalAction('select quest', { state, questId: quest.templateId }),
    onOpenQuests: () => logLocalAction('open quests', state),
    onPressNotifications: () => logLocalAction('open notifications', state),
    onPressProfile: () => logLocalAction('open profile', state),
    onApplyOtaUpdate: () => logLocalAction('apply update', state),
  }
}

function logLocalAction(name: string, input?: unknown) {
  console.info(`[Storybook] Home ${name}`, input ?? '')
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

type HomeStoryMeta = Omit<Meta<typeof HomeView>, 'argTypes'> & {
  argTypes: {
    state: {
      control: { type: 'select' }
      options: readonly HomeStoryState[]
      description: string
    }
  }
}

const meta = {
  title: 'Home/Home',
  component: HomeView,
  excludeStories: /^(parseHomeStoryArgs|renderHomeStory)$/,
  argTypes: {
    state: {
      control: { type: 'select' },
      options: [...HOME_STORY_STATES],
      description: 'Read-only local display fixture. Actions log locally and do not navigate or mutate data.',
    },
  },
  parameters: {
    // Home owns its safe-area spacing so the hero can render behind the iOS status bar.
    noSafeArea: true,
    controls: {
      exclude: [
        'refreshing', 'onRefresh', 'wallet', 'onOpenWallet', 'heroSlides', 'onPressHeroSlide',
        'onPressShortcut',
        'quests', 'onSelectQuest', 'onOpenQuests', 'identity', 'onPressNotifications',
        'onPressProfile', 'otaUpdate', 'onApplyOtaUpdate',
      ],
    },
  },
} satisfies HomeStoryMeta

export default meta

type Story = StoryObj<HomeStoryArgs>

function stateStory(state: HomeStoryState): Story {
  return { args: { state }, render: renderHomeStory }
}

export const Ready = stateStory('ready')
export const NoVenue = stateStory('no_venue')
export const NoPointDelta = stateStory('no_point_delta')
export const WalletLoading = stateStory('wallet_loading')
export const WalletUnavailable = stateStory('wallet_unavailable')
export const EmptyMissions = stateStory('empty_missions')
export const MissionsLoading = stateStory('missions_loading')
export const MissionsSyncing = stateStory('missions_syncing')
export const MissionsSyncFailed = stateStory('missions_sync_failed')
export const MissionsProofNeeded = stateStory('missions_proof_needed')
export const MissionsComplete = stateStory('missions_complete')
