import { act, createElement, Fragment } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { homeWalletSnapshotQueryKey } from '@/lib/wallet/homeWalletSnapshot'
import { useAccountRealtime } from './useAccountRealtime'

const mocks = vi.hoisted(() => ({
  channel: vi.fn(),
  removeChannel: vi.fn(),
}))

type RealtimeCallback = (payload: { new: Record<string, unknown> }) => void

type RealtimeChannel = {
  on: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
}

const channels = new Map<string, RealtimeChannel>()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  },
}))

let queryClient: QueryClient
let root: Root | undefined

describe('useAccountRealtime Home wallet snapshots', () => {
  beforeEach(() => {
    installFakeDom()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    channels.clear()
    mocks.channel.mockReset().mockImplementation((topic: string) => {
      const channel: RealtimeChannel = {
        on: vi.fn(),
        subscribe: vi.fn(),
      }
      channel.on.mockImplementation((_event: string, _filter: unknown, _callback: RealtimeCallback) => channel)
      channel.subscribe.mockReturnValue(channel)
      channels.set(topic, channel)
      return channel
    })
    mocks.removeChannel.mockReset()
  })

  afterEach(async () => {
    if (root) await act(async () => root!.unmount())
    root = undefined
    queryClient.clear()
    channels.clear()
  })

  it('invalidates only the changed actor Home snapshot without replacing its cached balance', async () => {
    queryClient.setQueryData(homeWalletSnapshotQueryKey('actor-a'), { available_spendable: 50 })
    queryClient.setQueryData(homeWalletSnapshotQueryKey('actor-b'), { available_spendable: 75 })
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const setQueryData = vi.spyOn(queryClient, 'setQueryData')

    await renderAccounts(['actor-a', 'actor-b'])
    const callback = channels.get('account:actor-a')!.on.mock.calls[0]?.[2] as RealtimeCallback
    callback({
      new: {
        user_id: 'actor-a',
        type: 'daily_checkin',
        score_after: 110,
        spendable_after: 60,
      },
    })

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['home-wallet-snapshot', 'actor-a'],
    })
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ['home-wallet-snapshot', 'actor-b'],
    })
    expect(queryClient.getQueryData(homeWalletSnapshotQueryKey('actor-a'))).toEqual({ available_spendable: 50 })
    expect(queryClient.getQueryData(homeWalletSnapshotQueryKey('actor-b'))).toEqual({ available_spendable: 75 })
    expect(setQueryData.mock.calls.some(([queryKey]) => (
      Array.isArray(queryKey) && queryKey[0] === 'home-wallet-snapshot'
    ))).toBe(false)
  })

  it('shares one actor listener and removes it only after its final hook unmounts', async () => {
    await renderAccounts(['actor-a', 'actor-a'])
    const channel = channels.get('account:actor-a')

    expect(mocks.channel).toHaveBeenCalledTimes(1)
    expect(channel).toBeDefined()

    await renderAccounts(['actor-a'])
    expect(mocks.removeChannel).not.toHaveBeenCalled()

    await act(async () => root!.unmount())
    root = undefined
    expect(mocks.removeChannel).toHaveBeenCalledWith(channel)
  })
})

async function renderAccounts(userIds: string[]) {
  if (!root) root = createRoot(createFakeNode('DIV') as unknown as Element)

  await act(async () => {
    root!.render(createElement(QueryClientProvider, { client: queryClient },
      createElement(Fragment, null, userIds.map((userId, index) => (
        createElement(AccountRealtimeHarness, { key: `${userId}-${index}`, userId })
      ))),
    ))
  })
}

function AccountRealtimeHarness({ userId }: { userId: string }) {
  useAccountRealtime(userId)
  return null
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
