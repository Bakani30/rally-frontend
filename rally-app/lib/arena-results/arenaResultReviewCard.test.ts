import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  pressables: new Map<string, { onPress?: () => void }>(),
}))

const theme = {
  surface: '#1d1d1d',
  surfaceStrong: '#252525',
  line: '#333333',
  green: '#4caf50',
  greenSoft: '#123d1a',
  greenVivid: '#67d66e',
  orange: '#f58b3a',
  orangeSoft: '#412614',
  blue: '#4c9cff',
  blueSoft: '#162d52',
  red: '#f05b65',
  redSoft: '#441d22',
  muted: '#aaaaaa',
  ink: '#eeeeee',
  inkSoft: '#cccccc',
  bg: '#111111',
} as const

vi.mock('react-native', async () => {
  const React = await import('react')
  return {
    Platform: {
      OS: 'ios',
      select: <T,>(spec: { ios?: T; android?: T; native?: T; default?: T }) => (
        spec.ios ?? spec.native ?? spec.default ?? spec.android
      ),
    },
    StyleSheet: { create: <T,>(styles: T) => styles },
    View: ({
      children,
      accessibilityLabel: _accessibilityLabel,
      ...props
    }: { children?: React.ReactNode; accessibilityLabel?: string }) => React.createElement('div', props, children),
    Text: ({
      children,
      accessibilityLabel: _accessibilityLabel,
      ...props
    }: { children?: React.ReactNode; accessibilityLabel?: string }) => React.createElement('span', props, children),
  }
})

vi.mock('@expo/vector-icons', async () => {
  const React = await import('react')
  return { MaterialCommunityIcons: () => React.createElement('i') }
})

vi.mock('@/components/motion/PressableScale', async () => {
  const React = await import('react')
  return {
    PressableScale: ({
      children,
      scaleTo,
      accessibilityLabel,
      onPress,
      ...props
    }: {
      children?: React.ReactNode
      scaleTo?: number
      accessibilityLabel?: string
      onPress?: () => void
    }) => {
      if (accessibilityLabel) mocks.pressables.set(accessibilityLabel, { onPress })
      return React.createElement(
        'button',
        {
          ...props,
          'data-scale-to': scaleTo === undefined ? '' : String(scaleTo),
          'data-accessibility-label': accessibilityLabel,
        },
        children,
      )
    },
  }
})

vi.mock('@/hooks/useAppTheme', () => ({ useSportTheme: () => theme }))
vi.mock('@/lib/match/matchRules', () => ({ getParticipantDisplayName: () => 'Player' }))

import {
  TeamResultReviewCard,
  type ArenaConsensusReview,
  type ArenaTeamResultReviewCardProps,
} from '@/components/match/TeamResultReviewCard'

;(globalThis as { React?: typeof React }).React = React

describe('Arena TeamResultReviewCard', () => {
  it('renders the server-owned approval progress label', () => {
    const html = renderArenaReview({ consensus: { approvalLabel: 'ยืนยันแล้ว 1/2' } })

    expect(html).toContain('ยืนยันแล้ว 1/2')
  })

  it('does not render a duplicate disabled approval action after the actor approved', () => {
    const html = renderArenaReview({ consensus: { actorApproved: true, canApprove: true } })

    expect(html).toContain('คุณยืนยันผลแล้ว')
    expect(html).not.toContain('<button')
  })

  it('labels cancellation agreement as confirmation of the other team request', () => {
    const html = renderArenaReview({ canAgreeCancel: true })

    expect(html).toContain('ยืนยันการยกเลิกของอีกทีม')
  })

  it('renders both other-captain cancellation decisions as accessible actions', () => {
    const html = renderArenaReview({ canAgreeCancel: true, canDeclineCancel: true })

    expect(html).toContain('ยืนยันการยกเลิกของอีกทีม')
    expect(html).toContain('ปฏิเสธการยกเลิก')
    expect(html).toContain('data-accessibility-label="ปฏิเสธการยกเลิก"')
  })

  it('renders only the requester withdrawal action when the server grants it', () => {
    const html = renderArenaReview({ canWithdrawCancel: true })

    expect(html).toContain('ถอนคำขอยกเลิก')
    expect(html).toContain('data-accessibility-label="ถอนคำขอยกเลิก"')
    expect(html).not.toContain('ยืนยันการยกเลิกของอีกทีม')
  })

  it('emits decline and withdrawal only through their dedicated callbacks', () => {
    const onDeclineCancel = vi.fn()
    const onWithdrawCancel = vi.fn()
    renderArenaReview({
      canDeclineCancel: true,
      onDeclineCancel,
    })
    press('ปฏิเสธการยกเลิก')

    renderArenaReview({
      canWithdrawCancel: true,
      onWithdrawCancel,
    })
    press('ถอนคำขอยกเลิก')

    expect(onDeclineCancel).toHaveBeenCalledOnce()
    expect(onWithdrawCancel).toHaveBeenCalledOnce()
  })

  it('removes nested action press scaling when reduced motion is requested', () => {
    const html = renderArenaReview({
      reduceMotion: true,
      consensus: { canRequestCorrection: true },
    })

    expect(html).toContain('data-scale-to="1"')
  })
})

type ArenaReviewOverrides = Partial<Omit<ArenaTeamResultReviewCardProps, 'mode' | 'consensus'>> & {
  consensus?: Partial<ArenaConsensusReview>
}

function renderArenaReview(overrides: ArenaReviewOverrides = {}) {
  const base = {
    mode: 'arena' as const,
    consensus: {
      side0Score: 12,
      side1Score: 9,
      resultVersion: 2,
      approvalLabel: 'ยืนยันแล้ว 0/2',
      side0Approved: false,
      side1Approved: false,
      actorApproved: false,
      canApprove: true,
      canRequestCorrection: false,
    },
    isApproving: false,
    correctionBusy: false,
    canRequestCancel: false,
    canAgreeCancel: false,
    canDeclineCancel: false,
    canWithdrawCancel: false,
    cancelBusy: false,
    actionsLocked: false,
    reduceMotion: false,
    onApprove: () => undefined,
    onRequestCorrection: () => undefined,
    onRequestCancel: () => undefined,
    onAgreeCancel: () => undefined,
    onDeclineCancel: () => undefined,
    onWithdrawCancel: () => undefined,
  }
  const props = {
    ...base,
    ...overrides,
    consensus: {
      ...base.consensus,
      ...overrides.consensus,
    },
  }
  return renderToStaticMarkup(React.createElement(TeamResultReviewCard, props as never))
}

function press(label: string) {
  const onPress = mocks.pressables.get(label)?.onPress
  expect(onPress).toBeTypeOf('function')
  onPress?.()
}
