/**
 * A lobby position move (or team swap) fans out into an optimistic cache write, an
 * edge-function update, a realtime reconciliation, and an invalidate-refetch. Tapping
 * positions in rapid succession overlaps those cycles, so a late refetch from move #1
 * can clobber the optimistic state of move #2 and make the court markers jump. A short
 * cooldown gates each move so the previous cycle settles before the next one fires.
 */
export const LOBBY_MOVE_COOLDOWN_MS = 3_000

/**
 * Pure decision: is a new lobby move still inside the cooldown window left by the
 * previous one? `lastMoveAt` and `now` are epoch milliseconds. A null `lastMoveAt`
 * (no move yet) is never on cooldown.
 */
export function isLobbyMoveOnCooldown(
  lastMoveAt: number | null,
  now: number,
  cooldownMs: number = LOBBY_MOVE_COOLDOWN_MS,
): boolean {
  if (lastMoveAt == null) return false
  return now - lastMoveAt < cooldownMs
}

/**
 * Milliseconds left on the cooldown, clamped to >= 0. Drives the countdown UI.
 * Returns 0 when no move has been made yet or the window has fully elapsed.
 */
export function lobbyMoveCooldownRemainingMs(
  lastMoveAt: number | null,
  now: number,
  cooldownMs: number = LOBBY_MOVE_COOLDOWN_MS,
): number {
  if (lastMoveAt == null) return 0
  return Math.max(0, lastMoveAt + cooldownMs - now)
}

/** Whole seconds left on the cooldown, rounded up so "1ms left" still shows "1". */
export function lobbyMoveCooldownSecondsLeft(remainingMs: number): number {
  return Math.ceil(remainingMs / 1_000)
}
