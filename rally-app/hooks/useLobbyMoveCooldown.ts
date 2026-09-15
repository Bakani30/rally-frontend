import { useCallback, useEffect, useRef, useState } from 'react'

import { isLobbyMoveOnCooldown, LOBBY_MOVE_COOLDOWN_MS } from '@/lib/match/lobbyMoveCooldown'

export type LobbyMoveCooldown = {
  /** True while the most recent move is still settling — drives the busy/disabled court UI. */
  coolingDown: boolean
  /** Epoch ms when the cooldown ends (null when idle) — handed to the countdown badge. */
  endsAt: number | null
  /** Length of the cooldown window in ms, so the UI can show progress. */
  durationMs: number
  /**
   * Arm the cooldown for the next move. Returns `true` if the move may proceed (and
   * opens the window), or `false` if it is still on cooldown and should be ignored.
   */
  begin: () => boolean
}

/**
 * Gates lobby position moves/swaps behind a cooldown so rapid taps can't overlap
 * optimistic + realtime + refetch cycles and stutter the court markers. The "is it on
 * cooldown" decision lives in `isLobbyMoveOnCooldown`; this hook owns the last-move
 * timestamp and flips `coolingDown` exactly twice per move (open + close), so the heavy
 * match screen re-renders minimally. The per-second countdown is ticked by the badge
 * component itself off `endsAt`, not here.
 */
export function useLobbyMoveCooldown(cooldownMs: number = LOBBY_MOVE_COOLDOWN_MS): LobbyMoveCooldown {
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const lastMoveAtRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const begin = useCallback((): boolean => {
    const now = Date.now()
    if (isLobbyMoveOnCooldown(lastMoveAtRef.current, now, cooldownMs)) return false
    lastMoveAtRef.current = now
    setEndsAt(now + cooldownMs)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setEndsAt(null), cooldownMs)
    return true
  }, [cooldownMs])

  return { coolingDown: endsAt != null, endsAt, durationMs: cooldownMs, begin }
}
