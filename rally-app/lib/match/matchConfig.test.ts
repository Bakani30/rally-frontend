import { describe, expect, it } from 'vitest'

import {
  DEFAULT_UNSCHEDULED_LOBBY_MINUTES,
  MIN_STAKE,
  deriveRunningMode,
  getDefaultUnscheduledLobbyDeadline,
} from './matchConfig'

describe('competitive stake floor', () => {
  // Guards against drift from the DB RPC create_match_lobby_atomic, which rejects
  // competitive stakes below 10 (20260613103000_min_stake_floor_10_join_guard.sql).
  // The edge COMPETITIVE_MIN_STAKE and this constant must stay aligned with the DB,
  // and create-match must be redeployed when it changes.
  it('matches the DB competitive floor of 10 RP', () => {
    expect(MIN_STAKE).toBe(10)
  })
})

describe('running mode mapping', () => {
  it('prefers explicit rule_params running_mode labels', () => {
    expect(deriveRunningMode('running', { running_mode: 'race' }, false)).toBe('race')
    expect(deriveRunningMode('running', { running_mode: 'coop' }, false)).toBe('coop')
    expect(deriveRunningMode('running', { running_mode: 'ffa' }, false)).toBe('ffa')
  })

  it('falls back to co-op flag or race semantics for legacy running matches', () => {
    expect(deriveRunningMode('running', {}, true)).toBe('coop')
    expect(deriveRunningMode('running', {}, false)).toBe('race')
    expect(deriveRunningMode('basketball', {}, false)).toBeNull()
  })

  it('keeps unscheduled lobbies away from the next lifecycle cron tick', () => {
    const now = new Date('2026-06-14T12:04:50.000Z')
    const deadline = getDefaultUnscheduledLobbyDeadline(now)

    expect(deadline.getTime() - now.getTime()).toBe(DEFAULT_UNSCHEDULED_LOBBY_MINUTES * 60 * 1000)
    expect(deadline.toISOString()).toBe('2026-06-14T13:04:50.000Z')
  })
})
