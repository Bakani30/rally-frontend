// Production wiring only: the Edge transport stays behind useArenaResult.
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  pressables: new Map<string, { onPress?: () => void }>(),
  snapshot: undefined as unknown,
  cancelMutation: { isPending: false, mutateAsync: vi.fn() },
}))

vi.mock('react-native', async () => {
  const React = await import('react')
  return {
    ActivityIndicator: () => React.createElement('i'),
    Platform: { select: <T,>(values: { ios?: T; android?: T; native?: T; default?: T }) => values.ios ?? values.native ?? values.default ?? values.android },
    ScrollView: ({ children, contentContainerStyle: _contentContainerStyle, showsVerticalScrollIndicator: _showsVerticalScrollIndicator, ...props }: { children?: React.ReactNode; contentContainerStyle?: unknown; showsVerticalScrollIndicator?: boolean }) => React.createElement('div', props, children),
    Text: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement('span', props, children),
    View: ({ children, accessibilityLiveRegion: _accessibilityLiveRegion, ...props }: { children?: React.ReactNode; accessibilityLiveRegion?: string }) => React.createElement('div', props, children),
  }
})

vi.mock('@expo/vector-icons', async () => {
  const React = await import('react')
  return { MaterialCommunityIcons: () => React.createElement('i') }
})

vi.mock('expo-router', () => ({ router: { canGoBack: () => false, back: vi.fn(), replace: vi.fn() } }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({}) }))
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }))
vi.mock('react-native-reanimated', () => ({ useReducedMotion: () => true }))

vi.mock('@/components/motion/PressableScale', async () => {
  const React = await import('react')
  return {
    PressableScale: ({ children, accessibilityLabel, onPress, scaleTo: _scaleTo, ...props }: {
      children?: React.ReactNode
      accessibilityLabel?: string
      onPress?: () => void
      scaleTo?: number
    }) => {
      if (accessibilityLabel) mocks.pressables.set(accessibilityLabel, { onPress })
      return React.createElement('button', { ...props, onClick: onPress, 'aria-label': accessibilityLabel }, children)
    },
  }
})

vi.mock('@/components/match/BasketballSelfStatDraftPanel', () => ({ BasketballSelfStatDraftPanel: () => null }))
vi.mock('@/components/match/TeamResultReviewCard', () => ({ TeamResultReviewCard: () => React.createElement('span', null, 'RESULT REVIEW') }))
vi.mock('@/components/match/TeamSportSubmitPanel', () => ({ TeamScoreVault: () => React.createElement('span', null, 'RESULT SCORE') }))
vi.mock('@/components/motion/AnimatedNumber', () => ({ AnimatedNumber: () => null }))
vi.mock('@/components/motion/Reveal', () => ({ Reveal: ({ children }: { children?: React.ReactNode }) => children }))
vi.mock('@/components/ui/StatusPill', () => ({ StatusPill: () => null }))
vi.mock('@/hooks/useAppTheme', () => ({ useSportTheme: () => ({}) }))
vi.mock('@/hooks/useBasketballPlayerStatDraft', () => ({ useUpsertBasketballPlayerStatDraft: () => ({ isPending: false, mutateAsync: vi.fn() }) }))
vi.mock('@/lib/arena-results/arenaResultNavigation', () => ({ returnToArenaSession: vi.fn() }))
vi.mock('@/components/arena-result/arenaResultPanelStyles', () => ({ createArenaResultPanelStyles: () => ({}) }))
vi.mock('@/hooks/useArenaResult', () => ({
  useArenaResult: () => ({
    resultQuery: { isPending: false, isFetching: false, refetch: vi.fn() },
    snapshot: mocks.snapshot,
    submitMutation: { isPending: false, mutateAsync: vi.fn() },
    approveMutation: { isPending: false, mutateAsync: vi.fn() },
    correctionMutation: { isPending: false, mutateAsync: vi.fn() },
    cancelMutation: mocks.cancelMutation,
    hasVersionConflict: false,
    clearConflict: vi.fn(),
    refreshAfterStatSave: vi.fn(),
    authoritativeRefresh: { locked: false, isRefreshing: false, hasError: false },
    retryAuthoritativeRefresh: vi.fn(),
  }),
}))

// Import after mocks so the interaction harness receives the controlled hook/component doubles.
// eslint-disable-next-line import/first
import { ArenaResultPanel } from '@/components/arena-result/ArenaResultPanel'

;(globalThis as { React?: typeof React }).React = React

describe('ArenaResultPanel cancel pending', () => {
  beforeEach(() => {
    mocks.pressables.clear()
    mocks.cancelMutation.mutateAsync.mockReset().mockResolvedValue({})
  })

  it('hides result review and dispatches decline for the other captain', async () => {
    const html = renderPanel(snapshot({ requester: 'other', canAgreeCancel: true, canDeclineCancel: true }))

    expect(html).toContain('อีกทีมขอยกเลิกรอบ เลือกยืนยันหรือปฏิเสธ')
    expect(html).not.toContain('RESULT REVIEW')
    expect(html).not.toContain('RESULT SCORE')
    await press('ปฏิเสธการยกเลิก')
    expect(mocks.cancelMutation.mutateAsync).toHaveBeenCalledWith({ cancelAction: 'decline' })
  })

  it('hides resubmission and dispatches withdrawal for the requester', async () => {
    const html = renderPanel(snapshot({ requester: 'self', canWithdrawCancel: true, result: 'resubmission' }))

    expect(html).toContain('คุณขอยกเลิกรอบแล้ว รออีกทีมตอบรับหรือปฏิเสธ')
    expect(html).not.toContain('RESULT REVIEW')
    expect(html).not.toContain('RESULT SCORE')
    await press('ถอนคำขอยกเลิก')
    expect(mocks.cancelMutation.mutateAsync).toHaveBeenCalledWith({ cancelAction: 'withdraw' })
  })
})

function renderPanel(value: unknown) {
  mocks.snapshot = value
  return renderToStaticMarkup(React.createElement(ArenaResultPanel, { matchId: 'match-1' }))
}

async function press(label: string) {
  const onPress = mocks.pressables.get(label)?.onPress
  expect(onPress).toBeTypeOf('function')
  onPress?.()
  await Promise.resolve()
}

function snapshot(input: {
  requester: 'self' | 'other'
  canAgreeCancel?: boolean
  canDeclineCancel?: boolean
  canWithdrawCancel?: boolean
  result?: 'submitted' | 'resubmission'
}) {
  const resubmission = input.result === 'resubmission'
  return {
    arenaEventId: 'arena-1',
    roundId: 'round-1',
    matchId: 'match-1',
    activityType: 'basketball',
    phase: 'cancel_pending',
    reviewEpoch: 3,
    matchStatus: 'in_progress',
    roundStatus: resubmission ? 'disputed' : 'result_pending',
    draftReadiness: { draftCount: 4, requiredCount: 4, complete: true },
    actorDraft: null,
    currentResult: resubmission
      ? {
          kind: 'awaiting_resubmission', reason: 'correction_requested', resultVersion: 2, statsVersion: 2,
          payloadHash: 'a'.repeat(64), previousSide0Score: 11, previousSide1Score: 8, note: null, requestedByActor: true,
        }
      : {
          kind: 'submitted', resultVersion: 2, statsVersion: 2, payloadHash: 'a'.repeat(64), submitterRole: 'captain',
          side0Score: 11, side1Score: 8, note: null, submittedAt: '2026-08-26T00:00:00.000Z', stats: [],
          approvals: { side0: true, side1: false, approvedCount: 1, requiredCount: 2, actorApproved: false },
        },
    cancellation: { status: 'pending', cancelRequestId: 'request-1', requester: input.requester },
    actor: {
      role: 'captain', side: 0,
      capabilities: {
        canSubmit: resubmission,
        canApprove: !resubmission,
        canRequestCorrection: !resubmission,
        canRequestCancel: false,
        canAgreeCancel: input.canAgreeCancel ?? false,
        canDeclineCancel: input.canDeclineCancel ?? false,
        canWithdrawCancel: input.canWithdrawCancel ?? false,
        canEditActorDraft: resubmission,
      },
    },
    outcome: null,
  }
}
