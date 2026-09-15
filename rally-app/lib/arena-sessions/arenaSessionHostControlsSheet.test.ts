import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  scrollViews: [] as Array<Record<string, unknown>>,
  sheetStyle: undefined as unknown,
}))

vi.mock('react-native', async () => {
  const React = await import('react')
  return {
    Modal: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
    PanResponder: { create: () => ({ panHandlers: {} }) },
    Platform: { select: <T,>(values: { ios?: T; android?: T; default?: T }) => values.ios ?? values.default ?? values.android },
    Pressable: ({ children, accessibilityLabel: _accessibilityLabel, ...props }: { children?: React.ReactNode; accessibilityLabel?: string }) => React.createElement('button', props, children),
    ScrollView: ({ children, accessibilityLabel, contentContainerStyle, showsVerticalScrollIndicator, ...props }: {
      children?: React.ReactNode
      accessibilityLabel?: string
      contentContainerStyle?: unknown
      showsVerticalScrollIndicator?: boolean
    }) => {
      mocks.scrollViews.push({ accessibilityLabel, contentContainerStyle, showsVerticalScrollIndicator, ...props })
      return React.createElement('div', props, children)
    },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFillObject: {} },
    Text: ({ children, numberOfLines: _numberOfLines, ...props }: { children?: React.ReactNode; numberOfLines?: number }) => React.createElement('span', props, children),
    View: ({ children, accessibilityViewIsModal, style, ...props }: { children?: React.ReactNode; accessibilityViewIsModal?: boolean; style?: unknown }) => {
      if (accessibilityViewIsModal) mocks.sheetStyle = style
      return React.createElement('div', props, children)
    },
  }
})
vi.mock('@expo/vector-icons', async () => {
  const React = await import('react')
  return { MaterialCommunityIcons: () => React.createElement('i') }
})
vi.mock('@/components/motion/PressableScale', async () => {
  const React = await import('react')
  return {
    PressableScale: ({ children, accessibilityLabel: _accessibilityLabel, accessibilityRole: _accessibilityRole, ...props }: {
      children?: React.ReactNode
      accessibilityLabel?: string
      accessibilityRole?: string
    }) => React.createElement('button', props, children),
  }
})
vi.mock('@/hooks/useAppTheme', () => ({ useSportTheme: () => new Proxy({}, { get: () => '#000000' }) }))

import { ArenaSessionHostControlsSheet } from '@/components/arena-session/ArenaSessionHostControlsSheet'

;(globalThis as { React?: typeof React }).React = React

describe('ArenaSessionHostControlsSheet queue reachability', () => {
  it('keeps a supported 100-team queue in a bounded scroll region', () => {
    mocks.scrollViews.length = 0
    mocks.sheetStyle = undefined

    const html = renderToStaticMarkup(React.createElement(ArenaSessionHostControlsSheet, {
      visible: true,
      queuedTeams: Array.from({ length: 100 }, (_, index) => ({
        teamId: `team-${index + 1}`,
        name: `Team ${index + 1}`,
        partyName: undefined,
        members: [],
        queuePosition: index + 1,
      })),
      canOpen: true,
      canAdvance: true,
      canReorder: true,
      canBeginDrain: true,
      canClose: true,
      onCloseSheet: vi.fn(),
      onOpen: vi.fn(),
      onAdvanceQueue: vi.fn(),
      onReorderQueue: vi.fn(),
      onBeginDrain: vi.fn(),
      onCloseSession: vi.fn(),
    }))

    expect(mocks.sheetStyle).toMatchObject({ maxHeight: '90%' })
    expect(mocks.scrollViews).toHaveLength(1)
    expect(mocks.scrollViews[0]).toMatchObject({
      accessibilityLabel: 'รายการควบคุมสนาม',
      showsVerticalScrollIndicator: true,
    })
    expect(html).toContain('Team 100')
  })
})
