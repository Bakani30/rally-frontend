import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { isExportStory } from 'storybook/internal/csf'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({
  presses: [] as Array<{ label?: string; onPress?: () => void }>,
  scope: [] as Array<{ onChange: (scope: string) => void }>,
  retry: [] as Array<{ onRetry: () => void }>,
  ladder: [] as Array<{ onClose: () => void }>,
  rows: [] as Array<{ entry: { userId: string }; onPress: () => void }>,
}))

vi.mock('react-native', () => ({
  FlatList: ({ data, renderItem }: { data: unknown[]; renderItem: (input: { item: unknown; index: number }) => React.ReactNode }) => React.createElement('div', null, data.map((item, index) => React.createElement(React.Fragment, { key: index }, renderItem({ item, index })))),
  InteractionManager: { runAfterInteractions: (callback: () => void) => { callback(); return { cancel: () => undefined } } },
  Platform: { OS: 'ios', select: <T,>(values: { ios?: T; android?: T; native?: T; default?: T }) => values.ios ?? values.native ?? values.default ?? values.android },
  Pressable: ({ children, onPress, accessibilityLabel }: { children?: React.ReactNode; onPress?: () => void; accessibilityLabel?: string }) => {
    harness.presses.push({ label: accessibilityLabel, onPress })
    return React.createElement('button', { onClick: onPress, 'aria-label': accessibilityLabel }, children)
  },
  ScrollView: ({ children }: { children?: React.ReactNode }) => React.createElement('main', null, children),
  StyleSheet: { absoluteFill: {}, create: <T,>(styles: T) => styles },
  Text: ({ children }: { children?: React.ReactNode }) => React.createElement('span', null, children),
  View: ({ children, pointerEvents }: { children?: React.ReactNode; pointerEvents?: string }) => React.createElement('div', { 'data-pointer-events': pointerEvents }, children),
  useWindowDimensions: () => ({ width: 390 }),
}))
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0 }) }))
vi.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: () => React.createElement('i') }))
vi.mock('@/hooks/useAppTheme', () => ({
  useSportTheme: () => ({ bg: '#111', ink: '#fff', amber: '#fc0', mutedSoft: '#777', surface: '#222', lineStrong: '#333', red: '#d44' }),
  useThemeMode: () => 'dark',
}))
vi.mock('@/components/motion/PressableScale', () => ({
  PressableScale: ({ children, onPress, accessibilityLabel }: { children?: React.ReactNode; onPress?: () => void; accessibilityLabel?: string }) => {
    harness.presses.push({ label: accessibilityLabel, onPress })
    return React.createElement('button', { onClick: onPress, 'aria-label': accessibilityLabel }, children)
  },
}))
vi.mock('@/components/ui/RallyText', () => ({ RallyText: ({ children }: { children?: React.ReactNode }) => React.createElement('span', null, children) }))
vi.mock('@/components/rank/LeaderboardButton', () => ({ LeaderboardButton: ({ onPress }: { onPress: () => void }) => { harness.presses.push({ label: 'leaderboard', onPress }); return React.createElement('button', { onClick: onPress }, 'leaderboard') } }))
vi.mock('@/components/rank/RankLadderSheet', () => ({ RankLadderSheet: (props: { onClose: () => void }) => { harness.ladder.push(props); return React.createElement('div', null, 'ladder') } }))
vi.mock('@/components/rank/SportRankHero', () => ({ SportRankHero: () => React.createElement('div', null, 'rank-hero') }))
vi.mock('@/components/rank/LockedRankHero', () => ({ LockedRankHero: ({ onFindMatch }: { onFindMatch: () => void }) => React.createElement('button', { onClick: onFindMatch }, 'locked-rank') }))
vi.mock('@/components/rank/RankProgressCard', () => ({ RankProgressCard: () => React.createElement('div', null, 'progress') }))
vi.mock('@/components/rank/SportStatsStrip', () => ({ SportStatsStrip: () => React.createElement('div', null, 'stats') }))
vi.mock('@/components/rank/RecentRpList', () => ({ RecentRpList: () => React.createElement('div', null, 'recent-rp') }))
vi.mock('@/components/rank/RankHistoryTimeline', () => ({ RankHistoryTimeline: () => React.createElement('div', null, 'history') }))
vi.mock('@/components/leaderboard/SportAmbient', () => ({ SportAmbient: () => React.createElement('div', null, 'ambient') }))
vi.mock('@/components/leaderboard/RankingHeader', () => ({ RankingHeader: ({ seasonLabel }: { seasonLabel: string }) => React.createElement('h1', null, seasonLabel) }))
vi.mock('@/components/leaderboard/LeaderboardScopeToggle', () => ({ LeaderboardScopeToggle: ({ onChange }: { onChange: (scope: string) => void }) => { harness.scope.push({ onChange }); return React.createElement('div', null, 'scope') } }))
vi.mock('@/components/leaderboard/RankingPodium', () => ({ RankingPodium: ({ entries }: { entries: unknown[] }) => React.createElement('div', null, `podium:${entries.length}`) }))
vi.mock('@/components/leaderboard/RankingRowView', () => ({ RankingRowView: ({ entry, isYou, onPress }: { entry: { displayName: string; userId: string }; isYou: boolean; onPress: () => void }) => { harness.rows.push({ entry, onPress }); return React.createElement('div', null, `${entry.displayName}:${isYou}`) } }))
vi.mock('@/components/leaderboard/LeaderboardEmpty', () => ({ LeaderboardEmpty: () => React.createElement('div', null, 'empty') }))
vi.mock('@/components/leaderboard/LeaderboardError', () => ({ LeaderboardError: (props: { onRetry: () => void }) => { harness.retry.push(props); return React.createElement('div', null, 'error') } }))
vi.mock('@/components/navigation/ScreenBackButtonView', () => ({ ScreenBackButtonView: ({ onPress }: { onPress: () => void }) => { harness.presses.push({ label: 'back', onPress }); return React.createElement('button', { onClick: onPress }, 'back') } }))
vi.mock('@/lib/leaderboard/rankingTheme', () => ({ buildRankingTheme: () => ({ mode: 'dark', bg: '#111', ink: '#fff', rowBg: '#222', rowBorder: '#333', accent: '#f80' }) }))

import { MyRankView, type MyRankPage } from '@/components/rank/MyRankView'
import { SportRankPageView, type SportRankPageViewProps } from '@/components/rank/SportRankPageView'
import { LeaderboardView, type LeaderboardViewProps } from '@/components/leaderboard/LeaderboardView'
import { nextTierView, placementLock } from '@/lib/ranks/rankProgress'

import {
  LeaderboardEmpty,
  LeaderboardError,
  LeaderboardLoading,
  LeaderboardReady,
  MyRankLocked,
  MyRankRanked,
  RANKING_STORY_STATES,
  parseRankingStoryArgs,
  renderRankingStory,
} from './Ranking.stories'
import meta from './Ranking.stories'
import {
  MY_RANK_LOCKED_PAGE,
  MY_RANK_LOCKED_VIEW,
  MY_RANK_RANKED_PAGE,
  MY_RANK_RANKED_VIEW,
} from './rankingStoryFixtures'

;(globalThis as { React?: typeof React }).React = React

const page: MyRankPage = {
  key: 'basketball', label: 'บาสเกตบอล', boardLabel: 'BASKETBALL BOARD', glyph: '🏀', sportColor: '#f80', sportOnColor: '#111',
  rating: { activity: 'basketball', rating: 1240, tier: 'silver', matches: 14, wins: 9, losses: 5 },
  currentTier: 'silver', nextTier: 'gold',
}

function sportRankProps(overrides: Partial<SportRankPageViewProps> = {}): SportRankPageViewProps {
  return {
    activity: 'basketball', sportLabel: page.label, sportColor: page.sportColor, sportOnColor: page.sportOnColor,
    boardLabel: page.boardLabel, initials: 'R', avatarUrl: null, pageIndex: 0, pageCount: 3,
    placement: { locked: false, played: 10, floor: 10, remaining: 0 }, tier: 'silver', tierLabel: 'SILVER', ratingValue: 1240,
    rankPosition: 8, progress: { nextTier: 'gold', rpCur: 1240, rpGoal: 1500, rpLeft: 260, pct: 0.4, matchesHave: 14, matchesGoal: 20, matchesNeed: 6 }, nextTierLabel: 'GOLD',
    matches: 14, wins: 9, losses: 5, streakLabel: 'W3', recentRows: [], recentLoading: false, recentError: false,
    tierEvents: [], tierEventsLoading: false, tierEventsError: false, onFindMatch: () => undefined,
    ...overrides,
  }
}

function leaderboardProps(overrides: Partial<LeaderboardViewProps> = {}): LeaderboardViewProps {
  const entries = [
    { userId: 'u-1', displayName: 'First', handle: 'first', rating: 1600, tier: 'gold' as const, matches: 20, rank: 1, letter: 'F', avatarColor: '#f80', avatarUrl: null },
    { userId: 'u-me', displayName: 'Rally Player', handle: 'rally', rating: 1300, tier: 'silver' as const, matches: 14, rank: 8, letter: 'R', avatarColor: '#08f', avatarUrl: null },
  ]
  return {
    activity: 'basketball', scope: 'global', podium: entries.slice(0, 1), list: entries.slice(0, 1), ownEntry: entries[1], showOwnEntry: true,
    queryState: { isPending: false, isError: false, isEmpty: false }, entryCount: entries.length, currentUserId: 'u-me', onScopeChange: () => undefined,
    onRetry: () => undefined, onBack: () => undefined, onOpenUser: () => undefined, initiallyAnimateEntrance: false, ...overrides,
  }
}

describe('Ranking Storybook presentation', () => {
  beforeEach(() => {
    harness.presses.length = 0
    harness.scope.length = 0
    harness.retry.length = 0
    harness.ladder.length = 0
    harness.rows.length = 0
  })

  it('composes the production sport-rank View for locked and ranked displays', () => {
    expect(renderToStaticMarkup(React.createElement(SportRankPageView, sportRankProps()))).toContain('rank-hero')
    expect(renderToStaticMarkup(React.createElement(SportRankPageView, sportRankProps({ placement: { locked: true, played: 4, floor: 10, remaining: 6 } })))).toContain('locked-rank')
  })

  it('derives local rank fixture gates from the production progress helpers', () => {
    for (const [pageFixture, viewFixture] of [
      [MY_RANK_RANKED_PAGE, MY_RANK_RANKED_VIEW],
      [MY_RANK_LOCKED_PAGE, MY_RANK_LOCKED_VIEW],
    ] as const) {
      const rating = pageFixture.rating
      if (!rating) throw new Error('Ranking fixture requires a rating')
      const decisive = rating.wins + rating.losses
      expect(viewFixture.placement).toEqual(placementLock(decisive))
      expect(viewFixture.progress).toEqual(nextTierView(rating.rating, decisive))
    }
  })

  it('forwards My Rank intent callbacks while the caller supplies the typed sport page renderer', () => {
    const actions = { viewed: vi.fn(), board: vi.fn(), match: vi.fn() }
    renderToStaticMarkup(React.createElement(MyRankView, {
      pages: [page], onActivityViewed: actions.viewed, onOpenLeaderboard: actions.board, onFindMatch: actions.match,
      ladderAccessibilityLabel: 'View all ranks',
      renderSportPage: (item) => {
        harness.presses.push({ label: 'find match', onPress: item.onFindMatch })
        return React.createElement('div', null, `page:${item.key}`)
      },
    }))
    const board = harness.presses.find((press) => press.label === 'leaderboard')
    board?.onPress?.()
    harness.presses.find((press) => press.label === 'find match')?.onPress?.()
    expect(actions.board).toHaveBeenCalledWith('basketball')
    expect(actions.match).toHaveBeenCalledWith('basketball')
  })

  it('composes loading, error, empty, and ready leaderboard states through the production View', () => {
    expect(renderToStaticMarkup(React.createElement(LeaderboardView, leaderboardProps({ queryState: { isPending: true, isError: false, isEmpty: false } })))).toContain('data-pointer-events="none"')
    expect(renderToStaticMarkup(React.createElement(LeaderboardView, leaderboardProps({ queryState: { isPending: false, isError: true, isEmpty: false } })))).toContain('error')
    expect(renderToStaticMarkup(React.createElement(LeaderboardView, leaderboardProps({ queryState: { isPending: false, isError: false, isEmpty: true } })))).toContain('empty')
    expect(renderToStaticMarkup(React.createElement(LeaderboardView, leaderboardProps()))).toContain('Rally Player:true')
  })

  it('forwards leaderboard scope, retry, and back callbacks', () => {
    const actions = { scope: vi.fn(), retry: vi.fn(), back: vi.fn(), user: vi.fn() }
    renderToStaticMarkup(React.createElement(LeaderboardView, leaderboardProps({
      queryState: { isPending: false, isError: true, isEmpty: false }, onScopeChange: actions.scope, onRetry: actions.retry, onBack: actions.back, onOpenUser: actions.user,
    })))
    harness.scope.at(-1)?.onChange('friends')
    harness.retry.at(-1)?.onRetry()
    const back = harness.presses.find((press) => press.label === 'back')
    back?.onPress?.()
    expect(actions.scope).toHaveBeenCalledWith('friends')
    expect(actions.retry).toHaveBeenCalledOnce()
    expect(actions.back).toHaveBeenCalledOnce()
    renderToStaticMarkup(React.createElement(LeaderboardView, leaderboardProps({ onOpenUser: actions.user })))
    harness.rows.find((row) => row.entry.userId === 'u-me')?.onPress()
    expect(actions.user).toHaveBeenCalledWith('u-me')
  })

  it('publishes frozen local-fixture stories with a strict state selector and recovers after invalid args', () => {
    expect(MyRankLocked.args).toEqual({ state: 'my_rank_locked' })
    expect(MyRankRanked.args).toEqual({ state: 'my_rank_ranked' })
    expect(LeaderboardLoading.args).toEqual({ state: 'leaderboard_loading' })
    expect(LeaderboardError.args).toEqual({ state: 'leaderboard_error' })
    expect(LeaderboardEmpty.args).toEqual({ state: 'leaderboard_empty' })
    expect(LeaderboardReady.args).toEqual({ state: 'leaderboard_ready' })
    expect(Object.keys(meta.argTypes ?? {})).toEqual(['state'])
    expect(() => parseRankingStoryArgs({ state: 'leaderboard_ready', callback: () => undefined })).toThrow()
    expect(renderToStaticMarkup(renderRankingStory({ state: 'invalid' }))).toContain('Invalid Ranking story args')
    expect(renderToStaticMarkup(renderRankingStory({ state: 'leaderboard_ready' }))).toContain('Rally Player')
  })

  it('registers only the six named Ranking stories and excludes runtime helpers', async () => {
    const storyModule = await import('./Ranking.stories')
    const storyExports = Object.keys(storyModule)
      .filter((key) => key !== 'default' && isExportStory(key, meta))

    expect(storyExports).toEqual([
      'MyRankLocked',
      'MyRankRanked',
      'LeaderboardLoading',
      'LeaderboardError',
      'LeaderboardEmpty',
      'LeaderboardReady',
    ])
    expect(storyExports).not.toContain('RANKING_STORY_STATES')
    expect(RANKING_STORY_STATES).toHaveLength(6)
    expect(isExportStory('parseRankingStoryArgs', meta)).toBe(false)
    expect(isExportStory('renderRankingStory', meta)).toBe(false)
  })
})
