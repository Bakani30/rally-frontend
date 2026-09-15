import { describe, expect, it } from 'vitest'

import {
  isLobbyMoveOnCooldown,
  LOBBY_MOVE_COOLDOWN_MS,
  lobbyMoveCooldownRemainingMs,
  lobbyMoveCooldownSecondsLeft,
} from './lobbyMoveCooldown'

describe('isLobbyMoveOnCooldown', () => {
  it('allows the first move when none has been recorded yet', () => {
    expect(isLobbyMoveOnCooldown(null, 1_000)).toBe(false)
  })

  it('blocks an immediate repeat tap', () => {
    expect(isLobbyMoveOnCooldown(5_000, 5_000)).toBe(true)
  })

  it('blocks a move fired before the cooldown window elapses', () => {
    expect(isLobbyMoveOnCooldown(1_000, 1_000 + LOBBY_MOVE_COOLDOWN_MS - 1)).toBe(true)
  })

  it('allows a move once the full cooldown window has elapsed', () => {
    expect(isLobbyMoveOnCooldown(1_000, 1_000 + LOBBY_MOVE_COOLDOWN_MS)).toBe(false)
  })

  it('honors a custom cooldown window', () => {
    expect(isLobbyMoveOnCooldown(0, 199, 200)).toBe(true)
    expect(isLobbyMoveOnCooldown(0, 200, 200)).toBe(false)
  })
})

describe('lobbyMoveCooldownRemainingMs', () => {
  it('is zero when no move has been recorded', () => {
    expect(lobbyMoveCooldownRemainingMs(null, 1_000)).toBe(0)
  })

  it('returns the full window immediately after a move', () => {
    expect(lobbyMoveCooldownRemainingMs(1_000, 1_000)).toBe(LOBBY_MOVE_COOLDOWN_MS)
  })

  it('counts down as time passes', () => {
    expect(lobbyMoveCooldownRemainingMs(1_000, 1_000 + 2_000)).toBe(LOBBY_MOVE_COOLDOWN_MS - 2_000)
  })

  it('clamps to zero once the window has elapsed', () => {
    expect(lobbyMoveCooldownRemainingMs(1_000, 1_000 + LOBBY_MOVE_COOLDOWN_MS + 500)).toBe(0)
  })
})

describe('lobbyMoveCooldownSecondsLeft', () => {
  it('rounds up partial seconds', () => {
    expect(lobbyMoveCooldownSecondsLeft(2_200)).toBe(3)
    expect(lobbyMoveCooldownSecondsLeft(1)).toBe(1)
    expect(lobbyMoveCooldownSecondsLeft(0)).toBe(0)
  })
})
