import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({
  header: [] as Array<Record<string, unknown>>,
  shortcuts: [] as Array<Record<string, unknown>>,
  entries: [] as Array<Record<string, unknown>>,
  ranks: [] as Array<Record<string, unknown>>,
}))

vi.mock('react-native', () => ({
  Platform: { select: <T,>(values: { ios?: T; android?: T; default?: T }) => values.ios ?? values.default ?? values.android },
  StyleSheet: { create: <T,>(styles: T) => styles },
  View: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
}))
vi.mock('@/components/layout/Screen', () => ({ Screen: ({ children }: { children?: React.ReactNode }) => React.createElement('main', null, children) }))
vi.mock('@/components/motion/Reveal', () => ({ Reveal: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children) }))
vi.mock('@/hooks/useAppTheme', () => ({ useSportTheme: () => ({ bg: '#161616' }) }))
vi.mock('@/components/profile/ProfileHeaderView', () => ({ ProfileHeaderView: (props: Record<string, unknown>) => { harness.header.push(props); return React.createElement('div', null, 'profile-header') } }))
vi.mock('@/components/profile/ProfileIdentityDeck', () => ({ ProfileIdentityDeck: (props: Record<string, unknown>) => React.createElement('div', null, `identity:${props.displayName}`) }))
vi.mock('@/components/profile/ProfileShortcutRowView', () => ({ ProfileShortcutRowView: (props: Record<string, unknown>) => { harness.shortcuts.push(props); return React.createElement('div', null, 'shortcuts') } }))
vi.mock('@/components/profile/ProfileEntryGridView', () => ({ ProfileEntryGridView: (props: Record<string, unknown>) => { harness.entries.push(props); return React.createElement('div', null, 'entries') } }))
vi.mock('@/components/profile/ProfileStatsCard', () => ({ ProfileStatsCard: (props: Record<string, unknown>) => React.createElement('div', null, `stats:${props.matches}`) }))
vi.mock('@/components/profile/ProfileRankListView', () => ({ ProfileRankListView: (props: Record<string, unknown>) => { harness.ranks.push(props); return React.createElement('div', null, 'ranks') } }))

import { ProfileView, type ProfileViewProps } from '@/components/profile/ProfileView'

;(globalThis as { React?: typeof React }).React = React

function propsFor(overrides: Partial<ProfileViewProps> = {}): ProfileViewProps {
  return {
    cardOpen: false,
    profile: {
      displayName: 'Rally Player', idLabel: 'PLAYER #23', initials: 'R', avatarUrl: null,
      frameAssetRef: null, username: 'rally-player', nameId: 'ID.STORY001', classLabel: 'Basketball',
      rankingLabel: 'Silver', guildLabel: '—', titleLabel: 'Street Captain',
    },
    stats: { matches: 18, wins: 12, losses: 5, ties: 1 },
    ratings: [], positions: {}, checkedInToday: false,
    onToggleCard: () => undefined, onBack: () => undefined, onOpenSettings: () => undefined,
    onOpenMatches: () => undefined, onOpenWallet: () => undefined, onOpenReferee: () => undefined,
    onToggleCheckin: () => undefined, onOpenCosmetics: () => undefined, onOpenRank: () => undefined,
    onEditRole: () => undefined, ...overrides,
  }
}

describe('ProfileView presentation', () => {
  beforeEach(() => {
    for (const values of Object.values(harness)) values.length = 0
  })

  it('composes the production profile sections with local display data', () => {
    const html = renderToStaticMarkup(React.createElement(ProfileView, propsFor()))
    expect(html).toContain('profile-header')
    expect(html).toContain('identity:Rally Player')
    expect(html).toContain('stats:18')
    expect(html).toContain('ranks')
  })

  it('forwards profile navigation and edit intents through callback-only child Views', () => {
    const actions = {
      matches: vi.fn(), wallet: vi.fn(), referee: vi.fn(), checkin: vi.fn(), cosmetics: vi.fn(), rank: vi.fn(), role: vi.fn(),
    }
    renderToStaticMarkup(React.createElement(ProfileView, propsFor({
      onOpenMatches: actions.matches, onOpenWallet: actions.wallet, onOpenReferee: actions.referee,
      onToggleCheckin: actions.checkin, onOpenCosmetics: actions.cosmetics, onOpenRank: actions.rank, onEditRole: actions.role,
    })))

    ;(harness.shortcuts.at(-1)?.onOpenMatches as (() => void) | undefined)?.()
    ;(harness.shortcuts.at(-1)?.onOpenWallet as (() => void) | undefined)?.()
    ;(harness.entries.at(-1)?.onOpenReferee as (() => void) | undefined)?.()
    ;(harness.entries.at(-1)?.onToggleCheckin as (() => void) | undefined)?.()
    ;(harness.entries.at(-1)?.onOpenCosmetics as (() => void) | undefined)?.()
    ;(harness.ranks.at(-1)?.onOpenRank as (() => void) | undefined)?.()
    ;(harness.ranks.at(-1)?.onEditRole as ((activity: string) => void) | undefined)?.('basketball')

    expect(actions.matches).toHaveBeenCalledOnce()
    expect(actions.wallet).toHaveBeenCalledOnce()
    expect(actions.referee).toHaveBeenCalledOnce()
    expect(actions.checkin).toHaveBeenCalledOnce()
    expect(actions.cosmetics).toHaveBeenCalledOnce()
    expect(actions.rank).toHaveBeenCalledOnce()
    expect(actions.role).toHaveBeenCalledWith('basketball')
  })
})
