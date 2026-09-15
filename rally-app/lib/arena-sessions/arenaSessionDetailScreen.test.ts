import { act, createElement, startTransition, Suspense } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type HostControlsProps = {
  visible: boolean
  canOpen: boolean
  canAdvance: boolean
  canReorder: boolean
  canBeginDrain: boolean
  canClose: boolean
  onAdvanceQueue: () => void
  onReorderQueue: (input: { expectedTeamIds: string[]; orderedTeamIds: string[] }) => void
  onCloseSession: () => void
}

const mocks = vi.hoisted(() => ({
  flow: null as any,
  hostControls: [] as HostControlsProps[],
  pressables: new Map<string, Record<string, unknown>>(),
  alert: vi.fn(),
  suspendBoardRender: false,
  suspendedRender: null as Promise<never> | null,
  routeParams: { id: 'arena-1' } as { id?: string },
  user: { id: 'host-1' } as { id: string } | null,
}))

vi.mock('react-native', () => ({
  Alert: { alert: mocks.alert },
  Platform: { select: <T,>(values: { ios?: T; android?: T; default?: T }) => values.ios ?? values.default ?? values.android },
  StyleSheet: { create: <T,>(styles: T) => styles },
  View: ({ children }: { children?: unknown }) => children ?? null,
}))

vi.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: () => null }))
vi.mock('expo-router', () => ({
  router: { back: vi.fn(), canGoBack: () => true, push: vi.fn(), replace: vi.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mocks.routeParams,
}))
vi.mock('@/components/layout/useScreenInsets', () => ({ useScreenInsets: () => ({ paddingTop: 0 }) }))
vi.mock('@/components/motion/PressableScale', () => ({
  PressableScale: (props: Record<string, unknown>) => {
    const label = props.accessibilityLabel
    if (typeof label === 'string') mocks.pressables.set(label, props)
    return null
  },
}))
vi.mock('@/components/arena-session/ArenaSessionBoard', () => ({
  ArenaSessionBoard: () => {
    if (mocks.suspendBoardRender && mocks.suspendedRender) throw mocks.suspendedRender
    return null
  },
}))
vi.mock('@/components/arena-session/ArenaSessionHostControlsSheet', () => ({
  ArenaSessionHostControlsSheet: (props: HostControlsProps) => {
    mocks.hostControls.push(props)
    return null
  },
}))
vi.mock('@/hooks/useAppTheme', () => ({ useSportTheme: () => new Proxy({}, { get: () => '#000000' }) }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }))
vi.mock('@/hooks/useParty', () => ({
  useMyParties: () => ({ data: [], error: null, refetch: vi.fn() }),
  useParty: () => ({ partyQuery: { data: null, error: null, refetch: vi.fn() } }),
}))
vi.mock('@/hooks/useRunLobbyLocation', () => ({
  useRunLobbyLocation: () => ({ error: null, warmStartLocation: null }),
}))
vi.mock('@/hooks/useArenaSessionFlow', () => ({ useArenaSessionFlow: () => mocks.flow }))
vi.mock('@/lib/arena-sessions/arenaSessionService', () => ({
  mapArenaSessionSnapshot: () => ({ canOpen: false, canBeginDrain: false, canClose: false }),
}))
vi.mock('@/lib/arena-sessions/arenaTeamContinuation', () => ({
  getArenaTeamContinuationErrorCopy: () => 'error',
}))
vi.mock('@/lib/party/partyService', () => ({ selectPartyForArenaSession: () => null }))

let root: Root | undefined
let ArenaSessionDetailScreen: any

describe('ArenaSessionDetailScreen Host authority', () => {
  beforeEach(async () => {
    installFakeDom()
    const react = await import('react')
    Reflect.set(globalThis, 'React', react)
    ArenaSessionDetailScreen = (await import('@/app/arena-session/[id]')).default
    mocks.flow = flowSnapshot('host', 'arena-1')
    mocks.hostControls.length = 0
    mocks.pressables.clear()
    mocks.alert.mockReset()
    mocks.suspendBoardRender = false
    mocks.suspendedRender = null
    mocks.routeParams = { id: 'arena-1' }
    mocks.user = { id: 'host-1' }
  })

  afterEach(async () => {
    if (root) await act(async () => root!.unmount())
    root = undefined
  })

  it('keeps the non-Host trigger disabled and does not mount Host capabilities', async () => {
    mocks.flow = flowSnapshot('member', 'arena-1')

    await renderScreen()

    expect(mocks.pressables.get('จัดการสนาม')?.disabled).toBe(true)
    expect(mocks.hostControls).toEqual([])
  })

  it('lets the current Host emit the exact queue inputs', async () => {
    await renderScreen()
    await press('จัดการสนาม')

    const controls = latestControls()
    expect(controls.visible).toBe(true)
    expect(controls.canAdvance).toBe(true)
    expect(controls.canReorder).toBe(true)

    await act(async () => {
      controls.onAdvanceQueue()
      controls.onReorderQueue({ expectedTeamIds: ['team-1', 'team-2'], orderedTeamIds: ['team-2', 'team-1'] })
      await Promise.resolve()
    })

    expect(mocks.flow.advanceQueueMutation.mutateAsync).toHaveBeenCalledWith('arena-1')
    expect(mocks.flow.reorderQueueMutation.mutateAsync).toHaveBeenCalledWith({
      arenaId: 'arena-1',
      expectedTeamIds: ['team-1', 'team-2'],
      orderedTeamIds: ['team-2', 'team-1'],
    })
  })

  it('unmounts controls and fails closed for callbacks captured before Host authority is lost', async () => {
    await renderScreen()
    await press('จัดการสนาม')
    const controls = latestControls()
    const capturedAdvance = controls.onAdvanceQueue
    const capturedReorder = controls.onReorderQueue
    const renderedControls = mocks.hostControls.length

    mocks.flow.snapshot = snapshot('member', 'arena-1')
    await renderScreen()

    expect(mocks.pressables.get('จัดการสนาม')?.disabled).toBe(true)
    expect(mocks.hostControls).toHaveLength(renderedControls)

    await act(async () => {
      capturedAdvance()
      capturedReorder({ expectedTeamIds: ['team-1', 'team-2'], orderedTeamIds: ['team-2', 'team-1'] })
      await Promise.resolve()
    })

    expect(mocks.flow.advanceQueueMutation.mutateAsync).not.toHaveBeenCalled()
    expect(mocks.flow.reorderQueueMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('unmounts controls and rejects callbacks captured for the previous Arena target', async () => {
    await renderScreen()
    await press('จัดการสนาม')
    const controls = latestControls()
    const capturedAdvance = controls.onAdvanceQueue
    const renderedControls = mocks.hostControls.length

    mocks.routeParams = { id: 'arena-2' }
    mocks.flow.snapshot = snapshot('host', 'arena-2')
    await renderScreen()

    expect(mocks.hostControls).toHaveLength(renderedControls)

    await act(async () => {
      capturedAdvance()
      await Promise.resolve()
    })

    expect(mocks.flow.advanceQueueMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('revokes captured queue and close callbacks when the route unmounts', async () => {
    await renderScreen()
    await press('จัดการสนาม')
    const controls = latestControls()
    const capturedAdvance = controls.onAdvanceQueue
    const capturedReorder = controls.onReorderQueue

    await act(async () => controls.onCloseSession())
    const confirmation = mocks.alert.mock.calls[0]?.[2]?.[1]?.onPress
    expect(confirmation).toEqual(expect.any(Function))

    await act(async () => root!.unmount())
    root = undefined

    await act(async () => {
      capturedAdvance()
      capturedReorder({ expectedTeamIds: ['team-1', 'team-2'], orderedTeamIds: ['team-2', 'team-1'] })
      confirmation()
      await Promise.resolve()
    })

    expect(mocks.flow.advanceQueueMutation.mutateAsync).not.toHaveBeenCalled()
    expect(mocks.flow.reorderQueueMutation.mutateAsync).not.toHaveBeenCalled()
    expect(mocks.flow.closeMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('keeps committed Host callbacks authorized while a member render suspends before commit', async () => {
    await renderScreen()
    await press('จัดการสนาม')
    const capturedAdvance = latestControls().onAdvanceQueue

    mocks.flow.snapshot = snapshot('member', 'arena-1')
    mocks.suspendBoardRender = true
    mocks.suspendedRender = new Promise<never>(() => undefined)
    await act(async () => {
      startTransition(() => {
        root!.render(screenElement())
      })
      await Promise.resolve()
    })

    await act(async () => {
      capturedAdvance()
      await Promise.resolve()
    })

    expect(mocks.flow.advanceQueueMutation.mutateAsync).toHaveBeenCalledWith('arena-1')
  })
})

async function renderScreen() {
  mocks.pressables.clear()
  if (!root) root = createRoot(createFakeNode('DIV') as unknown as Element)
  await act(async () => root!.render(screenElement()))
}

function screenElement() {
  return createElement(Suspense, { fallback: null }, createElement(ArenaSessionDetailScreen))
}

async function press(label: string) {
  const props = mocks.pressables.get(label)
  expect(props, `available: ${[...mocks.pressables.keys()].join(', ')}`).toBeDefined()
  expect(typeof props?.onPress).toBe('function')
  await act(async () => (props!.onPress as () => void)())
}

function latestControls() {
  const controls = mocks.hostControls.at(-1)
  expect(controls).toBeDefined()
  return controls!
}

function flowSnapshot(role: 'host' | 'member', arenaEventId: string) {
  const action = () => ({ isPending: false, mutateAsync: vi.fn().mockResolvedValue({}) })
  return {
    snapshot: snapshot(role, arenaEventId),
    snapshotQuery: { error: null, isFetching: false, refetch: vi.fn() },
    isReconnecting: false,
    openMutation: action(),
    readyMutation: action(),
    stagePartyMutation: action(),
    advanceQueueMutation: action(),
    reorderQueueMutation: action(),
    updateStakeProposalMutation: action(),
    confirmFinalStakeMutation: action(),
    startRoundMutation: action(),
    chooseTeamParticipationMutation: action(),
    leaveMutation: action(),
    beginDrainMutation: action(),
    closeMutation: action(),
    recordPresence: vi.fn(),
  }
}

function snapshot(role: 'host' | 'member', arenaEventId: string) {
  return {
    session: {
      arenaEventId,
      activityType: 'basketball',
      teamSize: 3,
      mode: 'casual',
      sessionState: 'open',
      drainDeadlineAt: null,
    },
    actor: { role, memberState: role === 'member' ? 'ready' : null },
    teams: [
      { teamId: 'team-1', name: 'One', status: 'queued', queuePosition: 1, members: [] },
      { teamId: 'team-2', name: 'Two', status: 'queued', queuePosition: 2, members: [] },
    ],
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
    removeChild(child: FakeNode) {
      node.childNodes = node.childNodes.filter((item) => item !== child)
      return child
    },
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
  node.ownerDocument = (globalThis as unknown as { document?: FakeDocument }).document ?? ({} as FakeDocument)
  return node
}
