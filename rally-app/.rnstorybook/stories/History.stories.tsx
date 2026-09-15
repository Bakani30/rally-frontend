import { cloneElement, createElement, type ReactElement } from 'react'
import { Text, View } from 'react-native'
import type { Meta, StoryObj } from '@storybook/react-native'

import { BasketballHistoryMatchCardView } from '@/components/history/BasketballHistoryMatchCardView'
import { MatchesView, type MatchesViewProps } from '@/components/history/MatchesView'
import { ScreenBackButtonView } from '@/components/navigation/ScreenBackButtonView'

import { BASKETBALL_HISTORY_STORY_RECORD, HISTORY_STORY_FIXTURES, HISTORY_STORY_STATES, type HistoryStoryState } from './historyStoryFixtures'

export type HistoryStoryArgs = { state: HistoryStoryState }

const states = new Set<string>(HISTORY_STORY_STATES)

export function parseHistoryStoryArgs(input: unknown): HistoryStoryArgs {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('History Storybook args must contain exactly one supported state')
  }
  const args = input as Record<string, unknown>
  if (Reflect.ownKeys(args).length !== 1 || !Object.hasOwn(args, 'state') || typeof args.state !== 'string' || !states.has(args.state)) {
    throw new Error('History Storybook args must contain exactly one supported state')
  }
  return { state: args.state as HistoryStoryState }
}

export function renderHistoryStory(rawArgs: unknown) {
  let state: HistoryStoryState
  try {
    state = parseHistoryStoryArgs(rawArgs).state
  } catch {
    return createElement(StorybookValidationDiagnostic, { message: 'Invalid History story args. Choose a supported display state from Controls.' })
  }
  return createElement(MatchesView, propsFor(state))
}

function propsFor(state: HistoryStoryState): MatchesViewProps {
  const fixture = HISTORY_STORY_FIXTURES[state]
  return {
    ...fixture,
    onCategoryChange: (category) => logLocalIntent('change category', { state, category }),
    onRetryImpacts: () => logLocalIntent('retry impacts', state),
    renderFriendsAction: (content) => cloneElement(content as ReactElement<{ onPress?: () => void }>, { onPress: () => logLocalIntent('open friends', state) }),
    renderRow: (row) => row.rowKind === 'feed' ? createElement(BasketballHistoryMatchCardView, {
      ...BASKETBALL_HISTORY_STORY_RECORD,
      pin: { pinned: false, atCap: false, pending: false, onToggle: () => logLocalIntent('toggle pin', state) },
      onOpen: () => logLocalIntent('open match', state),
    }) : null,
    sectionEmptyText: (section) => section.emptyText,
    renderBackControl: (style) => createElement(ScreenBackButtonView, {
      onPress: () => logLocalIntent('go back', state),
      style,
    }),
    syncStatusContent: null,
  }
}

function logLocalIntent(name: string, input: unknown) { console.info(`[Storybook] History ${name}`, input) }

function StorybookValidationDiagnostic({ message }: { message: string }) {
  return createElement(View, { accessibilityRole: 'alert', accessibilityLabel: 'Storybook validation error' }, createElement(Text, null, message))
}

type HistoryStoryMeta = Omit<Meta<typeof MatchesView>, 'argTypes'> & {
  argTypes: { state: { control: { type: 'select' }; options: readonly HistoryStoryState[]; description: string } }
}

const meta = {
  title: 'History/Matches',
  component: MatchesView,
  excludeStories: /^(parseHistoryStoryArgs|renderHistoryStory)$/,
  argTypes: { state: { control: { type: 'select' }, options: [...HISTORY_STORY_STATES], description: 'Read-only local history fixture. Actions log locally and do not navigate or mutate data.' } },
  parameters: { controls: { exclude: ['sections', 'renderRow', 'renderFriendsAction', 'onCategoryChange', 'onRetryImpacts', 'sectionEmptyText', 'backControl', 'syncStatusContent'] } },
} satisfies HistoryStoryMeta

export default meta
type Story = StoryObj<HistoryStoryArgs>
function stateStory(state: HistoryStoryState): Story { return { args: { state }, render: renderHistoryStory } }
export const Loading = stateStory('loading')
export const MatchLoadError = stateStory('match_load_error')
export const Empty = stateStory('empty')
export const BasketballReady = stateStory('basketball_ready')
export const ActivityHistoryError = stateStory('activity_history_error')
export const ImpactError = stateStory('impact_error')
