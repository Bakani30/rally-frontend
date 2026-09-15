import { createElement, useState, type ComponentProps } from 'react'
import { Text, View } from 'react-native'
import type { Meta, StoryObj } from '@storybook/react-native'

import { ArenaSessionBoard } from '@/components/arena-session/ArenaSessionBoard'
import { buildArenaLifecycleSnapshot } from '@/lib/dev-preview/arenaLifecycleFixtures'
import type { ArenaSessionSnapshot } from '@/types/arenaSession'

import {
  ARENA_SESSION_STORY_STATES,
  parseArenaSessionStoryArgs,
  type ArenaSessionStoryArgs,
  type ArenaSessionStoryState,
} from './arenaSessionStoryArgs'

function logLocalAction(name: string, input?: unknown) {
  console.info(`[Storybook] ArenaSessionBoard ${name}`, input ?? '')
}

export function freezeDeep<Value>(value: Value): Value {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child)
    Object.freeze(value)
  }
  return value
}

const snapshots = Object.fromEntries(
  ARENA_SESSION_STORY_STATES.map((state) => [state, freezeDeep(buildArenaLifecycleSnapshot(state))]),
) as Record<ArenaSessionStoryState, ComponentProps<typeof ArenaSessionBoard>['snapshot']>

function boardPropsFor(state: ArenaSessionStoryState): ComponentProps<typeof ArenaSessionBoard> {
  const snapshot = snapshots[state]
  if (!snapshot) throw new Error(`Missing ArenaSessionBoard fixture for ${state}`)

  return {
    snapshot,
    actorUserId: 'preview-arena-actor',
    roundControlsFresh: true,
    onRetry: () => logLocalAction('retry', state),
    onRecordPresence: () => logLocalAction('record presence', state),
    onReady: () => logLocalAction('ready', state),
    onStageParty: (input) => logLocalAction('stage party', { state, input }),
    onUpdateStakeProposal: (input) => logLocalAction('update stake proposal', { state, input }),
    onConfirmFinalStake: (input) => logLocalAction('confirm final stake', { state, input }),
    onStartRound: (input) => logLocalAction('start round', { state, input }),
    onChooseTeamParticipation: (input) => logLocalAction('choose team participation', { state, input }),
    onLeave: () => logLocalAction('leave', state),
    onGoToArenaList: () => logLocalAction('go to arena list', state),
    onGoToMatch: (matchId) => logLocalAction('go to match', { state, matchId }),
  }
}

export function renderArenaSessionBoard(rawArgs: unknown) {
  let state: ArenaSessionStoryState
  try {
    state = parseArenaSessionStoryArgs(rawArgs).state
  } catch {
    return createElement(StorybookValidationDiagnostic, {
      message: 'Invalid Arena Session story args. Choose a supported state from Controls.',
    })
  }

  const props = boardPropsFor(state)
  if (state === 'in_progress') {
    return createElement(InProgressClockStoryBoard, { key: state, props })
  }
  return createElement(ArenaSessionBoard, props)
}

export function rebaseInProgressSnapshot(
  snapshot: ArenaSessionSnapshot,
  anchorMs: number,
): ArenaSessionSnapshot | null {
  const liveRound = snapshot.liveRound
  if (!liveRound || liveRound.status !== 'in_progress' || liveRound.phase !== 'active') return null

  const liveRoundIndex = snapshot.rounds.findIndex((round) => (
    round.roundId === liveRound.roundId && round.status === 'in_progress'
  ))
  if (liveRoundIndex < 0) return null

  const startedAt = new Date(anchorMs - 120_000).toISOString()
  return freezeDeep({
    ...snapshot,
    liveRound: { ...liveRound },
    rounds: snapshot.rounds.map((round, index) => (
      index === liveRoundIndex ? { ...round, startedAt } : round
    )),
  })
}

function InProgressClockStoryBoard({ props }: { props: ComponentProps<typeof ArenaSessionBoard> }) {
  const [anchorMs] = useState(() => Date.now())
  const snapshot = props.snapshot ? rebaseInProgressSnapshot(props.snapshot, anchorMs) : null
  if (!snapshot) {
    return createElement(StorybookValidationDiagnostic, {
      message: 'The in-progress fixture has no active historical round record.',
    })
  }
  return createElement(ArenaSessionBoard, { ...props, snapshot })
}

function StorybookValidationDiagnostic({ message }: { message: string }) {
  return createElement(
    View,
    { accessibilityRole: 'alert', accessibilityLabel: 'Storybook validation error' },
    createElement(Text, null, message),
  )
}

type ArenaSessionStoryMeta = Omit<Meta<typeof ArenaSessionBoard>, 'argTypes'> & {
  argTypes: {
    state: {
      control: { type: 'select' }
      options: readonly ArenaSessionStoryState[]
      description: string
    }
  }
}

const meta = {
  title: 'Arena Session/Board',
  component: ArenaSessionBoard,
  excludeStories: /^(freezeDeep|renderArenaSessionBoard|rebaseInProgressSnapshot)$/,
  argTypes: {
    state: {
      control: { type: 'select' },
      options: [...ARENA_SESSION_STORY_STATES],
      description: 'Read-only display fixture. Actions log locally and do not advance state.',
    },
  },
  parameters: {
    controls: {
      exclude: [
        'snapshot',
        'party',
        'actorUserId',
        'isSyncing',
        'isReconnecting',
        'error',
        'actionPending',
        'presencePending',
        'roundControlsFresh',
        'onRetry',
        'onRecordPresence',
        'onReady',
        'onStageParty',
        'onUpdateStakeProposal',
        'onConfirmFinalStake',
        'onStartRound',
        'onChooseTeamParticipation',
        'onLeave',
        'onGoToArenaList',
        'onGoToMatch',
      ],
    },
  },
} satisfies ArenaSessionStoryMeta

export default meta

type Story = StoryObj<ArenaSessionStoryArgs>

function stateStory(state: ArenaSessionStoryState): Story {
  return {
    args: { state },
    render: renderArenaSessionBoard,
  }
}

export const PairedStake = stateStory('paired_stake')
export const ReadyToStart = stateStory('ready_to_start')
export const InProgress = stateStory('in_progress')
export const SettledWinner = stateStory('settled_winner')
export const SettledLoser = stateStory('settled_loser')
export const CaptainDecisionRequired = stateStory('captain_decision_required')
export const TeammateWaiting = stateStory('teammate_waiting')
export const Retired = stateStory('retired')
export const Draining = stateStory('draining')
export const Closed = stateStory('closed')
