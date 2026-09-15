import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({
  alerts: [] as Array<{ buttons?: Array<{ text?: string; onPress?: () => void }> }>,
  inputs: [] as Array<{ editable?: boolean; onChangeText?: (value: string) => void }>,
  pressables: [] as Array<{ disabled?: boolean; onPress?: () => void; accessibilityLabel?: string }>,
}))

const pngRequireState = vi.hoisted(() => {
  if (typeof require === 'function') {
    const previous = require.extensions['.png']
    require.extensions['.png'] = (module) => {
      module.exports = 1
    }
    return { previous }
  }
  return null
})

afterAll(() => {
  if (typeof require !== 'function') return
  if (pngRequireState?.previous) {
    require.extensions['.png'] = pngRequireState.previous
  } else {
    delete require.extensions['.png']
  }
})

vi.mock('react-native', () => ({
  ActivityIndicator: ({ size }: { size?: string }) => React.createElement('i', { 'data-size': size }),
  Alert: { alert: (_title: string, _message: string, buttons: typeof harness.alerts[number]['buttons']) => harness.alerts.push({ buttons }) },
  Platform: {
    OS: 'ios',
    select: <T,>(values: { ios?: T; android?: T; native?: T; default?: T }) => values.ios ?? values.native ?? values.default ?? values.android,
  },
  Pressable: ({ children, disabled, onPress, accessibilityLabel, accessibilityRole: _role, accessibilityState: _state, ...props }: { children?: React.ReactNode; disabled?: boolean; onPress?: () => void; accessibilityLabel?: string; accessibilityRole?: string; accessibilityState?: unknown }) => {
    harness.pressables.push({ disabled, onPress, accessibilityLabel })
    return React.createElement('button', { ...props, disabled, onClick: onPress, 'aria-label': accessibilityLabel }, children)
  },
  ScrollView: ({ children, contentContainerStyle: _contentContainerStyle, ...props }: { children?: React.ReactNode; contentContainerStyle?: unknown }) => React.createElement('main', props, children),
  StyleSheet: { absoluteFill: {}, create: <T,>(styles: T) => styles, hairlineWidth: 1 },
  Text: ({ children, numberOfLines: _numberOfLines, accessibilityLabel: _accessibilityLabel, accessibilityRole: _accessibilityRole, accessibilityState: _accessibilityState, ...props }: { children?: React.ReactNode; numberOfLines?: number; accessibilityLabel?: string; accessibilityRole?: string; accessibilityState?: unknown }) => React.createElement('span', props, children),
  TextInput: ({ value, editable, onChangeText, keyboardType: _keyboardType, placeholderTextColor: _placeholderTextColor, accessibilityLabel: _accessibilityLabel, ...props }: { value?: string; editable?: boolean; onChangeText?: (value: string) => void; keyboardType?: string; placeholderTextColor?: string; accessibilityLabel?: string }) => {
    harness.inputs.push({ editable, onChangeText })
    return React.createElement('input', { ...props, value, readOnly: editable === false, onChange: (event: { target: { value: string } }) => onChangeText?.(event.target.value) })
  },
  View: ({ children, accessibilityRole: _accessibilityRole, accessibilityLabel: _accessibilityLabel, ...props }: { children?: React.ReactNode; accessibilityRole?: string; accessibilityLabel?: string }) => React.createElement('div', props, children),
  useColorScheme: () => 'light',
}))

vi.mock('expo-image', () => ({ Image: (props: Record<string, unknown>) => React.createElement('img', props) }))
vi.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: (props: Record<string, unknown>) => React.createElement('i', props) }))
vi.mock('react-native-svg', () => ({
  default: (props: Record<string, unknown>) => React.createElement('svg', props),
  Circle: (props: Record<string, unknown>) => React.createElement('circle', props),
  Line: (props: Record<string, unknown>) => React.createElement('line', props),
  Rect: (props: Record<string, unknown>) => React.createElement('rect', props),
}))
vi.mock('react-native-reanimated', () => ({
  default: { createAnimatedComponent: (component: unknown) => component },
  useAnimatedStyle: () => ({}),
  useSharedValue: (value: number) => ({ value }),
  withSpring: (value: number) => value,
  withTiming: (value: number) => value,
}))
vi.mock('@/components/layout/useScreenInsets', () => ({ useScreenInsets: () => ({ paddingTop: 0, paddingBottom: 0 }) }))
vi.mock('@/hooks/useAppTheme', () => ({ useSportTheme: () => new Proxy({}, { get: (_target, key) => key === 'blue' ? '#808bc3' : '#000000' }) }))
vi.mock('@/stores/languageStore', () => ({ useLanguageStore: () => 'en' }))

import { ArenaSessionBoard } from '@/components/arena-session/ArenaSessionBoard'
import { buildArenaLifecycleSnapshot } from '@/lib/dev-preview/arenaLifecycleFixtures'

import {
  CaptainDecisionRequired,
  Closed,
  Draining,
  InProgress,
  PairedStake,
  ReadyToStart,
  Retired,
  SettledLoser,
  SettledWinner,
  TeammateWaiting,
  rebaseInProgressSnapshot,
  renderArenaSessionBoard,
  freezeDeep,
} from './ArenaSessionBoard.stories'
import meta from './ArenaSessionBoard.stories'
import { ARENA_SESSION_STORY_STATES, parseArenaSessionStoryArgs } from './arenaSessionStoryArgs'

;(globalThis as { React?: typeof React }).React = React

describe('ArenaSessionBoard Storybook stories', () => {
  beforeEach(() => {
    harness.alerts.length = 0
    harness.inputs.length = 0
    harness.pressables.length = 0
  })

  it('composes the production Board for every approved display state', () => {
    for (const state of ARENA_SESSION_STORY_STATES) {
      const element = renderArenaSessionBoard({ state })
      const html = renderToStaticMarkup(element)
      expect(html).toContain('Basketball')
      if (state !== 'in_progress') {
        const boardElement = asBoardElement(element)
        const snapshot = boardElement.props.snapshot
        if (!snapshot) throw new Error(`Missing snapshot for ${state}`)
        expect(boardElement.props.actorUserId).toBe('preview-arena-actor')
        expect(snapshot.session.arenaEventId).toBe(`preview-${state}`)
        expect(boardElement.props.onUpdateStakeProposal).toBeTypeOf('function')
        expect(boardElement.props.onChooseTeamParticipation).toBeTypeOf('function')
        expect(Object.isFrozen(snapshot)).toBe(true)
      }
    }
  })

  it('publishes named fixture stories with one select state control', () => {
    const stories = [
      [PairedStake, 'paired_stake'],
      [ReadyToStart, 'ready_to_start'],
      [InProgress, 'in_progress'],
      [SettledWinner, 'settled_winner'],
      [SettledLoser, 'settled_loser'],
      [CaptainDecisionRequired, 'captain_decision_required'],
      [TeammateWaiting, 'teammate_waiting'],
      [Retired, 'retired'],
      [Draining, 'draining'],
      [Closed, 'closed'],
    ] as const

    for (const [story, state] of stories) {
      expect(story.args).toEqual({ state })
      expect(story.render).toBe(renderArenaSessionBoard)
    }
    expect(meta.argTypes?.state).toMatchObject({ control: { type: 'select' }, options: [...ARENA_SESSION_STORY_STATES] })
    expect(Object.keys(meta.argTypes ?? {})).toEqual(['state'])
  })

  it('shows a Storybook-only diagnostic for invalid args and recovers on the next valid render', () => {
    const invalidElement = renderArenaSessionBoard({ state: 'ready_to_start', callback: () => undefined })
    expect(invalidElement.type).not.toBe(ArenaSessionBoard)
    expect(renderToStaticMarkup(invalidElement)).toContain('Invalid Arena Session story args')
    const element = renderArenaSessionBoard({ state: 'in_progress' })
    expect(renderToStaticMarkup(element)).toContain('เข้าสู่แมตช์')
  })

  it('rebases only the active in-progress clock from a fixed mount anchor', () => {
    const canonical = buildArenaLifecycleSnapshot('in_progress')
    const canonicalBefore = JSON.stringify(canonical)
    const anchorMs = Date.parse('2026-09-07T03:00:00.000Z')
    const rebased = rebaseInProgressSnapshot(canonical, anchorMs)
    const liveRoundIndex = canonical.rounds.findIndex((round) => round.roundId === canonical.liveRound?.roundId)

    expect(rebased).not.toBeNull()
    expect(rebased).not.toBe(canonical)
    expect(Object.isFrozen(rebased)).toBe(true)
    expect(Object.isFrozen(rebased?.liveRound)).toBe(true)
    expect(Object.isFrozen(rebased?.rounds)).toBe(true)
    expect(rebased?.liveRound).not.toBe(canonical.liveRound)
    expect(rebased?.rounds[liveRoundIndex]).not.toBe(canonical.rounds[liveRoundIndex])
    expect(Object.isFrozen(rebased?.rounds[liveRoundIndex])).toBe(true)
    expect(rebased?.rounds[liveRoundIndex]).toMatchObject({
      roundId: canonical.liveRound?.roundId,
      status: 'in_progress',
      startedAt: '2026-09-07T02:58:00.000Z',
      submittedAt: canonical.rounds[liveRoundIndex]?.submittedAt,
      settledAt: canonical.rounds[liveRoundIndex]?.settledAt,
    })
    expect(rebased?.liveRound).toEqual(canonical.liveRound)
    expect(JSON.stringify(canonical)).toBe(canonicalBefore)
  })

  it('fails closed when the active live round or matching historical record is absent', () => {
    const canonical = buildArenaLifecycleSnapshot('in_progress')
    expect(rebaseInProgressSnapshot({ ...canonical, liveRound: null }, 0)).toBeNull()
    expect(rebaseInProgressSnapshot({
      ...canonical,
      liveRound: { ...canonical.liveRound!, roundId: 'missing-round' },
    }, 0)).toBeNull()
  })

  it('renders the actual Board composition with stake controls and local-only callbacks', () => {
    const element = asBoardElement(renderArenaSessionBoard({ state: 'paired_stake' }))
    const html = renderToStaticMarkup(element)

    expect(html).toContain('ROUND STAKE')
    expect(html).toContain('Your proposal')
    expect(html).toContain('Confirm stake')
    expect(harness.inputs).toHaveLength(1)
    expect(harness.inputs[0]?.editable).toBe(true)
    expect(harness.inputs[0]?.onChangeText).toBeTypeOf('function')
    harness.inputs[0]?.onChangeText?.('40')

    const snapshot = element.props.snapshot
    const onUpdateStakeProposal = element.props.onUpdateStakeProposal
    const onConfirmFinalStake = element.props.onConfirmFinalStake
    if (!snapshot || !onUpdateStakeProposal || !onConfirmFinalStake) throw new Error('Missing local stake callbacks')
    const snapshotBefore = JSON.stringify(snapshot)
    onUpdateStakeProposal({ roundId: 'local-round', amount: 40, expectedStakeVersion: 3 })
    onConfirmFinalStake({ roundId: 'local-round', stakeVersion: 3, maxLoss: 40 })
    expect(JSON.stringify(snapshot)).toBe(snapshotBefore)
  })

  it('shows disabled stake controls and role-specific continuation copy', () => {
    const readyElement = asBoardElement(renderArenaSessionBoard({ state: 'ready_to_start' }))
    const readyHtml = renderToStaticMarkup(React.createElement(readyElement.type, { ...readyElement.props, actionPending: true }))
    expect(readyHtml).toContain('Start round')
    expect(readyHtml).toContain('Confirming…')
    expect(harness.pressables.some(({ disabled }) => disabled === true)).toBe(true)

    const teammateElement = renderArenaSessionBoard({ state: 'teammate_waiting' })
    const teammateHtml = renderToStaticMarkup(teammateElement)
    expect(teammateHtml).toContain('รอกัปตันตัดสินใจ')
    expect(teammateHtml).not.toContain('เล่นต่อ')
  })

  it('keeps continuation confirmation local with cancel and confirm buttons', () => {
    const element = asBoardElement(renderArenaSessionBoard({ state: 'captain_decision_required' }))
    const html = renderToStaticMarkup(element)
    expect(html).toContain('เล่นต่อ')
    expect(html).toContain('ถอนทีม')

    const retireButton = harness.pressables.find(({ accessibilityLabel }) => accessibilityLabel === 'ถอนทีมจากรอบถัดไป')
    expect(retireButton?.onPress).toBeTypeOf('function')
    retireButton?.onPress?.()
    expect(harness.alerts).toHaveLength(1)
    expect(harness.alerts[0]?.buttons?.[0]?.text).toBe('ยกเลิก')
    expect(harness.alerts[0]?.buttons?.[0]?.onPress).toBeUndefined()

    const continueButton = harness.pressables.find(({ accessibilityLabel }) => accessibilityLabel === 'เล่นต่อในรอบถัดไป')
    expect(continueButton?.onPress).toBeTypeOf('function')
    const onChooseTeamParticipation = element.props.onChooseTeamParticipation
    const snapshot = element.props.snapshot
    if (!onChooseTeamParticipation || !snapshot) throw new Error('Missing continuation callback or snapshot')
    const snapshotBefore = JSON.stringify(snapshot)
    const localActionLog = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    continueButton?.onPress?.()
    expect(localActionLog).toHaveBeenCalledWith(
      '[Storybook] ArenaSessionBoard choose team participation',
      expect.objectContaining({
        state: 'captain_decision_required',
        input: expect.objectContaining({ decision: 'continue' }),
      }),
    )
    expect(harness.alerts[0]?.buttons?.[1]?.text).toBe('ถอนทีม')
    harness.alerts[0]?.buttons?.[1]?.onPress?.()
    expect(localActionLog).toHaveBeenCalledWith(
      '[Storybook] ArenaSessionBoard choose team participation',
      expect.objectContaining({
        state: 'captain_decision_required',
        input: expect.objectContaining({ decision: 'retire' }),
      }),
    )
    localActionLog.mockRestore()
    expect(JSON.stringify(snapshot)).toBe(snapshotBefore)
    expect(JSON.stringify(snapshot)).toContain('decision_required')
  })

  it('deep-freezes fixture snapshots recursively', () => {
    const fixture = freezeDeep({ nested: [{ value: 1 }] })
    expect(Object.isFrozen(fixture)).toBe(true)
    expect(Object.isFrozen(fixture.nested)).toBe(true)
    expect(Object.isFrozen(fixture.nested[0])).toBe(true)
  })
})

describe('ArenaSessionBoard story args contract', () => {
  it('does not expose callbacks or fixture snapshots as raw controls', () => {
    expect(parseArenaSessionStoryArgs({ state: 'closed' })).toEqual({ state: 'closed' })
    expect(() => parseArenaSessionStoryArgs({ state: 'closed', onLeave: () => undefined })).toThrow()
  })
})

function asBoardElement(element: React.ReactElement): React.ReactElement<React.ComponentProps<typeof ArenaSessionBoard>> {
  if (element.type !== ArenaSessionBoard) throw new Error('Expected a direct ArenaSessionBoard element')
  return element as React.ReactElement<React.ComponentProps<typeof ArenaSessionBoard>>
}
