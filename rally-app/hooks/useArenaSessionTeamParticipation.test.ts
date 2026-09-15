import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ArenaSessionSnapshot } from '@/types/arenaSession'
import {
  ARENA_TEAM_PARTICIPATION_MUTATION_POLICY,
  useArenaSessionFlow,
} from './useArenaSessionFlow'

const mocks = vi.hoisted(() => ({
  getSnapshot: vi.fn(),
  action: vi.fn(),
  chooseTeamParticipation: vi.fn(),
  ready: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
}))

const realtimeChannel = {
  on: vi.fn(),
  subscribe: vi.fn(),
}

vi.mock('@/lib/arena-sessions/arenaSessionRepository', () => ({
  getArenaSessionSnapshot: mocks.getSnapshot,
  invokeArenaSessionAction: mocks.action,
}))

vi.mock('@/lib/arena-sessions/arenaSessionActions', () => ({
  arenaSessionActions: {
    create: mocks.action,
    recordPresence: mocks.action,
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

let queryClient: QueryClient
let root: Root | undefined
let current: ReturnType<typeof useArenaSessionFlow> | undefined

describe('useArenaSessionFlow team participation mutation', () => {
  beforeEach(() => {
    installFakeDom()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    mocks.getSnapshot.mockReset().mockResolvedValue(snapshot)
    mocks.action.mockReset()
    mocks.ready.mockReset()
    mocks.chooseTeamParticipation.mockReset().mockResolvedValue(teamParticipationResult())
    mocks.channel.mockReset().mockReturnValue(realtimeChannel)
    mocks.removeChannel.mockReset()
    realtimeChannel.on.mockReset().mockReturnValue(realtimeChannel)
    realtimeChannel.subscribe.mockReset()
  })

  afterEach(async () => {
    if (root) await act(async () => root!.unmount())
    root = undefined
    current = undefined
    queryClient.clear()
    onlineManager.setOnline(true)
  })

  it('disables retries and refreshes the exact actor snapshot after successful and idempotent decisions', async () => {
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

    await waitFor(() => mocks.getSnapshot.mock.calls.length >= initialFetches + 2)
    expect(ARENA_TEAM_PARTICIPATION_MUTATION_POLICY).toEqual({ retry: false, networkMode: 'always' })
    expect(mocks.chooseTeamParticipation).toHaveBeenCalledTimes(2)
    expectExactActorRefresh(invalidateQueries, refetchQueries)
  })

  it('propagates a stable conflict once and refreshes the exact actor snapshot without replaying it', async () => {
    await renderFlow()
    const initialFetches = mocks.getSnapshot.mock.calls.length
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const refetchQueries = vi.spyOn(queryClient, 'refetchQueries')
    const conflict = { code: 'arena_team_participation_cycle_conflict' }
    mocks.chooseTeamParticipation.mockRejectedValue(conflict)

    await act(async () => {
      await expect(current!.chooseTeamParticipationMutation.mutateAsync(teamParticipationInput()))
        .rejects.toBe(conflict)
    })

    await waitFor(() => mocks.getSnapshot.mock.calls.length > initialFetches)
    expect(mocks.chooseTeamParticipation).toHaveBeenCalledTimes(1)
    expectExactActorRefresh(invalidateQueries, refetchQueries)
  })

  it('fails or succeeds immediately while offline and never replays a decision after reconnect', async () => {
    await renderFlow()
    const initialDecisionCalls = mocks.chooseTeamParticipation.mock.calls.length
    await act(async () => { onlineManager.setOnline(false) })

    await act(async () => {
      await current!.chooseTeamParticipationMutation.mutateAsync(teamParticipationInput())
    })

    expect(mocks.chooseTeamParticipation).toHaveBeenCalledTimes(initialDecisionCalls + 1)
    await act(async () => {
      onlineManager.setOnline(true)
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
    expect(mocks.chooseTeamParticipation).toHaveBeenCalledTimes(initialDecisionCalls + 1)
  })

  it('does not refetch inactive or cross-actor snapshots when a decision settles after unmount', async () => {
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
})

async function renderFlow() {
  const container = createFakeNode('DIV')
  root = createRoot(container as unknown as Element)
  await act(async () => {
    root!.render(createElement(QueryClientProvider, { client: queryClient },
      createElement(ArenaSessionFlowHarness),
    ))
  })
  await act(async () => waitFor(() => current?.snapshotQuery.isSuccess === true))
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

async function waitFor(condition: () => boolean) {
  const deadline = Date.now() + 1_000
  while (!condition() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  expect(condition()).toBe(true)
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

const snapshot: ArenaSessionSnapshot = {
  session: {
    arenaEventId: 'arena-1',
    sourceKind: 'ad_hoc',
    mode: 'casual',
    title: 'Court',
    activityType: 'basketball',
    teamSize: 3,
    joinMode: 'open',
    sessionState: 'open',
    openedAt: null,
    drainingAt: null,
    drainDeadlineAt: null,
    closedAt: null,
    cancelledAt: null,
    createdAt: '2026-08-24T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
  },
  actor: {
    role: 'member',
    presenceStatus: 'valid',
    canJoin: false,
    canOpen: false,
    canRecordPresence: false,
  },
  teamParticipation: { blocksPairing: false },
  teams: [],
  rounds: [],
  liveRound: null,
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
