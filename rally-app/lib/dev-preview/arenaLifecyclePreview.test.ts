import { describe, expect, it } from 'vitest'

import { mapArenaSessionSnapshot } from '@/lib/arena-sessions/arenaSessionService'
import { getArenaTeamContinuationPresentation } from '@/lib/arena-sessions/arenaTeamContinuation'
import {
  ARENA_LIFECYCLE_STATES,
  canUseArenaLifecyclePreview,
  getArenaLifecycleFixture,
  getArenaLifecyclePreviewActions,
  nextArenaLifecycleState,
  parseArenaLifecycleState,
  transitionArenaLifecyclePreview,
  type ArenaLifecyclePreviewState,
} from './arenaLifecyclePreview'

describe('arena lifecycle preview contract', () => {
  it('keeps post-round and continuation deep-link states in stable order', () => {
    expect(ARENA_LIFECYCLE_STATES).toEqual([
      'settled_winner', 'settled_loser', 'champion', 'captain_decision_required',
      'captain_continued', 'teammate_waiting', 'paired_stake', 'ready_to_start',
      'in_progress', 'retired', 'draining', 'closed',
    ])
  })

  it('fails closed unless the route runs explicitly in dev', () => {
    expect(canUseArenaLifecyclePreview(true)).toBe(true)
    expect(canUseArenaLifecyclePreview(false)).toBe(false)
    expect(canUseArenaLifecyclePreview(undefined)).toBe(false)
    expect(parseArenaLifecycleState('captain_decision_required')).toBe('captain_decision_required')
    expect(parseArenaLifecycleState(['not-a-state'])).toBe('settled_winner')
  })

  it('makes captain and teammate authority a server-shaped fixture capability', () => {
    const captain = getArenaLifecycleFixture('captain_decision_required').snapshot
    expect(getArenaTeamContinuationPresentation(captain.teamParticipation)).toMatchObject({
      kind: 'captain_decision', canContinue: true, canRetire: true,
    })
    const teammate = getArenaLifecycleFixture('teammate_waiting').snapshot
    expect(getArenaTeamContinuationPresentation(teammate.teamParticipation)).toEqual({ kind: 'teammate_decision' })
    expect(getArenaLifecyclePreviewActions('teammate_waiting')).toEqual([])
  })

  it('keeps paired stake and retired participation coarse', () => {
    const paired = getArenaLifecycleFixture('paired_stake').snapshot
    const retired = getArenaLifecycleFixture('retired').snapshot
    expect(paired.teamParticipation).toEqual({ blocksPairing: false })
    expect(retired.teamParticipation).toEqual({ blocksPairing: false })
    expect(paired.actor.roundState?.proposalAmount).toBe(25)
    expect(paired.liveRound?.stake).not.toHaveProperty('amount')
    expect(JSON.stringify(paired)).not.toContain('opponentAmount')
    expect(mapArenaSessionSnapshot(paired).status).toBe('active')
    expect(mapArenaSessionSnapshot(retired).status).toBe('member_unavailable')
  })

  it('uses local-only transitions and never expands authority', () => {
    const initial: ArenaLifecyclePreviewState = { state: 'captain_decision_required', actionLog: [] }
    expect(transitionArenaLifecyclePreview(initial, 'continue')).toMatchObject({ state: 'captain_continued' })
    expect(transitionArenaLifecyclePreview(initial, 'retire')).toMatchObject({ state: 'retired' })
    expect(transitionArenaLifecyclePreview(initial, 'start_round')).toEqual(initial)
    expect(getArenaLifecyclePreviewActions('paired_stake')).toEqual([
      'update_stake_proposal', 'confirm_final_stake', 'start_round',
    ])
    expect(ARENA_LIFECYCLE_STATES.map(nextArenaLifecycleState)).toEqual([
      'champion', 'retired', 'settled_winner', 'captain_continued',
      'paired_stake', 'paired_stake', 'retired', 'in_progress',
      'settled_winner', 'settled_loser', 'closed', 'settled_loser',
    ])
  })

  it('models the active round and terminal Arena Session states from production-shaped snapshots', () => {
    const active = getArenaLifecycleFixture('in_progress').snapshot
    expect(active.session.sessionState).toBe('open')
    expect(active.liveRound).toMatchObject({
      status: 'in_progress',
      phase: 'active',
    })
    expect(active.actor.activeMatchId).toBe('preview-match-in-progress')
    expect(mapArenaSessionSnapshot(active)).toMatchObject({
      status: 'active',
      activeMatchId: 'preview-match-in-progress',
    })

    const ready = getArenaLifecycleFixture('ready_to_start').snapshot
    expect(ready.liveRound).toMatchObject({
      status: 'stake_acceptance',
      phase: 'ready_to_start',
      stake: { confirmedCount: 6, requiredCount: 6 },
    })
    expect(ready.actor.roundState).toMatchObject({
      confirmed: true,
      capabilities: {
        canEditOwnStake: false,
        canConfirmStake: false,
        canStartRound: true,
      },
    })

    const draining = getArenaLifecycleFixture('draining').snapshot
    expect(draining.session).toMatchObject({
      sessionState: 'draining',
      drainingAt: '2026-08-13T08:12:00.000Z',
      drainDeadlineAt: '2026-08-13T08:30:00.000Z',
      closedAt: null,
    })
    expect(mapArenaSessionSnapshot(draining).status).toBe('draining')

    const closed = getArenaLifecycleFixture('closed').snapshot
    expect(closed.session).toMatchObject({
      sessionState: 'closed',
      drainingAt: '2026-08-13T08:12:00.000Z',
      drainDeadlineAt: '2026-08-13T08:30:00.000Z',
      closedAt: '2026-08-13T08:30:00.000Z',
    })
    expect(closed.liveRound).toBeNull()
    expect(closed.actor).toMatchObject({
      presenceStatus: 'revoked',
      canJoin: false,
      canOpen: false,
      canRecordPresence: false,
    })
    expect(closed.actor).not.toHaveProperty('activeMatchId')
    expect(closed.teams.every((team) => team.status === 'retired')).toBe(true)
    expect(mapArenaSessionSnapshot(closed).status).toBe('closed')
  })
})
