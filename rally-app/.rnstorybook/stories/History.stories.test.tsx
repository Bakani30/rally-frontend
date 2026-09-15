import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { isExportStory } from 'storybook/internal/csf'

const harness = vi.hoisted(() => ({ presses: [] as Array<{ label?: string; onPress?: () => void }>, listContentStyles: [] as unknown[], push: vi.fn() }))

vi.mock('expo-router', () => ({ Link: () => null, router: { push: harness.push } }))
vi.mock('react-native', () => ({
  ActivityIndicator: () => React.createElement('i', null, 'loading'),
  SectionList: ({ ListHeaderComponent, contentContainerStyle, sections, renderItem, renderSectionHeader, renderSectionFooter }: any) => {
    harness.listContentStyles.push(contentContainerStyle)
    return React.createElement('main', null, ListHeaderComponent, sections.map((section: any) => React.createElement(React.Fragment, { key: section.key }, renderSectionHeader({ section }), section.data.map((item: any, index: number) => React.createElement(React.Fragment, { key: `${section.key}:${index}` }, renderItem({ item }))), renderSectionFooter({ section }))))
  },
  StyleSheet: { create: <T,>(value: T) => value },
  Text: ({ children }: { children?: React.ReactNode }) => React.createElement('span', null, children),
  View: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
}))
vi.mock('@react-navigation/native', () => ({ useFocusEffect: () => undefined }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: () => undefined }) }))
vi.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: () => null }))
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0 }) }))
vi.mock('@/components/history/HistoryCategoryTabs', () => ({ HistoryCategoryTabs: () => null }))
vi.mock('@/components/history/UnifiedFeedRow', () => ({ UnifiedFeedRow: () => null }))
vi.mock('@/components/match/MatchListItem', () => ({ MatchListItem: () => null }))
vi.mock('@/components/run/RunSyncStatusCard', () => ({ RunSyncStatusCard: () => null }))
vi.mock('@/components/motion/PressableScale', () => ({ PressableScale: ({ children, onPress, accessibilityLabel }: { children?: React.ReactNode; onPress?: () => void; accessibilityLabel?: string }) => { harness.presses.push({ label: accessibilityLabel, onPress }); return React.createElement('button', { onClick: onPress }, children) } }))
vi.mock('@/components/navigation/ScreenBackButton', () => ({ ScreenBackButton: () => null }))
vi.mock('@/components/navigation/SwipeBackView', () => ({ SwipeBackView: () => null }))
vi.mock('@/components/layout/useScreenInsets', () => ({ useScreenInsets: () => ({ paddingTop: 23, paddingBottom: 48 }) }))
vi.mock('@/constants/theme', () => ({ Radius: {}, Spacing: { sm: 1, md: 1, lg: 1, xl: 1 } }))
vi.mock('@/hooks/useAnalytics', () => ({ useAnalytics: () => ({ track: () => undefined }) }))
vi.mock('@/hooks/useAppTheme', () => ({ useSportTheme: () => ({ bg: '#111', chalk: '#fff', red: '#d44', muted: '#888', mutedSoft: '#777', surface: '#222', line: '#333', ink: '#fff', orange: '#f80', amber: '#fc0', orangeSoft: '#431', green: '#0a6', shadowSoft: 'none' }) }))
vi.mock('@/hooks/useActivityHistory', () => ({ useActivityHistory: () => ({}) }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({}) }))
vi.mock('@/hooks/useI18n', () => ({ useI18n: () => ({ t: (value: string) => value }) }))
vi.mock('@/hooks/useMatchPinToggle', () => ({ useMatchPinToggle: () => ({ pinnedIds: new Set(), atPinCap: false, pinMutationPending: false, onTogglePin: () => undefined }) }))
vi.mock('@/hooks/useMatchHistoryImpacts', () => ({ useMatchHistoryImpacts: () => ({}) }))
vi.mock('@/hooks/useMyMatches', () => ({ useMyMatches: () => ({}) }))
vi.mock('@/hooks/useNotificationSummary', () => ({ useNotificationSummary: () => ({ incomingFriendRequestCount: 0 }) }))

import { MatchesView } from '@/components/history/MatchesView'
import { BasketballHistoryMatchCard } from '@/components/history/BasketballHistoryMatchCard'
import {
  ActivityHistoryError,
  BasketballReady,
  Empty,
  ImpactError,
  Loading,
  MatchLoadError,
  parseHistoryStoryArgs,
  renderHistoryStory,
} from './History.stories'
import meta from './History.stories'
import { BASKETBALL_HISTORY_STORY_RECORD } from './historyStoryFixtures'

;(globalThis as { React?: typeof React }).React = React

describe('History Storybook presentation', () => {
  it('exports the pure MatchesView presentation boundary needed by the history stories', () => {
    expect(MatchesView).toBeTypeOf('function')
  })

  it('publishes the six approved display states and excludes Storybook helpers from discovery', () => {
    expect([Loading, MatchLoadError, Empty, BasketballReady, ActivityHistoryError, ImpactError].map((story) => story.args?.state)).toEqual([
      'loading', 'match_load_error', 'empty', 'basketball_ready', 'activity_history_error', 'impact_error',
    ])
    expect(isExportStory('parseHistoryStoryArgs', meta)).toBe(false)
    expect(isExportStory('renderHistoryStory', meta)).toBe(false)
  })

  it('keeps fixtures local, exposes the real basketball row callback, and rejects invalid controls', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    expect(() => parseHistoryStoryArgs({ state: 'basketball_ready', extra: true })).toThrow()
    const element = renderHistoryStory({ state: 'basketball_ready' }) as unknown as {
      props: {
        syncStatusContent: unknown
        onRetryImpacts: () => void
        renderRow: (row: { rowKind: 'feed'; feedItem: { key: string } }) => { props: { onOpen: () => void } }
      }
    }
    expect(element.props.syncStatusContent).toBeNull()
    const row = element.props.renderRow({ rowKind: 'feed', feedItem: { key: 'match:storybook-basketball-settled' } })
    expect(row.props.onOpen).toBeTypeOf('function')
    row.props.onOpen()
    element.props.onRetryImpacts()
    expect(info).toHaveBeenCalledWith('[Storybook] History open match', 'basketball_ready')
    expect(info).toHaveBeenCalledWith('[Storybook] History retry impacts', 'basketball_ready')
    info.mockRestore()
  })

  it('renders loading, match error, empty, basketball ready, history error, and impact error through MatchesView', () => {
    const states = ['loading', 'match_load_error', 'empty', 'basketball_ready', 'activity_history_error', 'impact_error'] as const
    const markup = states.map((state) => renderToStaticMarkup(renderHistoryStory({ state })))
    expect(markup[0]).toContain('loading')
    expect(markup[1]).toContain('โหลดแมตช์ไม่สำเร็จ')
    expect(markup[2]).toContain('ยังไม่มีประวัติ')
    expect(markup[3]).toContain('Basketball')
    expect(markup[4]).toContain('โหลดประวัติกิจกรรมไม่สำเร็จ')
    expect(markup[5]).toContain('ยังโหลดแต้ม เดิมพัน และแรงค์ของประวัตินี้ไม่ได้')
  })

  it('keeps the empty fixture subtitle aligned with its zero visible history rows', () => {
    const markup = renderToStaticMarkup(renderHistoryStory({ state: 'empty' }))
    expect(markup).toContain('ประวัติ 0')
    expect(markup).not.toContain('ประวัติ 1')
  })

  it('provides translated friend labels and lets the shared view place the back control by state', () => {
    const element = renderHistoryStory({ state: 'basketball_ready' }) as unknown as {
      props: { labels: Record<string, string>; renderBackControl?: unknown }
    }
    expect(element.props.labels.findFriends).toBe('ค้นหาเพื่อน')
    expect(element.props.labels.friendsDashboard).toBe('แดชบอร์ดเพื่อน')
    expect(element.props.labels.friendsDashboardPending).toBe('แดชบอร์ดเพื่อน · มีคำขอใหม่')
    expect(element.props.renderBackControl).toBeTypeOf('function')
  })

  it('forwards the fixture friend labels to the shared button accessibility contract', () => {
    harness.presses.length = 0
    const story = renderHistoryStory({ state: 'basketball_ready' }) as React.ReactElement<any>
    renderToStaticMarkup(story)
    expect(harness.presses.some((press) => press.label === 'แดชบอร์ดเพื่อน')).toBe(true)

    renderToStaticMarkup(React.createElement(MatchesView, { ...story.props, hasIncomingFriendRequests: true }))
    expect(harness.presses.some((press) => press.label === 'แดชบอร์ดเพื่อน · มีคำขอใหม่')).toBe(true)
  })

  it('uses the shared safe-area list padding for Storybook as it does in production', () => {
    harness.listContentStyles.length = 0
    renderToStaticMarkup(renderHistoryStory({ state: 'basketball_ready' }))
    expect(harness.listContentStyles.at(-1)).toContainEqual({ paddingTop: 23, paddingBottom: 48 })
  })

  it('keeps the production basketball wrapper opening its match route while the pure view owns the press callback', () => {
    harness.presses.length = 0
    renderToStaticMarkup(React.createElement(BasketballHistoryMatchCard, {
      match: BASKETBALL_HISTORY_STORY_RECORD.match,
      impact: BASKETBALL_HISTORY_STORY_RECORD.impact,
      currentUserId: 'storybook-player',
      pin: { pinned: false, atCap: false, pending: false, onToggle: () => undefined },
    }))
    harness.presses.find((press) => press.label === 'เปิดรายละเอียดแมตช์บาส')?.onPress?.()
    expect(harness.push).toHaveBeenCalledWith('/match/storybook-basketball-settled')
  })
})
