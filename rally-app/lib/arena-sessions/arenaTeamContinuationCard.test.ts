import { act, createElement } from 'react'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  alert: vi.fn(),
  pressables: new Map<string, Record<string, unknown>>(),
}))

const theme = {
  orange: '#eb773c', orangeSoft: '#fff0e9', risk: '#c73f41', riskSoft: '#fbe9e9',
  trust: '#0fa968', trustSoft: '#e7f7f0', line: '#ddd', bgElevated: '#fff',
  surface: '#fafafa', ink: '#161616', inkSoft: '#444', muted: '#777',
} as const

vi.mock('react-native', async () => {
  const React = await import('react')
  return {
    Alert: { alert: mocks.alert },
    Platform: { select: <T,>(values: { ios?: T; android?: T; default?: T }) => values.ios ?? values.default ?? values.android },
    StyleSheet: { create: <T,>(styles: T) => styles },
    Text: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement('span', props, children),
    View: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement('div', props, children),
  }
})

vi.mock('@expo/vector-icons', async () => {
  const React = await import('react')
  return { MaterialCommunityIcons: () => React.createElement('i') }
})

vi.mock('@/components/motion/PressableScale', async () => {
  const React = await import('react')
  return {
    PressableScale: ({ children, accessibilityLabel: label, accessibilityRole: _role, accessibilityState: _state, onPress, ...props }: { children?: React.ReactNode; accessibilityLabel?: string; accessibilityRole?: string; accessibilityState?: unknown; onPress?: () => void }) => {
      if (label) mocks.pressables.set(label, { ...props, onPress, accessibilityLabel: label, accessibilityRole: _role, accessibilityState: _state })
      return React.createElement('button', { ...props, onClick: onPress, 'aria-label': label }, children)
    },
  }
})

import { ArenaTeamContinuationCard } from '@/components/arena-session/ArenaTeamContinuationCard'

describe('ArenaTeamContinuationCard', () => {
  let root: Root | undefined

  beforeEach(() => {
    installFakeDom()
    mocks.alert.mockReset()
    mocks.pressables.clear()
  })

  afterEach(async () => {
    if (root) await act(async () => root!.unmount())
    root = undefined
  })

  it('renders both captain actions for a server-authorized decision state', () => {
    const html = renderCard()
    expect(html).toContain('เล่นต่อ')
    expect(html).toContain('ถอนทีม')
    expect(html).toContain('กัปตันทีม')
  })

  it('renders no controls for a teammate awaiting the captain decision', () => {
    const html = renderCard({ capabilities: { canContinue: false, canRetire: false } })
    expect(html).toContain('รอกัปตันตัดสินใจ')
    expect(html).not.toContain('<button')
  })

  it('enables the captain decision in an unauthenticated local preview only through its callback', () => {
    const onDecision = vi.fn()
    const html = renderToStaticMarkup(React.createElement(ArenaTeamContinuationCard, {
      arenaId: 'preview-arena',
      actorId: 'preview-arena-actor',
      participation: participation(),
      theme: theme as never,
      onDecision,
    }))

    expect(html).toContain('เล่นต่อ')
    invokePress(getPressable('เล่นต่อในรอบถัดไป'))
    expect(onDecision).toHaveBeenCalledWith({
      arenaId: 'preview-arena',
      participationCycleId: 'cycle-1',
      expectedRevision: 1,
      decision: 'continue',
    })
  })

  it('keeps a preview actor read-only when server capabilities deny both decisions', () => {
    const html = renderToStaticMarkup(React.createElement(ArenaTeamContinuationCard, {
      arenaId: 'preview-arena',
      actorId: 'preview-arena-actor',
      participation: participation({ capabilities: { canContinue: false, canRetire: false } }),
      theme: theme as never,
      onDecision: vi.fn(),
    }))

    expect(html).toContain('รอกัปตันตัดสินใจ')
    expect(html).not.toContain('<button')
  })

  it('opens a destructive confirmation and invokes retire exactly once only after confirm', () => {
    const onDecision = vi.fn()
    const html = renderCard({}, onDecision)
    expect(html).toContain('ถอนทีม')

    const retireButton = getPressable('ถอนทีมจากรอบถัดไป')
    expect(retireButton.onPress).toBeTypeOf('function')
    invokePress(retireButton)
    expect(mocks.alert).toHaveBeenCalledTimes(1)
    const buttons = mocks.alert.mock.calls[0]?.[2] as Array<{ text: string; onPress?: () => void }>
    expect(buttons.find((button) => button.text === 'ยกเลิก')?.onPress).toBeUndefined()
    expect(onDecision).not.toHaveBeenCalled()
    buttons.find((button) => button.text === 'ถอนทีม')?.onPress?.()
    expect(onDecision).toHaveBeenCalledTimes(1)
    expect(onDecision).toHaveBeenCalledWith({
      arenaId: 'arena-1', participationCycleId: 'cycle-1', expectedRevision: 1, decision: 'retire',
    })
  })

  it('keeps only retire visible after the team continues and exposes pending accessibility state', () => {
    const html = renderToStaticMarkup(React.createElement(ArenaTeamContinuationCard, {
      arenaId: 'arena-1',
      actorId: 'user-a',
      participation: participation({ state: 'ready_to_pair', capabilities: { canContinue: false, canRetire: true } }),
      theme: theme as never,
      actionPending: true,
      onDecision: vi.fn(),
    }))
    expect(html).toContain('ทีมยืนยันเล่นต่อแล้ว')
    expect(html).toContain('ถอนทีม')
    expect(html).not.toContain('เล่นต่อ</span>')
    const retireButton = getPressable('ถอนทีมจากรอบถัดไป')
    expect(retireButton.disabled).toBe(true)
    expect(retireButton.accessibilityState).toEqual({ disabled: true, busy: true })
    expect(minHeight(retireButton.style)).toBeGreaterThanOrEqual(44)
  })

  it('marks both captain controls as accessible buttons with minimum touch targets', () => {
    renderCard()
    for (const label of ['เล่นต่อในรอบถัดไป', 'ถอนทีมจากรอบถัดไป']) {
      const control = getPressable(label)
      expect(control.disabled).toBe(false)
      expect(control.accessibilityRole).toBe('button')
      expect(control.accessibilityState).toEqual({ disabled: false, busy: false })
      expect(minHeight(control.style)).toBeGreaterThanOrEqual(44)
    }
  })

  it('drops a retained native confirmation after the component unmounts', async () => {
    const onDecision = vi.fn()
    root = createRoot(createFakeNode('DIV') as unknown as Element)
    await act(async () => {
      root!.render(createElement(ArenaTeamContinuationCard, {
        arenaId: 'arena-1',
        actorId: 'user-a',
        participation: participation(),
        theme: theme as never,
        onDecision,
      }))
    })

    invokePress(getPressable('ถอนทีมจากรอบถัดไป'))
    const buttons = mocks.alert.mock.calls[0]?.[2] as Array<{ text: string; onPress?: () => void }>
    const confirm = buttons.find((button) => button.text === 'ถอนทีม')?.onPress
    expect(confirm).toBeTypeOf('function')

    await act(async () => root!.unmount())
    root = undefined
    confirm?.()
    expect(onDecision).not.toHaveBeenCalled()
  })

  it('drops a retained native confirmation after the actor changes', async () => {
    const onDecision = vi.fn()
    root = createRoot(createFakeNode('DIV') as unknown as Element)
    await act(async () => {
      root!.render(createElement(ArenaTeamContinuationCard, {
        arenaId: 'arena-1',
        actorId: 'user-a',
        participation: participation(),
        theme: theme as never,
        onDecision,
      }))
    })

    invokePress(getPressable('ถอนทีมจากรอบถัดไป'))
    const buttons = mocks.alert.mock.calls[0]?.[2] as Array<{ text: string; onPress?: () => void }>
    const confirm = buttons.find((button) => button.text === 'ถอนทีม')?.onPress

    await act(async () => {
      root!.render(createElement(ArenaTeamContinuationCard, {
        arenaId: 'arena-1',
        actorId: 'user-b',
        participation: participation(),
        theme: theme as never,
        onDecision,
      }))
    })
    confirm?.()
    expect(onDecision).not.toHaveBeenCalled()
  })
})

function renderCard(overrides: Partial<ReturnType<typeof participation>> = {}, onDecision = vi.fn()) {
  return renderToStaticMarkup(React.createElement(ArenaTeamContinuationCard, {
    arenaId: 'arena-1', actorId: 'user-a', participation: participation(overrides), theme: theme as never, onDecision,
  }))
}

function participation(overrides: Partial<{
  state: 'decision_required' | 'ready_to_pair'
  capabilities: { canContinue: boolean; canRetire: boolean }
}> = {}) {
  return {
    participationCycleId: 'cycle-1', teamId: 'team-1', lane: 'champion' as const,
    state: 'decision_required' as const, revision: 1, queuePosition: null,
    blocksPairing: true, capabilities: { canContinue: true, canRetire: true }, ...overrides,
  }
}

function getPressable(label: string): Record<string, unknown> {
  const control = mocks.pressables.get(label)
  expect(control, `available controls: ${[...mocks.pressables.keys()].join(', ')}`).toBeDefined()
  return control!
}

function invokePress(control: Record<string, unknown>) {
  const onPress = control.onPress
  if (typeof onPress !== 'function') throw new Error('expected press handler')
  onPress()
}

function minHeight(style: unknown): number | undefined {
  const styles = Array.isArray(style) ? style : [style]
  for (const entry of styles) {
    if (entry && typeof entry === 'object' && 'minHeight' in entry) {
      const value = (entry as { minHeight?: unknown }).minHeight
      if (typeof value === 'number') return value
    }
  }
  return undefined
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
