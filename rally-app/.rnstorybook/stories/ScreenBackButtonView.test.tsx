import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({
  canGoBack: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
}))

vi.mock('expo-router', () => ({
  router: {
    canGoBack: harness.canGoBack,
    back: harness.back,
    replace: harness.replace,
  },
}))
vi.mock('@/components/navigation/ScreenBackButtonView', () => ({
  ScreenBackButtonView: (props: { onPress: () => void }) => React.createElement('button', props),
}))

import { ScreenBackButton } from '@/components/navigation/ScreenBackButton'

;(globalThis as { React?: typeof React }).React = React

describe('ScreenBackButton wrapper parity', () => {
  beforeEach(() => {
    harness.canGoBack.mockReset()
    harness.canGoBack.mockReturnValue(true)
    harness.back.mockReset()
    harness.replace.mockReset()
  })

  it('runs the override alone without cleanup or router fallback', () => {
    const override = vi.fn()
    const beforeNavigate = vi.fn()
    const element = ScreenBackButton({ onPress: override, beforeNavigate })
    element.props.onPress()
    expect(override).toHaveBeenCalledOnce()
    expect(beforeNavigate).not.toHaveBeenCalled()
    expect(harness.canGoBack).not.toHaveBeenCalled()
    expect(harness.back).not.toHaveBeenCalled()
    expect(harness.replace).not.toHaveBeenCalled()
  })

  it('runs cleanup once before backing through an available stack', () => {
    const beforeNavigate = vi.fn()
    const element = ScreenBackButton({ beforeNavigate })
    element.props.onPress()
    expect(beforeNavigate).toHaveBeenCalledOnce()
    expect(harness.canGoBack).toHaveBeenCalledOnce()
    expect(harness.back).toHaveBeenCalledOnce()
    expect(harness.replace).not.toHaveBeenCalled()
    expect(beforeNavigate.mock.invocationCallOrder[0]).toBeLessThan(harness.canGoBack.mock.invocationCallOrder[0] ?? 0)
    expect(harness.canGoBack.mock.invocationCallOrder[0]).toBeLessThan(harness.back.mock.invocationCallOrder[0] ?? 0)
  })

  it('runs cleanup once before replacing Home without a back stack', () => {
    harness.canGoBack.mockReturnValue(false)
    const beforeNavigate = vi.fn()
    const element = ScreenBackButton({ beforeNavigate })
    element.props.onPress()
    expect(beforeNavigate).toHaveBeenCalledOnce()
    expect(harness.canGoBack).toHaveBeenCalledOnce()
    expect(harness.back).not.toHaveBeenCalled()
    expect(harness.replace).toHaveBeenCalledWith('/(tabs)')
    expect(beforeNavigate.mock.invocationCallOrder[0]).toBeLessThan(harness.canGoBack.mock.invocationCallOrder[0] ?? 0)
    expect(harness.canGoBack.mock.invocationCallOrder[0]).toBeLessThan(harness.replace.mock.invocationCallOrder[0] ?? 0)
  })
})
