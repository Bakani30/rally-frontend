import { describe, expect, it, vi } from 'vitest'

import type { ArenaTeamParticipationSnapshot } from '@/types/arenaSession'
import {
  createArenaTeamRetireConfirmation,
  getArenaTeamContinuationActionScope,
  getArenaTeamContinuationErrorCopy,
  getArenaTeamContinuationPresentation,
} from './arenaTeamContinuation'

describe('arena team continuation presentation', () => {
  it('shows both decision actions only from server capabilities', () => {
    expect(getArenaTeamContinuationPresentation(detailed({
      state: 'decision_required',
      capabilities: { canContinue: true, canRetire: true },
    }))).toMatchObject({
      kind: 'captain_decision',
      canContinue: true,
      canRetire: true,
    })
  })

  it('keeps a teammate read-only when the server grants no decision capability', () => {
    expect(getArenaTeamContinuationPresentation(detailed({
      state: 'decision_required',
      capabilities: { canContinue: false, canRetire: false },
    }))).toEqual({ kind: 'teammate_decision' })
  })

  it('keeps a continued captain able to retire but hides continue', () => {
    expect(getArenaTeamContinuationPresentation(detailed({
      state: 'ready_to_pair',
      capabilities: { canContinue: false, canRetire: true },
    }))).toEqual({ kind: 'captain_waiting', canRetire: true })
  })

  it('keeps a continued teammate read-only while waiting to pair', () => {
    expect(getArenaTeamContinuationPresentation(detailed({
      state: 'ready_to_pair',
      capabilities: { canContinue: false, canRetire: false },
    }))).toEqual({ kind: 'teammate_waiting' })
  })

  it.each<ArenaTeamParticipationSnapshot>([
    { blocksPairing: false },
    detailed({ state: 'paired' }),
    detailed({ state: 'retired' }),
  ])('hides continuation controls for coarse and terminal participation snapshots', (participation) => {
    expect(getArenaTeamContinuationPresentation(participation)).toEqual({ kind: 'hidden' })
  })

  it('does not derive authority from a detailed participant state', () => {
    expect(getArenaTeamContinuationPresentation(detailed({
      state: 'decision_required',
      capabilities: { canContinue: false, canRetire: true },
    }))).toEqual({
      kind: 'captain_decision',
      canContinue: false,
      canRetire: true,
    })
  })
})

describe('arena team continuation errors', () => {
  it('maps a stale decision conflict to safe retry copy', () => {
    expect(getArenaTeamContinuationErrorCopy({
      code: 'arena_team_participation_cycle_conflict',
      message: 'internal database details must never reach the player',
    })).toBe('สถานะทีมเปลี่ยนแล้ว กรุณาลองใหม่อีกครั้ง')
  })

  it('maps the real captain authority code to safe role copy', () => {
    expect(getArenaTeamContinuationErrorCopy({
      code: 'arena_team_decision_captain_required',
      message: 'server-only details',
    })).toBe('กัปตันทีมเท่านั้นที่ตัดสินใจรอบนี้ได้')
  })

  it('never forwards raw Edge or SQL error messages', () => {
    expect(getArenaTeamContinuationErrorCopy({ message: 'SQLSTATE 42501: private server message' }))
      .toBe('บันทึกการตัดสินใจไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
  })
})

describe('arena team retire confirmation', () => {
  it('binds the displayed scope and sends zero when the alert outlives a scope or pending change', () => {
    const target = getArenaTeamContinuationActionScope('arena-1', 'user-a', detailed())!
    const onDecision = vi.fn()
    let current = { scope: target, active: true, canRetire: true, actionPending: false, onDecision }
    const confirm = createArenaTeamRetireConfirmation(target, () => current)

    current = {
      scope: { ...target, arenaId: 'arena-2', participationCycleId: 'cycle-2' },
      active: true,
      canRetire: true,
      actionPending: false,
      onDecision,
    }
    confirm()
    expect(onDecision).not.toHaveBeenCalled()

    const pendingConfirm = createArenaTeamRetireConfirmation(target, () => ({
      scope: target,
      active: true,
      canRetire: true,
      actionPending: true,
      onDecision,
    }))
    pendingConfirm()
    expect(onDecision).not.toHaveBeenCalled()
  })

  it('dispatches a current destructive choice exactly once', () => {
    const target = getArenaTeamContinuationActionScope('arena-1', 'user-a', detailed())!
    const onDecision = vi.fn()
    const confirm = createArenaTeamRetireConfirmation(target, () => ({
      scope: target,
      active: true,
      canRetire: true,
      actionPending: false,
      onDecision,
    }))

    confirm()
    confirm()
    expect(onDecision).toHaveBeenCalledTimes(1)
    expect(onDecision).toHaveBeenCalledWith({
      arenaId: target.arenaId,
      participationCycleId: target.participationCycleId,
      expectedRevision: target.expectedRevision,
      decision: 'retire',
    })
  })
})

function detailed(overrides: Partial<Extract<ArenaTeamParticipationSnapshot, { participationCycleId: string }>> = {}) {
  return {
    participationCycleId: 'cycle-1',
    teamId: 'team-1',
    lane: 'champion' as const,
    state: 'decision_required' as const,
    revision: 1,
    queuePosition: null,
    blocksPairing: true,
    capabilities: { canContinue: false, canRetire: false },
    ...overrides,
  }
}
