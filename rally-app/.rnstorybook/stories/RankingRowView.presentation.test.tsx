import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({ presses: [] as Array<{ onPress: () => void }> }))

vi.mock('react-native', () => ({
  Platform: { OS: 'ios', select: <T,>(values: { ios?: T; android?: T; native?: T; default?: T }) => values.ios ?? values.native ?? values.default ?? values.android },
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: ({ children }: { children?: React.ReactNode }) => React.createElement('span', null, children),
  View: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
}))
vi.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: () => React.createElement('i') }))
vi.mock('react-native-reanimated', () => ({
  default: { View: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children) },
  Easing: { bezier: () => 'bezier' },
  useAnimatedStyle: () => ({}),
  useSharedValue: (value: number) => ({ value }),
  withDelay: (_delay: number, value: unknown) => value,
  withTiming: (value: unknown) => value,
}))
vi.mock('@/components/motion/PressableScale', () => ({
  PressableScale: ({ children, onPress }: { children?: React.ReactNode; onPress: () => void }) => {
    harness.presses.push({ onPress })
    return React.createElement('button', { onClick: onPress }, children)
  },
}))
vi.mock('@/components/leaderboard/CountUp', () => ({ CountUp: ({ value }: { value: number }) => React.createElement('span', null, value) }))
vi.mock('@/components/leaderboard/RankFrame', () => ({ RankFrame: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children) }))
vi.mock('@/components/leaderboard/RankingAvatar', () => ({ RankingAvatar: () => React.createElement('i') }))
vi.mock('@/components/ranks/TierBadge', () => ({ TierBadge: () => React.createElement('i') }))

import { RankingRowView } from '@/components/leaderboard/RankingRowView'
import type { RankingTheme } from '@/lib/leaderboard/rankingTheme'

;(globalThis as { React?: typeof React }).React = React

const theme = {
  mode: 'dark', accent: '#f80', ink: '#fff', muted: '#999', rowBg: '#222', rowYouBg: '#333', rowBorder: '#444', rowYouBorder: '#f80',
  rankChipPodiumBg: () => '#555', rankChipBg: '#666', rankChipPodiumText: '#fff', rankChipText: '#fff',
  ratingBoxBg: '#111', ratingBoxBorder: 'transparent', ratingText: '#fff', deltaUp: '#0f0', deltaDown: '#f00', youBadgeBg: '#f80', youBadgeText: '#111',
} as unknown as RankingTheme

describe('RankingRowView presentation', () => {
  beforeEach(() => { harness.presses.length = 0 })

  it('renders the actual pure row and emits its supplied user intent once', () => {
    const onPress = vi.fn()
    const html = renderToStaticMarkup(React.createElement(RankingRowView, {
      entry: { userId: 'row-player', displayName: 'Rally Player', handle: 'rally', rating: 1240, tier: 'silver', matches: 14, rank: 8, letter: 'R', avatarColor: '#f80', avatarUrl: null, delta: 3 },
      isYou: true, index: 0, trigger: 0, theme, onPress,
    }))
    expect(html).toContain('Rally Player')
    expect(harness.presses).toHaveLength(1)
    harness.presses[0]?.onPress()
    expect(onPress).toHaveBeenCalledOnce()
  })
})
