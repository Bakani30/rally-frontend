import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({
  presses: [] as Array<{ onPress: () => void; accessibilityLabel?: string; accessibilityRole?: string; hitSlop?: number }>,
}))

vi.mock('react-native', () => ({
  Platform: { OS: 'ios', select: <T,>(values: { ios?: T; android?: T; native?: T; default?: T }) => values.ios ?? values.native ?? values.default ?? values.android },
  StyleSheet: { create: <T,>(styles: T) => styles },
}))
vi.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: () => React.createElement('i') }))
vi.mock('@/hooks/useAppTheme', () => ({ useSportTheme: () => ({ ink: '#fff', surface: '#222', line: '#333' }) }))
vi.mock('@/components/motion/PressableScale', () => ({
  PressableScale: ({ children, onPress, accessibilityLabel, accessibilityRole, hitSlop }: { children?: React.ReactNode; onPress: () => void; accessibilityLabel?: string; accessibilityRole?: string; hitSlop?: number }) => {
    harness.presses.push({ onPress, accessibilityLabel, accessibilityRole, hitSlop })
    return React.createElement('button', { onClick: onPress, 'aria-label': accessibilityLabel }, children)
  },
}))

import { ScreenBackButtonView } from '@/components/navigation/ScreenBackButtonView'

;(globalThis as { React?: typeof React }).React = React

describe('ScreenBackButtonView presentation', () => {
  beforeEach(() => { harness.presses.length = 0 })

  it('renders the actual pure button with default accessibility and emits one callback', () => {
    const onPress = vi.fn()
    const html = renderToStaticMarkup(React.createElement(ScreenBackButtonView, { onPress }))
    expect(html).toContain('aria-label="Back"')
    expect(harness.presses).toHaveLength(1)
    expect(harness.presses[0]).toMatchObject({ accessibilityLabel: 'Back', accessibilityRole: 'button', hitSlop: 4 })
    harness.presses[0]?.onPress()
    expect(onPress).toHaveBeenCalledOnce()
  })
})
