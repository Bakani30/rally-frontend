import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { homeWalletSnapshotQueryKey } from '@/lib/wallet/homeWalletSnapshot'
import { getUserWalletRecord } from '@/lib/wallet/walletRepository'
import type { UserWallet } from '@/lib/wallet/walletTypes'
import { useHomeWalletSnapshot } from './useHomeWalletSnapshot'

const mocks = vi.hoisted(() => ({
  useAccountRealtime: vi.fn(),
}))

vi.mock('@/hooks/useAccountRealtime', () => ({
  useAccountRealtime: mocks.useAccountRealtime,
}))

vi.mock('@/lib/wallet/walletRepository', () => ({
  getUserWalletRecord: vi.fn(),
}))

let queryClient: QueryClient
let root: Root | undefined
let current: ReturnType<typeof useHomeWalletSnapshot> | undefined

describe('useHomeWalletSnapshot', () => {
  beforeEach(() => {
    installFakeDom()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.mocked(getUserWalletRecord).mockReset().mockImplementation(async (userId) => wallet(userId, userId === 'actor-a' ? 23 : 41))
    mocks.useAccountRealtime.mockReset()
  })

  afterEach(async () => {
    if (root) await act(async () => root!.unmount())
    root = undefined
    current = undefined
    queryClient.clear()
  })

  it('uses a dedicated actor-scoped Home snapshot query key', async () => {
    expect(homeWalletSnapshotQueryKey('actor-a')).toEqual(['home-wallet-snapshot', 'actor-a'])

    await renderHook('actor-a')
    await renderHook('actor-b')

    expect(queryClient.getQueryData(homeWalletSnapshotQueryKey('actor-a'))).toEqual({ available_spendable: 23 })
    expect(queryClient.getQueryData(homeWalletSnapshotQueryKey('actor-b'))).toEqual({ available_spendable: 41 })
    expect(getUserWalletRecord).toHaveBeenNthCalledWith(1, 'actor-a')
    expect(getUserWalletRecord).toHaveBeenNthCalledWith(2, 'actor-b')
  })

  it('does not invoke an authenticated wallet read when its actor is undefined', async () => {
    await renderHook(undefined, false)

    expect(getUserWalletRecord).not.toHaveBeenCalled()
    expect(queryClient.getQueryCache().find({ queryKey: homeWalletSnapshotQueryKey(undefined) })?.options)
      .toMatchObject({ enabled: false, staleTime: 30_000 })
  })

  it('uses a thirty-second stale time for an authenticated Home snapshot', async () => {
    await renderHook('actor-a')

    expect(queryClient.getQueryCache().find({ queryKey: homeWalletSnapshotQueryKey('actor-a') })?.options)
      .toMatchObject({ enabled: true, staleTime: 30_000 })
  })
})

async function renderHook(userId: string | undefined, waitForSuccess = true) {
  if (root) await act(async () => root!.unmount())

  current = undefined
  root = createRoot(createFakeNode('DIV') as unknown as Element)
  await act(async () => {
    root!.render(createElement(QueryClientProvider, { client: queryClient },
      createElement(HomeWalletSnapshotHarness, { userId }),
    ))
  })
  if (waitForSuccess) await act(async () => waitFor(() => current?.isSuccess === true))
}

function HomeWalletSnapshotHarness({ userId }: { userId: string | undefined }) {
  current = useHomeWalletSnapshot(userId)
  return null
}

function wallet(userId: string, availableSpendable: number): UserWallet {
  return {
    user_id: userId,
    leaderboard_score: 100,
    spendable_points: availableSpendable,
    locked_points: 0,
    available_spendable: availableSpendable,
    credit_balance: 0,
    locked_credits: 0,
    available_credits: 0,
  }
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
