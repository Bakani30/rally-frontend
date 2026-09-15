import { readFileSync } from 'node:fs'

import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({
  glassProps: [] as Array<Record<string, unknown>>,
  blurProps: [] as Array<Record<string, unknown>>,
  pressableProps: [] as Array<Record<string, unknown>>,
  translationCalls: [] as Array<{ key: string; params?: Record<string, string | number> }>,
  dark: false,
  blurAvailable: true,
  liquidGlassAvailable: true,
}))

vi.mock('react-native', () => {
  class AnimatedValue {
    addListener() { return 'listener' }
    removeListener() {}
    setValue() {}
    stopAnimation() {}
  }

  return {
    AccessibilityInfo: {
      addEventListener: () => ({ remove: () => undefined }),
      isReduceMotionEnabled: () => Promise.resolve(false),
      isReduceTransparencyEnabled: () => Promise.resolve(false),
    },
    Animated: {
      Text: ({ children }: { children?: React.ReactNode }) => React.createElement('span', null, children),
      Value: AnimatedValue,
      timing: () => ({ start: (complete: () => void) => complete() }),
    },
    Easing: { cubic: 'cubic', out: () => 'out' },
    Platform: { OS: 'ios' },
    UIManager: { getViewManagerConfig: () => (harness.blurAvailable ? {} : null) },
    StyleSheet: {
      absoluteFill: { position: 'absolute', inset: 0 },
      absoluteFillObject: { position: 'absolute', inset: 0 },
      create: <T,>(styles: T) => styles,
    },
    Text: ({ children }: { children?: React.ReactNode }) => React.createElement('span', null, children),
    View: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  }
})
vi.mock('react-native-svg', () => ({ default: () => React.createElement('svg'), Path: () => React.createElement('path') }))
vi.mock('expo-glass-effect', () => ({
  GlassView: (props: Record<string, unknown>) => {
    harness.glassProps.push(props)
    return React.createElement('glass-native', null, props.children as React.ReactNode)
  },
  isGlassEffectAPIAvailable: () => harness.liquidGlassAvailable,
  isLiquidGlassAvailable: () => harness.liquidGlassAvailable,
}))
vi.mock('expo-blur', () => ({
  BlurView: (props: Record<string, unknown>) => {
    harness.blurProps.push(props)
    return React.createElement('blur-fallback', null, props.children as React.ReactNode)
  },
}))
vi.mock('@/components/economy/PointsIcon', () => ({ PointsIcon: () => React.createElement('i') }))
vi.mock('@/components/motion/PressableScale', () => ({
  PressableScale: (props: Record<string, unknown>) => {
    harness.pressableProps.push(props)
    return React.createElement('button', null, props.children as React.ReactNode)
  },
}))
vi.mock('@/constants/theme', () => ({ Fonts: { mono: 'mono', number: 'number' } }))
vi.mock('@/hooks/useAppTheme', () => ({
  useSportTheme: () => ({ greenVivid: '#0fa968', risk: '#c73f41' }),
  useThemeMode: () => (harness.dark ? 'dark' : 'light'),
}))
vi.mock('@/hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      harness.translationCalls.push({ key, params })
      return params ? `${key}:${JSON.stringify(params)}` : key
    },
  }),
}))
vi.mock('@/lib/i18n/dictionaries/home', () => ({ homeDictionary: {} }))

import { HomeScoreVaultCard } from '@/components/home/HomeScoreVaultCard'

;(globalThis as { React?: typeof React }).React = React

const source = readFileSync('components/home/HomeScoreVaultCard.tsx', 'utf8')

function renderCard(dark = false) {
  harness.dark = dark
  return renderToStaticMarkup(React.createElement(HomeScoreVaultCard, {
    walletPoints: 1_250,
    walletStatus: 'ready',
    pointsDelta: 40,
    displayName: 'Rally Player',
    rallyId: '1234567890',
    onOpenWallet: () => undefined,
  }))
}

describe('HomeScoreVaultCard presentation', () => {
  beforeEach(() => {
    harness.glassProps.length = 0
    harness.blurProps.length = 0
    harness.pressableProps.length = 0
    harness.translationCalls.length = 0
    harness.dark = false
    harness.blurAvailable = true
    harness.liquidGlassAvailable = true
  })

  it('uses a reinforced white-gray frost over native liquid glass in both themes', () => {
    for (const dark of [false, true]) {
      const html = renderCard(dark)

      expect(html).toContain('glass-native')
      expect(harness.glassProps).toHaveLength(1)
      expect(harness.glassProps[0]).toMatchObject({
        glassEffectStyle: 'regular',
        colorScheme: dark ? 'dark' : 'light',
        isInteractive: false,
      })
      expect(harness.blurProps).toHaveLength(0)
      harness.glassProps.length = 0
    }

    expect(source).toContain("frostedLightFill: { backgroundColor: 'rgba(231,236,235,0.72)' }")
    expect(source).toContain("frostedDarkFill: { backgroundColor: 'rgba(36,43,46,0.76)' }")
    expect(source).toContain("frostedLightEdge: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.68)' }")
    expect(source).toContain("frostedDarkEdge: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' }")
  })

  it('uses one stronger blur fallback behind the reinforced frost in both themes', () => {
    for (const dark of [false, true]) {
      harness.liquidGlassAvailable = false
      const html = renderCard(dark)

      expect(html).toContain('blur-fallback')
      expect(harness.glassProps).toHaveLength(0)
      expect(harness.blurProps).toHaveLength(1)
      expect(harness.blurProps[0]).toMatchObject({ intensity: 55, tint: dark ? 'dark' : 'light' })
      harness.blurProps.length = 0
    }
  })

  it('keeps the frosted material renderable when the installed client lacks ExpoBlurView', () => {
    harness.liquidGlassAvailable = false
    harness.blurAvailable = false

    const html = renderCard()

    expect(html).not.toContain('blur-fallback')
    expect(harness.glassProps).toHaveLength(0)
    expect(harness.blurProps).toHaveLength(0)
  })

  it('keeps the same opaque white-gray direction when native materials are unavailable', () => {
    expect(source).toContain("fallbackUnavailableLight: { backgroundColor: 'rgba(231,236,235,0.92)' }")
    expect(source).toContain("fallbackUnavailableDark: { backgroundColor: 'rgba(36,43,46,0.94)' }")
    expect(source).toContain("reducedLight: { backgroundColor: '#e7eceb' }")
    expect(source).toContain("reducedDark: { backgroundColor: '#242b2e' }")
  })

  it('contains no duplicated hero or reward-card artwork and uses a restrained dark shadow', () => {
    expect(source).not.toContain('figma-new-home-hero')
    expect(source).not.toContain('figma-reward-card')
    expect(source).toContain("boxShadow: isDark ? '0px 10px 12.5px rgba(0,0,0,0.08)' : '0px 10px 12.5px rgba(0,0,0,0.15)'")
  })

  it('announces only the ready points balance, without a fabricated credit value', () => {
    renderCard()

    expect(harness.translationCalls).toContainEqual({
      key: 'openRewardBalancePoints',
      params: { points: '1,250' },
    })
    expect(harness.translationCalls).not.toContainEqual(expect.objectContaining({
      key: 'openRewardBalanceValues',
    }))
    expect(harness.pressableProps[0]).toMatchObject({
      accessibilityLabel: 'openRewardBalancePoints:{"points":"1,250"}',
    })
  })
})
