/**
 * Synchronized start for multiplayer runs. The server stamps `matches.started_at`
 * the moment the host presses START; every participant then counts down to the
 * SAME absolute wall-clock moment (started_at + buffer) instead of each device
 * running its own local 3-2-1. The buffer covers lobby→run navigation so late
 * arrivals still land on the shared GO.
 */
export const SYNCED_RUN_START_BUFFER_MS = 6_000

export type SyncedRunStart = {
  /** Absolute epoch ms all devices count down to, or null when not applicable. */
  targetMs: number | null
  /** Whole seconds left on the shared countdown (0 once reached). */
  secondsRemaining: number
  /** True once the shared moment has passed — the run should begin now. */
  expired: boolean
}

const IDLE: SyncedRunStart = { targetMs: null, secondsRemaining: 0, expired: false }

export function resolveSyncedRunStart(
  startedAtIso: string | null | undefined,
  nowMs: number,
  bufferMs: number = SYNCED_RUN_START_BUFFER_MS,
): SyncedRunStart {
  if (!startedAtIso) return IDLE
  const startedMs = Date.parse(startedAtIso)
  if (Number.isNaN(startedMs)) return IDLE

  const targetMs = startedMs + bufferMs
  const remainingMs = targetMs - nowMs
  return {
    targetMs,
    secondsRemaining: Math.max(0, Math.ceil(remainingMs / 1000)),
    expired: remainingMs <= 0,
  }
}
