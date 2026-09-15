import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  QueryClient,
  QueryClientProvider,
  type QueryKey,
} from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  appStateListeners: new Set<(status: string) => void>(),
  getSnapshot: vi.fn(),
  submit: vi.fn(),
  approve: vi.fn(),
  requestCorrection: vi.fn(),
  mutualCancel: vi.fn(),
}))

vi.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: (_event: string, callback: (status: string) => void) => {
      mocks.appStateListeners.add(callback)
      return { remove: () => mocks.appStateListeners.delete(callback) }
    },
  },
}))

vi.mock('@/lib/arena-results/arenaResultService', () => ({
  arenaResultService: {
    submit: mocks.submit,
    approve: mocks.approve,
    requestCorrection: mocks.requestCorrection,
    mutualCancel: mocks.mutualCancel,
  },
  getArenaResultSnapshot: mocks.getSnapshot,
}))

import type { ArenaRoundResultSnapshot } from '@/types/arenaResult'
import {
  arenaSessionSnapshotQueryKey,
  isArenaSessionSnapshotQueryForArena,
} from '@/lib/arena-sessions/arenaSessionSnapshotQuery'
import {
  arenaResultQueryKey,
  getArenaResultInvalidationKeys,
  getArenaResultRefetchInterval,
  isArenaResultVersionConflict,
  useArenaResult,
} from './useArenaResult'

let queryClient: QueryClient
let root: Root | undefined
let container: FakeNode
let current: ReturnType<typeof useArenaResult> | undefined

describe('Arena result query policy', () => {
  it('polls only while an in-progress result is foregrounded', () => {
    expect(getArenaResultRefetchInterval(snapshot('in_progress'), true)).toBe(5_000)
    expect(getArenaResultRefetchInterval(snapshot('settled'), true)).toBe(false)
    expect(getArenaResultRefetchInterval(snapshot('cancelled'), true)).toBe(false)
    expect(getArenaResultRefetchInterval(snapshot('in_progress'), false)).toBe(false)
  })

  it('uses the stable authoritative result key', () => {
    expect(arenaResultQueryKey('match-1')).toEqual(['arena-result', 'match-1'])
  })

  it('matches every actor Session snapshot only for the exact Arena event', () => {
    expect(arenaSessionSnapshotQueryKey('user-a', 'arena-1')).toEqual([
      'arena-session', 'snapshot', 'user-a', 'arena-1',
    ])
    expect(isArenaSessionSnapshotQueryForArena(
      ['arena-session', 'snapshot', 'user-a', 'arena-1'],
      'arena-1',
    )).toBe(true)
    expect(isArenaSessionSnapshotQueryForArena(
      ['arena-session', 'snapshot', 'user-a', 'arena-2'],
      'arena-1',
    )).toBe(false)
  })

  it('invalidates result, match, and its actor session on every success', () => {
    expect(getArenaResultInvalidationKeys(snapshot('in_progress'))).toEqual([
      ['arena-result', 'match-1'],
      ['match', 'match-1'],
      ['arena-session', 'snapshot'],
    ])
  })

  it('invalidates Arena discovery only after a terminal result', () => {
    expect(getArenaResultInvalidationKeys(snapshot('settled'))).toEqual([
      ['arena-result', 'match-1'],
      ['match', 'match-1'],
      ['arena-session', 'snapshot'],
      ['arena-events'],
    ])
    expect(getArenaResultInvalidationKeys(snapshot('cancelled'))).toContainEqual(['arena-events'])
  })

  it('recognizes version and epoch conflicts without treating them as retryable', () => {
    expect(isArenaResultVersionConflict({ code: 'arena_result_version_conflict' })).toBe(true)
    expect(isArenaResultVersionConflict({ code: 'arena_result_review_epoch_conflict' })).toBe(true)
    expect(isArenaResultVersionConflict({ code: 'arena_result_draft_revision_conflict' })).toBe(true)
    expect(isArenaResultVersionConflict(new Error('stale'))).toBe(false)
  })
})

describe('useArenaResult', () => {
  beforeEach(() => {
    installFakeDom()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    activeQueryClient = queryClient
    mocks.getSnapshot.mockReset().mockResolvedValue(snapshot('in_progress'))
    mocks.submit.mockReset().mockResolvedValue(actionOutput())
    mocks.approve.mockReset().mockResolvedValue(actionOutput())
    mocks.requestCorrection.mockReset().mockResolvedValue(actionOutput())
    mocks.mutualCancel.mockReset().mockResolvedValue(actionOutput())
    mocks.appStateListeners.clear()
  })

  afterEach(async () => {
    if (root) {
      await act(async () => root!.unmount())
    }
    root = undefined
    queryClient.clear()
    activeQueryClient = undefined
    mocks.appStateListeners.clear()
    vi.useRealTimers()
  })

  it('routes every action to the hook-bound match id', async () => {
    await renderHook('match-bound')

    await act(async () => {
      await current!.submitMutation.mutateAsync({
        side0Score: 21,
        side1Score: 19,
        matchId: 'other-match',
      } as never)
      await current!.approveMutation.mutateAsync({ resultVersion: 2, payloadHash: 'a'.repeat(64) })
      await current!.correctionMutation.mutateAsync({ resultVersion: 2, payloadHash: 'a'.repeat(64), note: 'fix' })
      await current!.cancelMutation.mutateAsync({ cancelAction: 'request' })
    })

    expect(mocks.submit).toHaveBeenCalledWith({
      matchId: 'match-bound', side0Score: 21, side1Score: 19, expectedReviewEpoch: 1,
    })
    expect(mocks.approve).toHaveBeenCalledWith({
      matchId: 'match-bound', resultVersion: 2, payloadHash: 'a'.repeat(64), expectedReviewEpoch: 1,
    })
    expect(mocks.requestCorrection).toHaveBeenCalledWith({
      matchId: 'match-bound', resultVersion: 2, payloadHash: 'a'.repeat(64),
      note: 'fix', expectedReviewEpoch: 1,
    })
    expect(mocks.mutualCancel).toHaveBeenCalledWith({
      matchId: 'match-bound', cancelAction: 'request', expectedReviewEpoch: 1,
    })
    expect(mocks.submit.mock.calls.flat().some((value: unknown) => (
      value && typeof value === 'object' && 'matchId' in value && value.matchId === 'other-match'
    ))).toBe(false)
  })

  it('binds a cancel response to the opaque pending request and current epoch', async () => {
    mocks.getSnapshot.mockResolvedValue({
      ...snapshot('in_progress'),
      phase: 'cancel_pending',
      roundStatus: 'result_pending',
      currentResult: submittedResult(),
      cancellation: {
        status: 'pending',
        cancelRequestId: '77777777-7777-4777-8777-777777777777',
        requester: 'other',
      },
      actor: {
        role: 'captain',
        side: 0,
        capabilities: {
          canSubmit: false,
          canApprove: false,
          canRequestCorrection: false,
          canRequestCancel: false,
          canAgreeCancel: true,
          canDeclineCancel: true,
          canWithdrawCancel: false,
          canEditActorDraft: false,
        },
      },
    } as ArenaRoundResultSnapshot)
    await renderHook('match-bound')

    await act(async () => {
      await current!.cancelMutation.mutateAsync({ cancelAction: 'decline' })
    })

    expect(mocks.mutualCancel).toHaveBeenCalledWith({
      matchId: 'match-bound',
      cancelAction: 'decline',
      cancelRequestId: '77777777-7777-4777-8777-777777777777',
      expectedReviewEpoch: 1,
    })
  })

  it('invalidates exact actor Session snapshots on nonterminal success', async () => {
    await renderHook('match-1')
    seedQuery(['arena-session', 'snapshot', 'user-a', 'arena-1'], { value: 'a' })
    seedQuery(['arena-session', 'snapshot', 'user-b', 'arena-1'], { value: 'b' })
    seedQuery(['arena-session', 'snapshot', 'user-c', 'arena-2'], { value: 'c' })

    await act(async () => {
      await current!.submitMutation.mutateAsync({ side0Score: 1, side1Score: 0 })
    })

    expect(isInvalidated(['arena-session', 'snapshot', 'user-a', 'arena-1'])).toBe(true)
    expect(isInvalidated(['arena-session', 'snapshot', 'user-b', 'arena-1'])).toBe(true)
    expect(isInvalidated(['arena-session', 'snapshot', 'user-c', 'arena-2'])).toBe(false)
    expect(isInvalidated(['arena-events'])).toBe(false)
  })

  it('invalidates Arena discovery after a terminal refetch', async () => {
    await renderHook('match-1')
    seedQuery(['arena-events'], { value: 'discoverable' })
    seedQuery(['match', 'match-1'], { value: 'match' })
    mocks.getSnapshot.mockResolvedValue(snapshot('settled'))

    await act(async () => {
      await current!.approveMutation.mutateAsync({ resultVersion: 2, payloadHash: 'b'.repeat(64) })
    })

    expect(isInvalidated(['arena-events'])).toBe(true)
    expect(isInvalidated(['match', 'match-1'])).toBe(true)
  })

  it('fails closed instead of mutating when no authoritative snapshot supplied the epoch', async () => {
    mocks.getSnapshot.mockRejectedValue(new Error('result unavailable'))
    await renderHook('match-1', undefined, true, false)
    await act(async () => {
      await expect(current!.submitMutation.mutateAsync({ side0Score: 4, side1Score: 3 }))
        .rejects.toMatchObject({ code: 'arena_result_review_epoch_required' })
    })

    expect(mocks.submit).not.toHaveBeenCalled()
  })

  it('awaits conflict refetch, calls the conflict callback, and never retries', async () => {
    const onConflict = vi.fn()
    await renderHook('match-1', onConflict)
    const initialFetches = mocks.getSnapshot.mock.calls.length
    mocks.approve.mockRejectedValue({ code: 'arena_result_version_conflict' })

    await act(async () => {
      await expect(current!.approveMutation.mutateAsync({
        resultVersion: 2, payloadHash: 'c'.repeat(64),
      })).rejects.toMatchObject({ code: 'arena_result_version_conflict' })
    })

    expect(mocks.approve).toHaveBeenCalledTimes(1)
    expect(mocks.getSnapshot.mock.calls.length).toBeGreaterThan(initialFetches)
    expect(onConflict).toHaveBeenCalledTimes(1)
    expect(current!.conflict).toBe(true)
  })

  it('does not optimistically replace the submitted snapshot on network failure', async () => {
    await renderHook('match-1')
    const before = current!.snapshot
    mocks.submit.mockRejectedValue(new Error('offline'))

    await act(async () => {
      await expect(current!.submitMutation.mutateAsync({ side0Score: 9, side1Score: 8 }))
        .rejects.toThrow('offline')
    })

    expect(current!.snapshot).toBe(before)
  })

  it('invalidates and refetches the authoritative Arena snapshot after a stat draft save', async () => {
    const before = snapshot('in_progress')
    const after = {
      ...before,
      actorDraft: {
        ...before.actorDraft,
        points: 9,
        note: 'saved by server',
        updatedAt: '2026-08-17T10:01:00.000Z',
      },
    }
    mocks.getSnapshot.mockReset().mockResolvedValueOnce(before).mockResolvedValue(after)
    await renderHook('match-1')
    const initialFetches = mocks.getSnapshot.mock.calls.length

    await act(async () => {
      await current!.refreshAfterStatSave()
    })

    expect(mocks.getSnapshot.mock.calls.length).toBeGreaterThan(initialFetches)
    expect(queryClient.getQueryData<ArenaRoundResultSnapshot>(arenaResultQueryKey('match-1'))?.actorDraft)
      .toEqual(after.actorDraft)
    await act(async () => waitFor(() => current!.snapshot?.actorDraft?.updatedAt === after.actorDraft.updatedAt))
    expect(current!.snapshot?.actorDraft).toEqual(after.actorDraft)
  })

  it('keeps result mutations locked after a refresh failure until retry receives a fresh authoritative snapshot', async () => {
    await renderHook('match-1')
    mocks.getSnapshot.mockRejectedValue(new Error('refresh offline'))

    await act(async () => {
      await current!.submitMutation.mutateAsync({ side0Score: 9, side1Score: 8 })
    })

    expect((current as typeof current & {
      authoritativeRefresh?: { locked: boolean; isRefreshing: boolean; hasError: boolean }
    })?.authoritativeRefresh).toEqual({
      locked: true,
      isRefreshing: false,
      hasError: true,
    })

    mocks.getSnapshot.mockResolvedValue(snapshot('in_progress'))
    await act(async () => {
      await (current as typeof current & { retryAuthoritativeRefresh: () => Promise<void> })!
        .retryAuthoritativeRefresh()
    })

    await act(async () => waitFor(() => (
      (current as typeof current & {
        authoritativeRefresh?: { locked: boolean; isRefreshing: boolean; hasError: boolean }
      })?.authoritativeRefresh?.locked === false
    )))
  })

  it('uses the same authoritative refresh lock after a player stat save', async () => {
    await renderHook('match-1')
    mocks.getSnapshot.mockRejectedValue(new Error('stat refresh offline'))

    await act(async () => {
      await current!.refreshAfterStatSave()
    })

    expect((current as typeof current & {
      authoritativeRefresh?: { locked: boolean; isRefreshing: boolean; hasError: boolean }
    })?.authoritativeRefresh).toEqual({
      locked: true,
      isRefreshing: false,
      hasError: true,
    })
  })

  it('stops background polling and cleans up the AppState listener', async () => {
    await renderHook('match-1')
    vi.useFakeTimers()
    const initialFetches = mocks.getSnapshot.mock.calls.length
    await act(async () => emitAppState('background'))
    await act(async () => vi.advanceTimersByTimeAsync(5_000))
    expect(mocks.getSnapshot).toHaveBeenCalledTimes(initialFetches)

    await act(async () => emitAppState('active'))
    await act(async () => vi.advanceTimersByTimeAsync(5_000))
    expect(mocks.getSnapshot.mock.calls.length).toBeGreaterThan(initialFetches)
    expect(mocks.appStateListeners.size).toBe(1)
    await act(async () => root!.unmount())
    expect(mocks.appStateListeners.size).toBe(0)
    root = undefined
  })
})

function actionOutput() {
  return { arenaId: 'arena-1', roundId: 'round-1', matchId: 'match-1', result: {} }
}

async function renderHook(
  matchId: string,
  onConflict?: () => void,
  enabled = true,
  waitForSuccess = true,
) {
  current = undefined
  container = createFakeNode('DIV')
  root = createRoot(container as unknown as Element)
  await act(async () => {
    root!.render(createElement(QueryClientProvider, { client: queryClient },
      createElement(HookHarness, { matchId, onConflict, enabled }),
    ))
  })
  await act(async () => waitFor(() => waitForSuccess
    ? current?.resultQuery.isSuccess === true
    : mocks.getSnapshot.mock.calls.length > 0))
}

function HookHarness({
  matchId,
  onConflict,
  enabled,
}: {
  matchId: string
  onConflict?: () => void
  enabled: boolean
}) {
  current = useArenaResult(matchId, { onConflict, enabled })
  return null
}

function seedQuery(queryKey: QueryKey, value: unknown) {
  queryClientForTest().setQueryData(queryKey, value)
}

function queryClientForTest(): QueryClient {
  // The test suite keeps the active client in the current hook's result.
  // This avoids threading it through every assertion helper.
  return activeQueryClient!
}

let activeQueryClient: QueryClient | undefined

function isInvalidated(queryKey: QueryKey): boolean {
  return Boolean(activeQueryClient?.getQueryCache().find({ queryKey })?.state.isInvalidated)
}

async function waitFor(condition: () => boolean) {
  const deadline = Date.now() + 1_000
  while (!condition() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  expect(condition()).toBe(true)
}

function emitAppState(status: string) {
  for (const listener of mocks.appStateListeners) listener(status)
}

type FakeNode = {
  nodeType: number
  nodeName: string
  tagName: string
  ownerDocument: FakeDocument
  namespaceURI: string
  style: Record<string, unknown>
  childNodes: FakeNode[]
  appendChild: (child: FakeNode) => FakeNode
  removeChild: (child: FakeNode) => FakeNode
  insertBefore: (child: FakeNode, before: FakeNode | null) => FakeNode
  setAttribute: () => void
  removeAttribute: () => void
  addEventListener: () => void
  removeEventListener: () => void
  contains: () => boolean
  textContent: string
}

type FakeDocument = {
  createElement: (name: string) => FakeNode
  createTextNode: (text: string) => FakeNode
  createComment: (text: string) => FakeNode
  addEventListener: () => void
  removeEventListener: () => void
}

function installFakeDom() {
  const document = {
    createElement: (name: string) => createFakeNode(name),
    createTextNode: (text: string) => Object.assign(createFakeNode('#text', 3), { nodeValue: text }),
    createComment: (text: string) => Object.assign(createFakeNode('#comment', 8), { nodeValue: text }),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  } as FakeDocument
  ;(globalThis as unknown as { document?: FakeDocument }).document = document
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  ;(globalThis as { window?: unknown }).window = {
    document,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    HTMLIFrameElement: function HTMLIFrameElement() {},
  }
}

function createFakeNode(name: string, nodeType = 1): FakeNode {
  const node = {
    nodeType,
    nodeName: name,
    tagName: name.toUpperCase(),
    ownerDocument: undefined as unknown as FakeDocument,
    namespaceURI: 'http://www.w3.org/1999/xhtml',
    style: {},
    childNodes: [] as FakeNode[],
    appendChild(child: FakeNode) { node.childNodes.push(child); return child },
    removeChild(child: FakeNode) { node.childNodes = node.childNodes.filter((item) => item !== child); return child },
    insertBefore(child: FakeNode, before: FakeNode | null) {
      const index = before ? node.childNodes.indexOf(before) : -1
      if (index < 0) node.childNodes.push(child)
      else node.childNodes.splice(index, 0, child)
      return child
    },
    setAttribute: () => undefined,
    removeAttribute: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    contains: () => false,
    textContent: '',
  }
  node.ownerDocument = (globalThis as unknown as { document?: FakeDocument }).document
    ?? ({ } as FakeDocument)
  return node
}

function snapshot(
  status: 'in_progress' | 'settled' | 'cancelled',
): ArenaRoundResultSnapshot {
  const terminal = status !== 'in_progress'
  return {
    arenaEventId: 'arena-1',
    roundId: 'round-1',
    matchId: 'match-1',
    activityType: 'basketball',
    phase: terminal ? status : 'active',
    reviewEpoch: 1,
    matchStatus: status,
    roundStatus: status,
    draftReadiness: { draftCount: 2, requiredCount: 2, complete: true },
    actorDraft: {
      points: 5,
      rebounds: 1,
      assists: 2,
      blocks: 0,
      threePointersMade: 1,
      note: 'self draft',
      updatedAt: '2026-08-17T00:00:00.000Z',
      draftRevision: 1,
    },
    currentResult: null,
    cancellation: { status: 'none', cancelRequestId: null, requester: null },
    actor: {
      role: 'captain',
      side: 0,
      capabilities: {
        canSubmit: !terminal,
        canApprove: !terminal,
        canRequestCorrection: !terminal,
        canRequestCancel: !terminal,
        canAgreeCancel: !terminal,
        canDeclineCancel: false,
        canWithdrawCancel: false,
        canEditActorDraft: !terminal,
      },
    },
    outcome: terminal
      ? status === 'settled'
        ? {
            status: 'settled',
            winnerSide: 0,
            actorOutcome: 'win',
            rotation: {
              championStreak: 1,
              winnerRetired: false,
              loserQueuePosition: 1,
              loserRetired: false,
              appliedAt: '2026-08-17T00:00:00.000Z',
            },
          }
        : {
            status: 'cancelled',
            winnerSide: null,
            actorOutcome: 'cancelled',
            rotation: {
              actorQueuePosition: 1,
              otherTeamRequeued: true,
              appliedAt: '2026-08-17T00:00:00.000Z',
            },
          }
      : null,
  }
}

function submittedResult() {
  return {
    kind: 'submitted' as const,
    resultVersion: 1,
    statsVersion: 1,
    payloadHash: 'a'.repeat(64),
    submitterRole: 'captain' as const,
    side0Score: 11,
    side1Score: 8,
    note: null,
    submittedAt: '2026-08-17T00:00:00.000Z',
    stats: [],
    approvals: {
      side0: false,
      side1: false,
      approvedCount: 0 as const,
      requiredCount: 2 as const,
      actorApproved: false,
    },
  }
}
