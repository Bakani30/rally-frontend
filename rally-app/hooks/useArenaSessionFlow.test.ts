import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider, QueryObserver, onlineManager } from '@tanstack/react-query'

import * as arenaSessionFlowModule from './useArenaSessionFlow'
import type { ArenaSessionSnapshot } from '@/types/arenaSession'
import {
  ARENA_TEAM_PARTICIPATION_MUTATION_POLICY,
  getArenaSessionSnapshotQueryOptions,
  refreshArenaSessionActorSnapshot,
  subscribeToArenaSessionRealtime,
  subscribeToArenaSessionReconnect,
  useArenaSessionFlow,
} from './useArenaSessionFlow'

const mocks = vi.hoisted(() => ({
  getSnapshot: vi.fn(),
  recordPresence: vi.fn(),
  ready: vi.fn(),
  action: vi.fn(),
  chooseTeamParticipation: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
}))

const realtimeChannel = {
  on: vi.fn(),
  subscribe: vi.fn(),
}

let queryClient: QueryClient
let root: Root | undefined
let current: ReturnType<typeof useArenaSessionFlow> | undefined

vi.mock('@/lib/arena-sessions/arenaSessionRepository', () => ({
  getArenaSessionSnapshot: mocks.getSnapshot,
  invokeArenaSessionAction: mocks.action,
}))

vi.mock('@/lib/arena-sessions/arenaSessionActions', () => ({
  arenaSessionActions: {
    create: mocks.action,
    recordPresence: mocks.recordPresence,
    open: mocks.action,
    stageParty: mocks.action,
    leave: mocks.action,
    beginDrain: mocks.action,
    close: mocks.action,
    updateStakeProposal: mocks.action,
    confirmFinalStake: mocks.action,
    startRound: mocks.action,
    chooseTeamParticipation: mocks.chooseTeamParticipation,
  },
}))

vi.mock('@/lib/arenas/arenaRepository', () => ({
  advanceArenaQueue: mocks.action,
  reorderArenaSessionQueue: mocks.action,
  readyArenaTeamMember: mocks.ready,
}))

vi.mock('expo-crypto', () => ({
  randomUUID: vi.fn(() => 'arena-session-create-attempt'),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  },
}))

describe('useArenaSessionFlow snapshot query boundary', () => {
  beforeEach(() => {
    installFakeDom()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    mocks.getSnapshot.mockReset().mockResolvedValue(snapshot)
    mocks.recordPresence.mockReset()
    mocks.ready.mockReset()
    mocks.action.mockReset()
    mocks.chooseTeamParticipation.mockReset().mockResolvedValue(teamParticipationResult())
    mocks.channel.mockReset().mockReturnValue(realtimeChannel)
    mocks.removeChannel.mockReset()
    realtimeChannel.on.mockReset().mockReturnValue(realtimeChannel)
    realtimeChannel.subscribe.mockReset()
    onlineManager.setOnline(true)
  })

  afterEach(async () => {
    if (root) await act(async () => root!.unmount())
    root = undefined
    current = undefined
    queryClient.unmount()
    queryClient.clear()
    onlineManager.setOnline(true)
  })

  it('refetches the snapshot on offline-to-online reconnect without retrying actions', async () => {
    queryClient.mount()
    const options = getArenaSessionSnapshotQueryOptions('user-a', 'arena-1')
    const observer = new QueryObserver(queryClient, options)
    const unsubscribe = observer.subscribe(() => {})

    try {
      await waitForCallCount(mocks.getSnapshot, 1)
      await waitForCondition(() => observer.getCurrentResult().status === 'success')
      expect(options.refetchOnReconnect).toBe(true)

      onlineManager.setOnline(false)
      await queryClient.invalidateQueries({
        queryKey: options.queryKey,
        refetchType: 'none',
      })
      expect(onlineManager.isOnline()).toBe(false)
      expect(queryClient.getQueryCache().find({ queryKey: options.queryKey })?.state.isInvalidated).toBe(true)
      onlineManager.setOnline(true)

      await waitForCallCount(mocks.getSnapshot, 2)
      expect(mocks.getSnapshot).toHaveBeenCalledTimes(2)
      expect(mocks.recordPresence).not.toHaveBeenCalled()
      expect(mocks.ready).not.toHaveBeenCalled()
    } finally {
      unsubscribe()
    }
  })

  it('isolates the same arena snapshot cache by authenticated user without changing the GET input', async () => {
    const userASnapshot = { ...snapshot, actor: { ...snapshot.actor, role: 'host' as const } }
    const userBSnapshot = { ...snapshot, actor: { ...snapshot.actor, role: 'observer' as const } }
    mocks.getSnapshot
      .mockResolvedValueOnce(userASnapshot)
      .mockResolvedValueOnce(userBSnapshot)

    const userAOptions = getArenaSessionSnapshotQueryOptions('user-a', 'arena-1')
    const userBOptions = getArenaSessionSnapshotQueryOptions('user-b', 'arena-1')
    const userAObserver = new QueryObserver(queryClient, userAOptions)
    const userBObserver = new QueryObserver(queryClient, userBOptions)
    const unsubscribeA = userAObserver.subscribe(() => {})
    const unsubscribeB = userBObserver.subscribe(() => {})

    try {
      await waitForCondition(() => (
        userAObserver.getCurrentResult().status === 'success'
        && userBObserver.getCurrentResult().status === 'success'
      ))

      expect(userAOptions.queryKey).not.toEqual(userBOptions.queryKey)
      expect(userAObserver.getCurrentResult().data?.actor.role).toBe('host')
      expect(userBObserver.getCurrentResult().data?.actor.role).toBe('observer')
      expect(mocks.getSnapshot).toHaveBeenNthCalledWith(1, 'arena-1')
      expect(mocks.getSnapshot).toHaveBeenNthCalledWith(2, 'arena-1')
    } finally {
      unsubscribeA()
      unsubscribeB()
    }
  })

  it('sets reconnecting only across an offline-to-online transition and clears after refetch', async () => {
    let resolveRefetch!: () => void
    const refetch = vi.fn(() => new Promise<void>((resolve) => {
      resolveRefetch = resolve
    }))
    const onReconnectingChange = vi.fn()
    const unsubscribe = subscribeToArenaSessionReconnect({
      onReconnect: refetch,
      onReconnectingChange,
      isEnabled: () => true,
    })

    try {
      onlineManager.setOnline(false)
      onlineManager.setOnline(true)

      await waitForCondition(() => refetch.mock.calls.length === 1)
      expect(onReconnectingChange).toHaveBeenNthCalledWith(1, true)

      resolveRefetch()
      await waitForCondition(() => onReconnectingChange.mock.calls.length === 2)
      expect(onReconnectingChange).toHaveBeenNthCalledWith(2, false)
    } finally {
      unsubscribe()
    }
  })

  it('replaces stale Round authority with the reconnect snapshot without replaying actions', async () => {
    queryClient.mount()
    mocks.getSnapshot
      .mockResolvedValueOnce(roundSnapshot('ready_to_start'))
      .mockResolvedValue(roundSnapshot('active'))
    const options = getArenaSessionSnapshotQueryOptions('user-a', 'arena-1')
    const observer = new QueryObserver(queryClient, options)
    const unsubscribe = observer.subscribe(() => {})

    try {
      await waitForCondition(() => observer.getCurrentResult().data?.liveRound?.phase === 'ready_to_start')
      onlineManager.setOnline(false)
      await queryClient.invalidateQueries({ queryKey: options.queryKey, refetchType: 'none' })
      onlineManager.setOnline(true)

      await waitForCondition(() => observer.getCurrentResult().data?.liveRound?.phase === 'active')
      expect(observer.getCurrentResult().data?.actor.roundState?.capabilities.canStartRound).toBe(false)
      expect(mocks.action).not.toHaveBeenCalled()
      expect(mocks.recordPresence).not.toHaveBeenCalled()
      expect(mocks.ready).not.toHaveBeenCalled()
    } finally {
      unsubscribe()
    }
  })

  it('subscribes to the exact safe Arena revision channel and preserves safe subscriptions', () => {
    const onInvalidate = vi.fn()
    const unsubscribe = subscribeToArenaSessionRealtime({
      userId: 'user-a',
      arenaId: 'arena-1',
      onInvalidate,
    })

    expect(mocks.channel).toHaveBeenCalledWith('arena-session-snapshot:user-a:arena-1')
    expect(realtimeChannel.on.mock.calls.map(([event, config]) => [event, config])).toEqual([
      [
        'postgres_changes',
        { event: '*', schema: 'public', table: 'arena_events', filter: 'id=eq.arena-1' },
      ],
      [
        'postgres_changes',
        { event: '*', schema: 'public', table: 'arena_teams', filter: 'arena_id=eq.arena-1' },
      ],
      [
        'postgres_changes',
        { event: '*', schema: 'public', table: 'arena_team_members', filter: 'arena_id=eq.arena-1' },
      ],
      [
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'arena_realtime_revisions',
          filter: 'arena_id=eq.arena-1',
        },
      ],
    ])
    expect(realtimeChannel.on.mock.calls.every(([, , callback]) => callback === onInvalidate)).toBe(true)
    expect(realtimeChannel.on.mock.calls.some(([, config]) => config.table === 'arena_rounds')).toBe(false)

    const statusCallback = realtimeChannel.subscribe.mock.calls[0]?.[0] as (status: string) => void
    statusCallback('SUBSCRIBED')
    expect(onInvalidate).toHaveBeenCalledTimes(1)

    unsubscribe()
    expect(mocks.removeChannel).toHaveBeenCalledWith(realtimeChannel)
  })

  it('never retries a team decision and invalidates plus refetches only its actor snapshot', async () => {
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const refetchQueries = vi.spyOn(queryClient, 'refetchQueries')

    await refreshArenaSessionActorSnapshot(queryClient, 'user-a', 'arena-1')

    expect(ARENA_TEAM_PARTICIPATION_MUTATION_POLICY).toEqual({
      retry: false,
      networkMode: 'always',
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['arena-session', 'snapshot', 'user-a', 'arena-1'],
      refetchType: 'none',
    })
    expect(refetchQueries).toHaveBeenCalledWith({
      queryKey: ['arena-session', 'snapshot', 'user-a', 'arena-1'],
      type: 'active',
    })
  })

  it('runs successful and idempotent decision callbacks and actively refreshes the exact actor snapshot', async () => {
    await renderFlow()
    const initialFetches = mocks.getSnapshot.mock.calls.length
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const refetchQueries = vi.spyOn(queryClient, 'refetchQueries')

    await act(async () => {
      await current!.chooseTeamParticipationMutation.mutateAsync(teamParticipationInput())
    })

    mocks.chooseTeamParticipation.mockResolvedValue({
      ...teamParticipationResult(),
      result: { ...teamParticipationResult().result, idempotent: true },
    })

    await act(async () => {
      await current!.chooseTeamParticipationMutation.mutateAsync(teamParticipationInput())
    })

    await waitForCondition(() => mocks.getSnapshot.mock.calls.length >= initialFetches + 2)
    expect(mocks.chooseTeamParticipation).toHaveBeenCalledTimes(2)
    expect(refetchQueries).toHaveBeenCalledTimes(2)
    expectExactActorRefresh(invalidateQueries, refetchQueries)
  })

  it('runs the stable conflict error callback once and actively refreshes the exact actor snapshot', async () => {
    await renderFlow()
    const initialFetches = mocks.getSnapshot.mock.calls.length
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const refetchQueries = vi.spyOn(queryClient, 'refetchQueries')
    const conflict = { code: 'arena_team_participation_cycle_conflict', message: 'do not branch on this' }
    mocks.chooseTeamParticipation.mockRejectedValue(conflict)

    await act(async () => {
      await expect(current!.chooseTeamParticipationMutation.mutateAsync(teamParticipationInput()))
        .rejects.toBe(conflict)
    })

    await waitForCondition(() => mocks.getSnapshot.mock.calls.length > initialFetches)
    expect(mocks.chooseTeamParticipation).toHaveBeenCalledTimes(1)
    expect(refetchQueries).toHaveBeenCalledTimes(1)
    expectExactActorRefresh(invalidateQueries, refetchQueries)
  })

  it('does not refetch an inactive or cross-actor snapshot when the decision settles after unmount', async () => {
    await renderFlow()
    queryClient.setQueryData(
      ['arena-session', 'snapshot', 'user-b', 'arena-1'],
      { actor: 'other-user-cache' },
    )
    const initialFetches = mocks.getSnapshot.mock.calls.length
    const refetchQueries = vi.spyOn(queryClient, 'refetchQueries')
    let resolveDecision!: (value: ReturnType<typeof teamParticipationResult>) => void
    mocks.chooseTeamParticipation.mockImplementationOnce(() => new Promise((resolve) => {
      resolveDecision = resolve
    }))

    let pending!: Promise<unknown>
    await act(async () => {
      pending = current!.chooseTeamParticipationMutation.mutateAsync(teamParticipationInput())
      await Promise.resolve()
    })
    await act(async () => root!.unmount())
    root = undefined

    await act(async () => {
      resolveDecision(teamParticipationResult())
      await pending
    })

    expect(mocks.chooseTeamParticipation).toHaveBeenCalledTimes(1)
    expect(mocks.getSnapshot).toHaveBeenCalledTimes(initialFetches)
    expect(refetchQueries).toHaveBeenCalledWith({
      queryKey: ['arena-session', 'snapshot', 'user-a', 'arena-1'],
      type: 'active',
    })
    expect(queryClient.getQueryData(['arena-session', 'snapshot', 'user-b', 'arena-1']))
      .toEqual({ actor: 'other-user-cache' })
  })

  it('settles each stake mutation with a no-retry exact actor refresh', async () => {
    await renderFlow()
    mocks.action.mockResolvedValue({ arenaId: 'arena-1' })
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const refetchQueries = vi.spyOn(queryClient, 'refetchQueries')
    const roundMutationPolicy = (arenaSessionFlowModule as Record<string, unknown>)
      .ARENA_ROUND_STAKE_MUTATION_POLICY

    expect(roundMutationPolicy).toEqual({ retry: false, networkMode: 'always' })

    await act(async () => {
      await current!.updateStakeProposalMutation.mutateAsync({
        roundId: 'round-1', amount: 40, expectedStakeVersion: 4,
      })
      await current!.confirmFinalStakeMutation.mutateAsync({
        roundId: 'round-1', stakeVersion: 4, maxLoss: 40,
      })
      await current!.startRoundMutation.mutateAsync({
        roundId: 'round-1', expectedStakeVersion: 4,
      })
    })

    const conflict = { code: 'arena_stake_confirmation_incomplete' }
    mocks.action.mockRejectedValueOnce(conflict)
    await act(async () => {
      await expect(current!.updateStakeProposalMutation.mutateAsync({
        roundId: 'round-1', amount: 40, expectedStakeVersion: 4,
      })).rejects.toBe(conflict)
    })
    mocks.action.mockRejectedValueOnce(conflict)
    await act(async () => {
      await expect(current!.confirmFinalStakeMutation.mutateAsync({
        roundId: 'round-1', stakeVersion: 4, maxLoss: 40,
      })).rejects.toBe(conflict)
    })
    mocks.action.mockRejectedValueOnce(conflict)
    await act(async () => {
      await expect(current!.startRoundMutation.mutateAsync({
        roundId: 'round-1', expectedStakeVersion: 4,
      })).rejects.toBe(conflict)
    })

    expect(mocks.action).toHaveBeenCalledTimes(6)
    expectExactActorRefresh(invalidateQueries, refetchQueries)
    expect(refetchQueries).toHaveBeenCalledTimes(6)
  })
})

async function renderFlow() {
  const container = createFakeNode('DIV')
  root = createRoot(container as unknown as Element)
  await act(async () => {
    root!.render(createElement(QueryClientProvider, { client: queryClient },
      createElement(ArenaSessionFlowHarness),
    ))
  })
  await act(async () => waitForCondition(() => current?.snapshotQuery.isSuccess === true))
}

function ArenaSessionFlowHarness() {
  current = useArenaSessionFlow({ userId: 'user-a', arenaId: 'arena-1' })
  return null
}

function expectExactActorRefresh(
  invalidateQueries: { mock: { calls: unknown[][] } },
  refetchQueries: { mock: { calls: unknown[][] } },
) {
  expect(invalidateQueries).toHaveBeenCalledWith({
    queryKey: ['arena-session', 'snapshot', 'user-a', 'arena-1'],
    refetchType: 'none',
  })
  expect(refetchQueries).toHaveBeenCalledWith({
    queryKey: ['arena-session', 'snapshot', 'user-a', 'arena-1'],
    type: 'active',
  })
}

async function waitForCallCount(
  mock: { mock: { calls: unknown[][] } },
  count: number,
) {
  await waitForCondition(() => mock.mock.calls.length >= count)
  expect(mock.mock.calls).toHaveLength(count)
}

async function waitForCondition(condition: () => boolean) {
  const deadline = Date.now() + 1_000
  while (!condition() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  expect(condition()).toBe(true)
}

const snapshot: ArenaSessionSnapshot = {
  serverTime: '2026-08-05T10:00:00.000Z',
  session: {
    arenaEventId: 'arena-1',
    sourceKind: 'ad_hoc',
    mode: 'casual',
    title: 'Saturday Court',
    activityType: 'basketball',
    teamSize: 3,
    joinMode: 'open',
    sessionState: 'open',
    openedAt: '2026-07-31T12:00:00.000Z',
    drainingAt: null,
    drainDeadlineAt: null,
    closedAt: null,
    cancelledAt: null,
    createdAt: '2026-07-31T12:00:00.000Z',
    updatedAt: '2026-07-31T12:00:00.000Z',
  },
  actor: {
    role: 'host',
    presenceStatus: 'valid',
    canJoin: false,
  },
  teamParticipation: { blocksPairing: false },
  teams: [],
  rounds: [],
  liveRound: null,
}

function roundSnapshot(
  phase: 'ready_to_start' | 'active',
): ArenaSessionSnapshot {
  const active = phase === 'active'
  return {
    ...snapshot,
    serverTime: active
      ? '2026-08-05T10:00:02.000Z'
      : '2026-08-05T10:00:00.000Z',
    actor: {
      ...snapshot.actor,
      roundState: {
        proposalAmount: 40,
        confirmed: true,
        capabilities: {
          isRoundCaptain: true,
          canEditOwnStake: !active,
          canConfirmStake: !active,
          canStartRound: false,
        },
      },
    },
    liveRound: {
      roundId: 'round-1',
      status: active ? 'in_progress' : 'stake_acceptance',
      phase,
      stake: {
        version: 4,
        courtAvailableAt: '2026-08-05T09:55:00.000Z',
        confirmationDeadlineAt: '2026-08-05T10:05:00.000Z',
        confirmedCount: 6,
        requiredCount: 6,
      },
      champion: { teamId: 'team-1', score: active ? 0 : null, members: [] },
      challenger: { teamId: 'team-2', score: active ? 0 : null, members: [] },
    },
  }
}

function teamParticipationInput() {
  return {
    arenaId: 'arena-1',
    participationCycleId: 'cycle-1',
    expectedRevision: 1,
    decision: 'continue' as const,
  }
}

function teamParticipationResult() {
  return {
    arenaId: 'arena-1',
    result: {
      participationCycleId: 'cycle-1',
      teamId: 'team-1',
      state: 'ready_to_pair' as const,
      revision: 2,
      decision: 'continue' as const,
      idempotent: false,
    },
  }
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
    ?? ({} as FakeDocument)
  return node
}
