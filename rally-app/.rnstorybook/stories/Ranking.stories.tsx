import { createElement } from 'react'
import { Text, View } from 'react-native'
import type { Meta, StoryObj } from '@storybook/react-native'

import { LeaderboardView, type LeaderboardQueryState } from '@/components/leaderboard/LeaderboardView'
import { MyRankView } from '@/components/rank/MyRankView'
import { SportRankPageView } from '@/components/rank/SportRankPageView'

import {
  LEADERBOARD_ENTRIES,
  MY_RANK_LOCKED_PAGE,
  MY_RANK_LOCKED_VIEW,
  MY_RANK_RANKED_PAGE,
  MY_RANK_RANKED_VIEW,
} from './rankingStoryFixtures'

export const RANKING_STORY_STATES = [
  'my_rank_locked',
  'my_rank_ranked',
  'leaderboard_loading',
  'leaderboard_error',
  'leaderboard_empty',
  'leaderboard_ready',
] as const

export type RankingStoryState = typeof RANKING_STORY_STATES[number]
export type RankingStoryArgs = { state: RankingStoryState }

function logLocalAction(name: string, input?: unknown) {
  console.info(`[Storybook] Ranking ${name}`, input ?? '')
}

export function parseRankingStoryArgs(rawArgs: unknown): RankingStoryArgs {
  if (!rawArgs || typeof rawArgs !== 'object' || Array.isArray(rawArgs)) throw new Error('Ranking story args must be an object')
  const args = rawArgs as Record<string, unknown>
  if (Object.keys(args).length !== 1 || typeof args.state !== 'string' || !RANKING_STORY_STATES.includes(args.state as RankingStoryState)) {
    throw new Error('Ranking story args must contain exactly one supported state')
  }
  return { state: args.state as RankingStoryState }
}

export function renderRankingStory(rawArgs: unknown) {
  try {
    return rankingStoryFor(parseRankingStoryArgs(rawArgs).state)
  } catch {
    return createElement(StorybookValidationDiagnostic, {
      message: 'Invalid Ranking story args. Choose a supported state from Controls.',
    })
  }
}

function rankingStoryFor(state: RankingStoryState) {
  if (state === 'my_rank_locked' || state === 'my_rank_ranked') {
    const page = state === 'my_rank_locked' ? MY_RANK_LOCKED_PAGE : MY_RANK_RANKED_PAGE
    const view = state === 'my_rank_locked' ? MY_RANK_LOCKED_VIEW : MY_RANK_RANKED_VIEW
    return createElement(MyRankView, {
      pages: [page],
      onActivityViewed: (activity) => logLocalAction('view activity', activity),
      onOpenLeaderboard: (activity) => logLocalAction('open leaderboard', activity),
      onFindMatch: (activity) => logLocalAction('find match', activity),
      ladderAccessibilityLabel: 'View all ranks',
      renderSportPage: (item, index, count) => createElement(SportRankPageView, {
        ...view,
        pageIndex: index,
        pageCount: count,
        onFindMatch: item.onFindMatch,
      }),
    })
  }

  const queryState: LeaderboardQueryState = {
    isPending: state === 'leaderboard_loading',
    isError: state === 'leaderboard_error',
    isEmpty: state === 'leaderboard_empty',
  }
  const entries = state === 'leaderboard_ready' ? LEADERBOARD_ENTRIES : []
  const ownEntry = entries.find((entry) => entry.userId === 'story-player')
  const podium = entries.filter((entry) => entry.rank <= 3)
  const list = entries.slice(0, 10)
  return createElement(LeaderboardView, {
    activity: 'basketball',
    scope: 'global',
    podium,
    list,
    ownEntry,
    showOwnEntry: !!ownEntry && !podium.some((entry) => entry.userId === ownEntry.userId) && !list.some((entry) => entry.userId === ownEntry.userId),
    queryState,
    entryCount: entries.length,
    currentUserId: 'story-player',
    onScopeChange: (scope) => logLocalAction('change scope', scope),
    onRetry: () => logLocalAction('retry'),
    onBack: () => logLocalAction('back'),
    onOpenUser: (userId) => logLocalAction('open user', userId),
    initiallyAnimateEntrance: false,
  })
}

function StorybookValidationDiagnostic({ message }: { message: string }) {
  return createElement(
    View,
    { accessibilityRole: 'alert', accessibilityLabel: 'Storybook validation error' },
    createElement(Text, null, message),
  )
}

type RankingStoryMeta = Omit<Meta<typeof MyRankView>, 'argTypes'> & {
  argTypes: { state: { control: { type: 'select' }; options: readonly RankingStoryState[]; description: string } }
}

const meta = {
  title: 'Ranking/Shared Views',
  component: MyRankView,
  excludeStories: /^(RANKING_STORY_STATES|parseRankingStoryArgs|renderRankingStory)$/,
  argTypes: {
    state: {
      control: { type: 'select' },
      options: [...RANKING_STORY_STATES],
      description: 'Read-only local display fixture. Actions log locally and do not navigate or mutate data.',
    },
  },
  parameters: { controls: { exclude: ['pages', 'onActivityViewed', 'onOpenLeaderboard', 'onFindMatch', 'renderSportPage', 'onOpenUser'] } },
} satisfies RankingStoryMeta

export default meta

type Story = StoryObj<RankingStoryArgs>

function stateStory(state: RankingStoryState): Story {
  return { args: { state }, render: renderRankingStory }
}

export const MyRankLocked = stateStory('my_rank_locked')
export const MyRankRanked = stateStory('my_rank_ranked')
export const LeaderboardLoading = stateStory('leaderboard_loading')
export const LeaderboardError = stateStory('leaderboard_error')
export const LeaderboardEmpty = stateStory('leaderboard_empty')
export const LeaderboardReady = stateStory('leaderboard_ready')
