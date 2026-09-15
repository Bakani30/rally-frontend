import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({
  refresh: [] as Array<{ refreshing: boolean; onRefresh?: () => void }>,
  scrolls: [] as Array<{ onScroll?: (event: { nativeEvent: { contentOffset: { y: number } } }) => void }>,
  wallet: [] as Array<Record<string, unknown>>,
  hero: [] as Array<Record<string, unknown>>,
  shortcuts: [] as Array<Record<string, unknown>>,
  quickMatch: [] as Array<Record<string, unknown>>,
  quests: [] as Array<Record<string, unknown>>,
  identity: [] as Array<Record<string, unknown>>,
  ota: [] as Array<Record<string, unknown>>,
}))

vi.mock('react-native', () => ({
  Animated: {
    Value: class {
      interpolate() { return 0 }
    },
    event: (_mapping: unknown, config?: { listener?: (event: { nativeEvent: { contentOffset: { y: number } } }) => void }) => (event: { nativeEvent: { contentOffset: { y: number } } }) => config?.listener?.(event),
    ScrollView: ({ children, refreshControl, onScroll }: { children?: React.ReactNode; refreshControl?: React.ReactNode; onScroll?: (event: { nativeEvent: { contentOffset: { y: number } } }) => void }) => {
      harness.scrolls.push({ onScroll })
      return React.createElement('main', null, refreshControl, children)
    },
    View: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  },
  RefreshControl: ({ refreshing, onRefresh }: { refreshing: boolean; onRefresh?: () => void }) => {
    harness.refresh.push({ refreshing, onRefresh })
    return React.createElement('button', { onClick: onRefresh }, `refresh:${refreshing}`)
  },
  ImageBackground: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  Platform: { OS: 'test', select: <T,>(values: { default?: T; [platform: string]: T | undefined }) => values.test ?? values.default },
  Pressable: ({ children, onPress }: { children?: React.ReactNode; onPress?: () => void }) => React.createElement('button', { onClick: onPress }, children),
  StyleSheet: { create: <T,>(styles: T) => styles },
  UIManager: { getViewManagerConfig: () => null },
  Text: ({ children }: { children?: React.ReactNode }) => React.createElement('span', null, children),
  View: ({ children, testID }: { children?: React.ReactNode; testID?: string }) => React.createElement('div', { 'data-testid': testID }, children),
}))
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0 }) }))
vi.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: () => React.createElement('span', null),
}))
vi.mock('@/hooks/useAppTheme', () => ({ useSportTheme: () => ({ bg: '#161616', orange: '#eb773c' }), useThemeMode: () => 'light' }))
vi.mock('@/components/motion/Reveal', () => ({ Reveal: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children) }))

vi.mock('@/components/home/HomeScoreVaultCard', () => ({
  HomeScoreVaultCard: (props: Record<string, unknown>) => {
    harness.wallet.push(props)
    return React.createElement('div', null, `wallet:${props.walletStatus}`)
  },
}))
vi.mock('@/components/home/HomeArenaHero', () => ({
  HomeArenaHero: (props: Record<string, unknown>) => {
    harness.hero.push(props)
    return React.createElement('div', null, `hero:${(props.slides as unknown[])?.length ?? 0}`)
  },
}))
vi.mock('@/components/home/HomeShortcutRail', () => ({
  HomeShortcutRail: (props: Record<string, unknown>) => {
    harness.shortcuts.push(props)
    return React.createElement('div', null, 'shortcuts')
  },
}))
vi.mock('@/components/home/QuickMatchCard', () => ({
  QuickMatchCard: (props: Record<string, unknown>) => {
    harness.quickMatch.push(props)
    return React.createElement('div', null, `quick:${props.label}`)
  },
}))
vi.mock('@/components/home/HomeDailyQuests', () => ({
  HomeDailyQuests: (props: Record<string, unknown>) => {
    harness.quests.push(props)
    return React.createElement('div', null, `quests:${(props.views as unknown[])?.length ?? 0}`)
  },
}))
vi.mock('@/components/home/HomeIdentityHeader', () => ({
  HomeIdentityHeader: (props: Record<string, unknown>) => {
    harness.identity.push(props)
    return React.createElement('div', null, `identity:${props.displayName}`)
  },
}))
vi.mock('@/components/home/HomeOtaUpdateBanner', () => ({
  HomeOtaUpdateBanner: (props: Record<string, unknown>) => {
    harness.ota.push(props)
    return React.createElement('div', null, 'ota')
  },
}))
vi.mock('../../assets/images/home/ad-basketball.png', () => ({ default: 1 }))
vi.mock('../../assets/images/home/ad-badminton.png', () => ({ default: 2 }))
vi.mock('../../assets/images/home/ad-running.png', () => ({ default: 3 }))
vi.mock('@/assets/images/home/figma-new-home-hero-light.png', () => ({ default: 4 }))
vi.mock('@/assets/images/home/figma-new-home-hero-dark.png', () => ({ default: 5 }))
vi.mock('../../assets/images/home/figma-new-home-promo-light.png', () => ({ default: 6 }))
vi.mock('../../assets/images/home/figma-new-home-promo-dark.png', () => ({ default: 7 }))
vi.mock('./homeStoryFixtures', () => ({
  HOME_STORY_STATES: ['ready', 'no_venue', 'no_point_delta', 'wallet_loading', 'wallet_unavailable', 'empty_missions'],
  HOME_STORY_FIXTURES: {
    ready: propsForStoryFixture('ready'),
    no_venue: propsForStoryFixture('ready'),
    no_point_delta: propsForStoryFixture('ready'),
    wallet_loading: propsForStoryFixture('loading'),
    wallet_unavailable: propsForStoryFixture('unavailable'),
    empty_missions: propsForStoryFixture('empty'),
  },
}))

import { HomeView, type HomeViewProps } from '@/components/home/HomeView'

import {
  EmptyMissions,
  NoPointDelta,
  NoVenue,
  Ready,
  WalletLoading,
  WalletUnavailable,
  parseHomeStoryArgs,
  renderHomeStory,
} from './Home.stories'
import * as HomeStories from './Home.stories'
import meta from './Home.stories'

;(globalThis as { React?: typeof React }).React = React

function propsForStoryFixture(state: 'ready' | 'loading' | 'unavailable' | 'empty') {
  return {
    refreshing: false,
    wallet: {
      walletPoints: state === 'ready' || state === 'empty' ? 1280 : 0,
      walletStatus: state === 'loading' ? 'loading' : state === 'unavailable' ? 'unavailable' : 'ready',
      pointsDelta: null,
    },
    heroSlides: [{ id: 'fixture', kicker: 'RUNNING', title: 'Fixture', body: '', icon: 'run', imageSource: 1, tone: 'green', visualOnly: true }],
    quests: {
      views: state === 'ready' ? [{
        templateId: 'storybook-running-distance', slug: 'storybook-running-distance', activity: 'running', lane: 'move', verifier: 'sensor_sync',
        titleTH: 'เดินหรือวิ่ง 7 กม.', requirementTH: 'สะสมระยะทาง 7 กม.', ctaTH: 'เริ่มภารกิจ', evidenceTH: 'ซิงก์กิจกรรม', targetTH: '',
        rewardPoints: 50, attemptsPerDay: 1, accentColor: '#0fa968', icon: 'run', timeLimitSeconds: null, startable: true, needsCapture: false, captureMedia: null,
      }] : [],
      loading: false,
      dailyWalkSyncing: false,
      dailyWalkDistanceMeters: 3200,
      dailyWalkSteps: 0,
      dailyState: {},
    },
    identity: { displayName: 'Rally Player', avatarUrl: null, notificationUnread: false, notificationLabel: 'Notifications', profileLabel: 'Profile' },
    otaUpdate: null,
  }
}

function propsFor(overrides: Partial<HomeViewProps> = {}): HomeViewProps {
  return {
    refreshing: false,
    onRefresh: () => undefined,
    wallet: { walletPoints: 1200, walletStatus: 'ready', pointsDelta: 12 },
    onOpenWallet: () => undefined,
    heroSlides: [{ id: 'fixture', kicker: 'RUNNING', title: 'Fixture', body: '', icon: 'run', imageSource: 1, tone: 'green', visualOnly: true }],
    onPressHeroSlide: () => undefined,
    onPressShortcut: () => undefined,
    quests: { views: [], loading: false, dailyWalkSyncing: false, dailyWalkDistanceMeters: 0, dailyWalkSteps: 0, dailyState: undefined },
    onSelectQuest: () => undefined,
    onOpenQuests: () => undefined,
    identity: { displayName: 'Rally Player', avatarUrl: null, notificationUnread: false, notificationLabel: 'Notifications', profileLabel: 'Profile' },
    onPressNotifications: () => undefined,
    onPressProfile: () => undefined,
    otaUpdate: null,
    onApplyOtaUpdate: () => undefined,
    ...overrides,
  }
}

describe('Home Storybook presentation', () => {
  beforeEach(() => {
    for (const values of Object.values(harness)) values.length = 0
  })

  it('composes ready, loading, unavailable, and empty display states through the production HomeView', () => {
    const states = [
      propsFor(),
      propsFor({ wallet: { walletPoints: 0, walletStatus: 'loading', pointsDelta: null } }),
      propsFor({ wallet: { walletPoints: 0, walletStatus: 'unavailable', pointsDelta: null } }),
      propsFor({ quests: { views: [], loading: false, dailyWalkSyncing: false, dailyWalkDistanceMeters: 0, dailyWalkSteps: 0, dailyState: undefined } }),
    ]

    for (const props of states) {
      const html = renderToStaticMarkup(React.createElement(HomeView, props))
      expect(html).toContain(`wallet:${props.wallet.walletStatus}`)
      expect(html).toContain(`quests:${props.quests.views.length}`)
      expect(html).toContain('identity:Rally Player')
    }
  })

  it('keeps the rounded Home content surface attached to the scrolling shortcut feed', () => {
    const html = renderToStaticMarkup(React.createElement(HomeView, propsFor()))

    expect(html).toMatch(/<main[^>]*>.*data-testid="home-scroll-surface"/)
  })

  it('starts refresh after a short pull and prevents the native control from duplicating it', () => {
    const onRefresh = vi.fn()
    renderToStaticMarkup(React.createElement(HomeView, propsFor({ onRefresh })))

    harness.scrolls.at(-1)?.onScroll?.({ nativeEvent: { contentOffset: { y: -28 } } })
    expect(onRefresh).toHaveBeenCalledOnce()

    harness.refresh.at(-1)?.onRefresh?.()

    expect(onRefresh).toHaveBeenCalledOnce()
  })

  it('publishes a local mission state matrix for loading, sync, proof, and completion', async () => {
    const expectedStories = [
      ['MissionsLoading', 'missions_loading'],
      ['MissionsSyncing', 'missions_syncing'],
      ['MissionsSyncFailed', 'missions_sync_failed'],
      ['MissionsProofNeeded', 'missions_proof_needed'],
      ['MissionsComplete', 'missions_complete'],
    ] as const

    for (const [storyName, state] of expectedStories) {
      const story = (HomeStories as Record<string, unknown>)[storyName] as { args?: unknown } | undefined
      expect(story?.args).toEqual({ state })
    }

    const actual = await vi.importActual('./homeStoryFixtures') as {
      HOME_STORY_STATES: string[]
      HOME_STORY_FIXTURES: Record<string, {
        quests: { loading: boolean; dailyWalkSyncing: boolean; dailyWalkSyncFailed?: boolean; dailyWalkDistanceMeters: number; dailyState: Record<string, { status: string; doneToday: boolean }> }
      }>
    }
    expect(actual.HOME_STORY_STATES).toEqual([
      'ready', 'no_venue', 'no_point_delta', 'wallet_loading', 'wallet_unavailable', 'empty_missions',
      'missions_loading', 'missions_syncing', 'missions_sync_failed', 'missions_proof_needed', 'missions_complete',
    ])
    expect(actual.HOME_STORY_FIXTURES.missions_loading.quests.loading).toBe(true)
    expect(actual.HOME_STORY_FIXTURES.missions_syncing.quests.dailyWalkSyncing).toBe(true)
    expect(actual.HOME_STORY_FIXTURES.missions_sync_failed.quests.dailyWalkSyncFailed).toBe(true)
    expect(actual.HOME_STORY_FIXTURES.missions_proof_needed.quests.dailyState['storybook-basketball-shot']).toMatchObject({ status: 'needs_review', doneToday: false })
    expect(actual.HOME_STORY_FIXTURES.missions_complete.quests.dailyWalkDistanceMeters).toBe(7000)
    expect(Object.hasOwn(actual.HOME_STORY_FIXTURES.ready, 'nextBout')).toBe(false)
  })

  it('forwards the retained Home intents and omits Quick Match from the Home composition', () => {
    const actions = {
      refresh: vi.fn(), wallet: vi.fn(), hero: vi.fn(), shortcut: vi.fn(), quest: vi.fn(), quests: vi.fn(), notifications: vi.fn(), profile: vi.fn(), ota: vi.fn(),
    }
    const props = propsFor({
      onRefresh: actions.refresh,
      onOpenWallet: actions.wallet,
      onPressHeroSlide: actions.hero,
      onPressShortcut: actions.shortcut,
      onSelectQuest: actions.quest,
      onOpenQuests: actions.quests,
      onPressNotifications: actions.notifications,
      onPressProfile: actions.profile,
      otaUpdate: { applying: false, runSessionLive: false },
      onApplyOtaUpdate: actions.ota,
    })
    renderToStaticMarkup(React.createElement(HomeView, props))

    harness.refresh.at(-1)?.onRefresh?.()
    ;(harness.wallet.at(-1)?.onOpenWallet as (() => void) | undefined)?.()
    ;(harness.hero.at(-1)?.onPressSlide as ((slide: unknown) => void) | undefined)?.(props.heroSlides[0])
    ;(harness.shortcuts.at(-1)?.onPress as ((key: string) => void) | undefined)?.('lobby')
    ;(harness.quests.at(-1)?.onSelectQuest as ((quest: unknown) => void) | undefined)?.({ id: 'quest-1' })
    ;(harness.quests.at(-1)?.onOpenQuests as (() => void) | undefined)?.()
    ;(harness.identity.at(-1)?.onPressNotifications as (() => void) | undefined)?.()
    ;(harness.identity.at(-1)?.onPressProfile as (() => void) | undefined)?.()
    ;(harness.ota.at(-1)?.onApply as (() => void) | undefined)?.()

    expect(actions.refresh).toHaveBeenCalledOnce()
    expect(actions.wallet).toHaveBeenCalledOnce()
    expect(actions.hero).toHaveBeenCalledWith(props.heroSlides[0])
    expect(actions.shortcut).toHaveBeenCalledWith('lobby')
    expect(renderToStaticMarkup(React.createElement(HomeView, props))).not.toContain('quick:')
    expect(actions.quest).toHaveBeenCalledWith({ id: 'quest-1' })
    expect(actions.quests).toHaveBeenCalledOnce()
    expect(actions.notifications).toHaveBeenCalledOnce()
    expect(actions.profile).toHaveBeenCalledOnce()
    expect(actions.ota).toHaveBeenCalledOnce()
  })

  it('publishes named frozen local-fixture stories and rejects incomplete args without poisoning the next render', () => {
    expect(Ready.args).toEqual({ state: 'ready' })
    expect(NoVenue.args).toEqual({ state: 'no_venue' })
    expect(NoPointDelta.args).toEqual({ state: 'no_point_delta' })
    expect(WalletLoading.args).toEqual({ state: 'wallet_loading' })
    expect(WalletUnavailable.args).toEqual({ state: 'wallet_unavailable' })
    expect(EmptyMissions.args).toEqual({ state: 'empty_missions' })
    expect(Object.keys(meta.argTypes ?? {})).toEqual(['state'])
    expect(meta.parameters?.noSafeArea).toBe(true)
    expect(() => parseHomeStoryArgs({ state: 'ready', onOpenWallet: () => undefined })).toThrow()

    const invalid = renderHomeStory({ state: 'ready', callback: () => undefined })
    expect(renderToStaticMarkup(invalid)).toContain('Invalid Home story args')
    const valid = renderHomeStory({ state: 'ready' })
    expect(renderToStaticMarkup(valid)).toContain('wallet:ready')
  })

  it('imports the actual local fixture module with an asset-only adapter and preserves each display contract', async () => {
    const actual = await vi.importActual('./homeStoryFixtures') as {
        HOME_STORY_STATES: string[]
        HOME_STORY_FIXTURES: Record<string, {
          quests: { views: unknown[] }
          wallet: { walletStatus: string; pointsDelta?: number | null }
          identity: { avatarUrl: string | null; rallyId?: string | null; venueName?: string | null }
          heroSlides: Array<{ imageSource: unknown }>
        }>
    }
    const fixtures = actual.HOME_STORY_FIXTURES
    expect(actual.HOME_STORY_STATES).toEqual([
      'ready', 'no_venue', 'no_point_delta', 'wallet_loading', 'wallet_unavailable', 'empty_missions',
      'missions_loading', 'missions_syncing', 'missions_sync_failed', 'missions_proof_needed', 'missions_complete',
    ])
    expect(fixtures.ready.quests.views).toHaveLength(3)
    expect(fixtures.empty_missions.quests.views).toHaveLength(0)
    expect(fixtures.wallet_loading.wallet.walletStatus).toBe('loading')
    expect(fixtures.wallet_unavailable.wallet.walletStatus).toBe('unavailable')
    expect(fixtures.ready.identity.avatarUrl).toBeNull()
    expect(fixtures.ready.identity.rallyId).toBe('1234567890')
    expect(fixtures.ready.identity.venueName).toBe('Benjasiri Park')
    expect(fixtures.no_venue.identity.venueName).toBeNull()
    expect(fixtures.no_point_delta.wallet.pointsDelta).toBeNull()
    expect(fixtures.ready.heroSlides.every((slide) => typeof slide.imageSource === 'number')).toBe(true)
    expect(isFrozenDeep(fixtures)).toBe(true)
  })
})

function isFrozenDeep(value: unknown): boolean {
  if (!value || typeof value !== 'object') return true
  if (!Object.isFrozen(value)) return false
  return Object.values(value).every(isFrozenDeep)
}
