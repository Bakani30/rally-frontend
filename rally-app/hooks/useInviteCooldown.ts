import { useEffect, useState } from 'react'

export const INVITE_COOLDOWN_SECONDS = 15

/**
 * Pure cooldown math: how long until this user can be (re-)invited.
 * `lastInvitedAt` is the most recent invite's server timestamp (ISO), or null
 * if never invited in this match. `nowMs` is injected so the function is pure
 * and testable.
 */
export function computeInviteCooldown(lastInvitedAt: string | null, nowMs: number) {
  if (!lastInvitedAt) return { remaining: 0, canInvite: true }
  const elapsed = Math.floor((nowMs - new Date(lastInvitedAt).getTime()) / 1000)
  const remaining = Math.max(0, INVITE_COOLDOWN_SECONDS - elapsed)
  return { remaining, canInvite: remaining === 0 }
}

/**
 * Live cooldown for an invite button. Ticks once per second while a cooldown is
 * active so the countdown updates; idle (no interval) when there is nothing to
 * count down.
 */
export function useInviteCooldown(lastInvitedAt: string | null) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (!lastInvitedAt) return
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [lastInvitedAt])
  return computeInviteCooldown(lastInvitedAt, nowMs)
}
