import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { isExportStory } from 'storybook/internal/csf'
import { describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({ profiles: [] as Array<Record<string, unknown>> }))

vi.mock('react-native', () => ({
  Platform: { select: <T,>(values: { ios?: T; default?: T }) => values.ios ?? values.default },
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: ({ children }: { children?: React.ReactNode }) => React.createElement('span', null, children),
  View: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
}))
vi.mock('@/components/profile/ProfileView', () => ({
  ProfileView: (props: Record<string, unknown>) => {
    harness.profiles.push(props)
    return React.createElement('main', null, `profile:${(props.profile as { displayName: string }).displayName}:${props.cardOpen}`)
  },
}))
vi.mock('@/components/profile/ProfileFeaturedMatchView', () => ({
  ProfileFeaturedMatchView: ({ pins }: { pins: unknown[] }) => React.createElement('div', null, `pinned:${pins.length}`),
}))
vi.mock('@/components/profile/ProfileLoadingView', () => ({ ProfileLoadingView: () => React.createElement('div', null, 'profile-loading') }))

import {
  Experienced,
  IdentityCardOpen,
  Loading,
  NewPlayer,
  parseProfileStoryArgs,
  renderProfileStory,
} from './Profile.stories'
import meta from './Profile.stories'
import { PROFILE_STORY_FIXTURES } from './profileStoryFixtures'

;(globalThis as { React?: typeof React }).React = React

describe('Profile Storybook presentation', () => {
  it('renders production profile composition for new, experienced, and open-card local fixtures', () => {
    expect(renderToStaticMarkup(renderProfileStory({ state: 'new_player' }))).toContain('profile:Rookie Jay:false')
    expect(renderToStaticMarkup(renderProfileStory({ state: 'experienced' }))).toContain('profile:Rally Player:false')
    expect(renderToStaticMarkup(renderProfileStory({ state: 'identity_card_open' }))).toContain('profile:Rally Player:true')
  })

  it('uses the exact production loading view instead of mounting ProfileScreen', () => {
    expect(renderToStaticMarkup(renderProfileStory({ state: 'loading' }))).toContain('profile-loading')
  })

  it('keeps featured matches in the exact owner-empty state without fabricated media', () => {
    renderToStaticMarkup(renderProfileStory({ state: 'experienced' }))
    expect(renderToStaticMarkup(harness.profiles.at(-1)?.featuredMatch as React.ReactElement)).toContain('pinned:0')
    expect(PROFILE_STORY_FIXTURES.experienced.pins).toEqual([])
  })

  it('provides a local avatar-change callback to the production identity control', () => {
    renderToStaticMarkup(renderProfileStory({ state: 'experienced' }))
    const onChangeAvatar = harness.profiles.at(-1)?.onChangeAvatar as (() => void) | undefined

    expect(onChangeAvatar).toBeTypeOf('function')
    expect(() => onChangeAvatar?.()).not.toThrow()
  })

  it('publishes only named local display stories and rejects extra args', () => {
    expect(NewPlayer.args).toEqual({ state: 'new_player' })
    expect(Experienced.args).toEqual({ state: 'experienced' })
    expect(IdentityCardOpen.args).toEqual({ state: 'identity_card_open' })
    expect(Loading.args).toEqual({ state: 'loading' })
    expect(Object.keys(meta.argTypes ?? {})).toEqual(['state'])
    expect(() => parseProfileStoryArgs({ state: 'experienced', mutate: true })).toThrow()
    expect(renderToStaticMarkup(renderProfileStory({ state: 'invalid' }))).toContain('Invalid Profile story args')
  })

  it('registers only the four named Profile stories and excludes runtime helpers', async () => {
    const storyModule = await import('./Profile.stories')
    const storyExports = Object.keys(storyModule)
      .filter((key) => key !== 'default' && isExportStory(key, meta))

    expect(storyExports).toEqual(['NewPlayer', 'Experienced', 'IdentityCardOpen', 'Loading'])
    expect(isExportStory('parseProfileStoryArgs', meta)).toBe(false)
    expect(isExportStory('renderProfileStory', meta)).toBe(false)
  })
})
