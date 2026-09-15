import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  alert: vi.fn(),
  action: vi.fn(),
  channel: vi.fn(),
  create: vi.fn(),
  getSnapshot: vi.fn(),
  location: {
    warmStartLocation: null as { lat: number; lng: number } | null,
    isSearchingGps: false,
    error: null as string | null,
  },
  locationInputs: [] as Array<{ enabled: boolean }>,
  pressables: new Map<string, Record<string, unknown>>(),
  randomUUID: vi.fn(),
  realtimeChannel: {
    on: vi.fn(),
    subscribe: vi.fn(),
  },
  removeChannel: vi.fn(),
  replace: vi.fn(),
  textInputs: [] as Array<Record<string, unknown>>,
}))

vi.mock('react-native', () => ({
  ActivityIndicator: () => null,
  Alert: { alert: mocks.alert },
  Platform: {
    OS: 'ios',
    select: <T,>(spec: { ios?: T; android?: T; native?: T; default?: T }) => (
      spec.ios ?? spec.native ?? spec.default ?? spec.android
    ),
  },
  ScrollView: ({ children }: { children?: unknown }) => children ?? null,
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: () => null,
  TextInput: (props: Record<string, unknown>) => {
    mocks.textInputs.push(props)
    return null
  },
  View: ({ children }: { children?: unknown }) => children ?? null,
}))

vi.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: () => null,
}))

vi.mock('expo-crypto', () => ({
  randomUUID: mocks.randomUUID,
}))

vi.mock('expo-router', () => ({
  router: { back: vi.fn(), replace: mocks.replace },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({}),
}))

vi.mock('@/components/motion/PressableScale', () => ({
  PressableScale: (props: Record<string, unknown>) => {
    const label = props.accessibilityLabel
    if (typeof label === 'string') mocks.pressables.set(label, props)
    return null
  },
}))

vi.mock('@/components/layout/useScreenInsets', () => ({
  useScreenInsets: () => ({ paddingTop: 0, paddingBottom: 0 }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'host-1' } }),
}))

vi.mock('@/hooks/useParty', () => ({
  useMyParties: () => ({ data: [], isPending: false, error: null }),
}))

vi.mock('@/hooks/useRunLobbyLocation', () => ({
  useRunLobbyLocation: (input: { enabled: boolean }) => {
    mocks.locationInputs.push(input)
    return mocks.location
  },
}))

vi.mock('@/hooks/useAppTheme', () => ({
  useSportTheme: () => new Proxy({}, { get: () => '#000000' }),
}))

vi.mock('@/lib/arena-sessions/arenaSessionActions', () => ({
  arenaSessionActions: {
    create: mocks.create,
    recordPresence: mocks.action,
    open: mocks.action,
    stageParty: mocks.action,
    leave: mocks.action,
    beginDrain: mocks.action,
    close: mocks.action,
    updateStakeProposal: mocks.action,
    confirmFinalStake: mocks.action,
    startRound: mocks.action,
  },
}))

vi.mock('@/lib/arena-sessions/arenaSessionRepository', () => ({
  getArenaSessionSnapshot: mocks.getSnapshot,
}))

vi.mock('@/lib/arenas/arenaRepository', () => ({
  advanceArenaQueue: mocks.action,
  readyArenaTeamMember: mocks.action,
  reorderArenaSessionQueue: mocks.action,
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  },
}))

vi.mock('@/lib/party/partyService', () => ({
  getHostedPartiesForArenaSession: () => [],
  selectPartyForArenaSession: () => undefined,
}))

import NewArenaSessionScreen from '@/app/arena-session/new'

let root: Root | undefined
let queryClient: QueryClient

describe('NewArenaSessionScreen create attempt', () => {
  beforeEach(() => {
    installFakeDom()
    mocks.alert.mockReset()
    mocks.action.mockReset()
    mocks.channel.mockReset().mockReturnValue(mocks.realtimeChannel)
    mocks.create.mockReset()
    mocks.getSnapshot.mockReset().mockImplementation(() => new Promise<never>(() => undefined))
    mocks.location = { warmStartLocation: null, isSearchingGps: false, error: null }
    mocks.locationInputs.length = 0
    mocks.pressables.clear()
    mocks.replace.mockReset()
    mocks.randomUUID.mockReset().mockReturnValue('create-attempt-key')
    mocks.realtimeChannel.on.mockReset().mockReturnValue(mocks.realtimeChannel)
    mocks.realtimeChannel.subscribe.mockReset()
    mocks.removeChannel.mockReset()
    mocks.textInputs.length = 0
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
  })

  afterEach(async () => {
    if (root) {
      await act(async () => root!.unmount())
    }
    root = undefined
    queryClient.clear()
  })

  it('freezes the actual create screen and sends one request through a success rerender before router replacement commits', async () => {
    let resolveCreate!: (output: { resourceId: string; result: { arenaEventId: string } }) => void
    mocks.create.mockImplementation(() => new Promise<{ resourceId: string; result: { arenaEventId: string } }>((resolve) => {
      resolveCreate = resolve
    }))

    await renderScreen()
    await press('สร้าง Arena Session')

    expect(mocks.create).not.toHaveBeenCalled()
    expectFrozenControls()
    expect(mocks.locationInputs.at(-1)).toEqual({ enabled: true })

    mocks.location = {
      warmStartLocation: { lat: 13.7563, lng: 100.5018 },
      isSearchingGps: false,
      error: null,
    }
    await renderScreen()
    await waitFor(() => mocks.create.mock.calls.length === 1)
    expect(mocks.create).toHaveBeenCalledWith({
      idempotencyKey: 'create-attempt-key',
      title: 'Saturday Court',
      activityType: 'basketball',
      teamSize: 3,
      ruleText: 'Casual Arena Session',
      targetScore: 11,
      timeLimitSeconds: 600,
      joinMode: 'open',
      mode: 'casual',
      anchorLat: 13.7563,
      anchorLng: 100.5018,
    })
    expectFrozenControls()

    await act(async () => {
      resolveCreate({ resourceId: 'arena-created', result: { arenaEventId: 'arena-created' } })
      await Promise.resolve()
      await Promise.resolve()
    })
    await waitFor(() => mocks.replace.mock.calls.length === 1)

    // Expo Router has not unmounted the source screen yet. A rerender with the
    // resolved GPS value must observe the success latch, keep controls frozen,
    // and never start a second create mutation.
    await renderScreen()
    expectFrozenControls()
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.replace).toHaveBeenCalledWith({
      pathname: '/arena-session/[id]',
      params: { id: 'arena-created' },
    })
  })
})

async function renderScreen() {
  mocks.pressables.clear()
  mocks.textInputs.length = 0
  if (!root) {
    root = createRoot(createFakeNode('DIV') as unknown as Element)
  }
  await act(async () => {
    root!.render(createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(NewArenaSessionScreen),
    ))
  })
}

async function press(accessibilityLabel: string) {
  const props = mocks.pressables.get(accessibilityLabel)
  expect(props, `available: ${[...mocks.pressables.keys()].join(', ')}`).toBeDefined()
  const onPress = props?.onPress
  expect(typeof onPress).toBe('function')
  await act(async () => {
    ;(onPress as () => void)()
  })
}

function expectFrozenControls() {
  expect(mocks.pressables.get('กลับ')?.disabled).toBe(true)
  expect(mocks.pressables.get('basketball')?.disabled).toBe(true)
  expect(mocks.pressables.get('badminton')?.disabled).toBe(true)
  expect(mocks.pressables.get('1 คนต่อทีม')?.disabled).toBe(true)
  expect(mocks.pressables.get('สร้าง Arena Session')?.disabled).toBe(true)
  expect(mocks.textInputs.length).toBeGreaterThan(0)
  expect(mocks.textInputs.at(-1)?.editable).toBe(false)
}

async function waitFor(condition: () => boolean) {
  const deadline = Date.now() + 1_000
  while (!condition() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  expect(condition()).toBe(true)
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
  node.ownerDocument = (globalThis as unknown as { document?: FakeDocument }).document
    ?? ({} as FakeDocument)
  return node
}
