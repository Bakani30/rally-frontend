import { createElement, useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import type { Meta, StoryObj } from '@storybook/react-native'

import { ProfileFeaturedMatchView } from '@/components/profile/ProfileFeaturedMatchView'
import { ProfileLoadingView } from '@/components/profile/ProfileLoadingView'
import { ProfileView, type ProfileViewProps } from '@/components/profile/ProfileView'

import { PROFILE_STORY_FIXTURES, PROFILE_STORY_STATES, type ProfileStoryState } from './profileStoryFixtures'

export type ProfileStoryArgs = { state: ProfileStoryState }

const supportedStates = new Set<string>(PROFILE_STORY_STATES)

export function parseProfileStoryArgs(input: unknown): ProfileStoryArgs {
  if (!isPlainArgsRecord(input) || Reflect.ownKeys(input).length !== 1 || !Object.hasOwn(input, 'state') || typeof input.state !== 'string' || !supportedStates.has(input.state)) {
    throw new Error('Profile Storybook args must contain exactly one supported state')
  }
  return { state: input.state as ProfileStoryState }
}

export function renderProfileStory(rawArgs: unknown) {
  let state: ProfileStoryState
  try {
    state = parseProfileStoryArgs(rawArgs).state
  } catch {
    return createElement(StorybookValidationDiagnostic, {
      message: 'Invalid Profile story args. Choose a supported display state from Controls.',
    })
  }
  return createElement(ProfileStoryRenderer, { state })
}

function ProfileStoryRenderer({ state }: { state: ProfileStoryState }) {
  const profileState = state === 'loading' ? 'new_player' : state
  const fixture = PROFILE_STORY_FIXTURES[profileState]
  const [cardOpen, setCardOpen] = useState(fixture.cardOpen)

  useEffect(() => {
    setCardOpen(fixture.cardOpen)
  }, [fixture.cardOpen, profileState])

  if (state === 'loading') return <ProfileLoadingView />
  return <ProfileView {...profilePropsFor(profileState, cardOpen, setCardOpen)} />
}

function profilePropsFor(
  state: Exclude<ProfileStoryState, 'loading'>,
  cardOpen: boolean,
  setCardOpen: (open: boolean | ((current: boolean) => boolean)) => void,
): ProfileViewProps {
  const fixture = PROFILE_STORY_FIXTURES[state]
  return {
    ...fixture,
    cardOpen,
    onToggleCard: () => {
      setCardOpen((current) => !current)
      logLocalAction('toggle member card', state)
    },
    onBack: () => logLocalAction('back', state),
    onOpenSettings: () => logLocalAction('open settings', state),
    onOpenMatches: () => logLocalAction('open matches', state),
    onOpenWallet: () => logLocalAction('open wallet', state),
    onOpenReferee: () => logLocalAction('open referee', state),
    onToggleCheckin: () => logLocalAction('toggle check-in', state),
    onOpenCosmetics: () => logLocalAction('open cosmetics', state),
    onOpenRank: () => logLocalAction('open rank', state),
    onEditRole: (activity) => logLocalAction('edit role', { state, activity }),
    onChangeAvatar: () => logLocalAction('change avatar', state),
    featuredMatch: createElement(ProfileFeaturedMatchView, {
      pins: fixture.pins,
      isOwner: true,
      onOpenPinPicker: () => logLocalAction('open pin picker', state),
    }),
  }
}

function logLocalAction(name: string, input?: unknown) {
  console.info(`[Storybook] Profile ${name}`, input ?? '')
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

type ProfileStoryMeta = Omit<Meta<typeof ProfileView>, 'argTypes'> & {
  argTypes: {
    state: {
      control: { type: 'select' }
      options: readonly ProfileStoryState[]
      description: string
    }
  }
}

const meta = {
  title: 'Profile/Profile',
  component: ProfileView,
  excludeStories: /^(parseProfileStoryArgs|renderProfileStory)$/,
  argTypes: {
    state: {
      control: { type: 'select' },
      options: [...PROFILE_STORY_STATES],
      description: 'Read-only local display fixture. Actions log locally and do not navigate or mutate data.',
    },
  },
  parameters: { controls: { include: ['state'] } },
} satisfies ProfileStoryMeta
export default meta

type Story = StoryObj<ProfileStoryArgs>
function stateStory(state: ProfileStoryState): Story {
  return { args: { state }, render: renderProfileStory }
}
export const NewPlayer = stateStory('new_player')
export const Experienced = stateStory('experienced')
export const IdentityCardOpen = stateStory('identity_card_open')
export const Loading = stateStory('loading')
