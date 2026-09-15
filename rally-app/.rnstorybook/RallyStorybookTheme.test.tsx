import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({
  presses: [] as {
    label?: string
    onPress?: () => void
    selected?: boolean
  }[],
  storage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}))

vi.mock('react-native', () => ({
  Platform: { OS: 'ios', select: <T,>(values: { ios?: T; android?: T; native?: T; default?: T }) => values.ios ?? values.native ?? values.default ?? values.android },
  Pressable: ({
    accessibilityLabel,
    accessibilityState,
    children,
    onPress,
  }: {
    accessibilityLabel?: string
    accessibilityState?: { selected?: boolean }
    children?: React.ReactNode
    onPress?: () => void
  }) => {
    harness.presses.push({
      label: accessibilityLabel,
      onPress,
      selected: accessibilityState?.selected,
    })
    return React.createElement('button', { 'aria-label': accessibilityLabel, onClick: onPress }, children)
  },
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: ({ children }: { children?: React.ReactNode }) => React.createElement('span', null, children),
  View: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  useColorScheme: () => 'light',
}))

vi.mock('@/lib/storage', () => ({ default: harness.storage }))
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }))
vi.mock('./RallyStorybookFonts', () => ({ RallyStorybookFonts: () => null }))

import { useThemeStore } from '@/stores/themeStore'
import { useSportTheme } from '@/hooks/useAppTheme'
import { RallyStorybookTheme } from './RallyStorybookTheme'
import preview from './preview'

describe('RallyStorybookTheme', () => {
  it('disables the floating fullscreen control so it cannot cover the theme controls', () => {
    expect(preview.parameters?.hideFullScreenButton).toBe(true)
  })
  beforeEach(() => {
    harness.presses.length = 0
    harness.storage.setItem.mockClear()
    useThemeStore.setState({ preference: 'light', isHydrated: true })
  })

  it('switches the real theme store in memory and keeps the story child in static output', () => {
    const render = () => renderToStaticMarkup(
      React.createElement(
        RallyStorybookTheme,
        null,
        React.createElement(ThemeProbe),
        React.createElement('span', { id: 'story-child' }, 'stable story'),
      ),
    )

    expect(render()).toContain('stable story')
    expect(render()).toContain('#ffffff')
    expect(useThemeStore.getState().preference).toBe('light')

    harness.presses.find((press) => press.label === 'ใช้ธีมมืด')?.onPress?.()

    expect(useThemeStore.getState().preference).toBe('dark')
    expect(render()).toContain('stable story')
    expect(harness.storage.setItem).not.toHaveBeenCalled()

    harness.presses.find((press) => press.label === 'ใช้ธีมสว่าง')?.onPress?.()

    expect(useThemeStore.getState().preference).toBe('light')
    expect(harness.storage.setItem).not.toHaveBeenCalled()
  })

  it('exposes both theme choices as accessible touch controls', () => {
    renderToStaticMarkup(React.createElement(RallyStorybookTheme, null, React.createElement('span', null, 'story')))

    expect(harness.presses.map((press) => press.label)).toEqual(['ใช้ธีมสว่าง', 'ใช้ธีมมืด'])
    expect(harness.presses.every((press) => typeof press.onPress === 'function')).toBe(true)
  })
})

function ThemeProbe() {
  const theme = useSportTheme()
  return React.createElement('span', null, theme.bg)
}
