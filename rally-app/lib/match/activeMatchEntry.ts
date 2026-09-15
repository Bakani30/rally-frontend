/**
 * Decide whether to auto-navigate the player from the match-detail lobby into
 * the active-match surface (manual submit screen, or the live-GPS run screen)
 * the moment a match becomes `in_progress`.
 *
 * The subtlety is `startPending`: `startMutation` optimistically flips the
 * cached status to `in_progress` in its `onMutate` for instant feedback, but
 * the server can still reject the start (a participant un-accepted, balance
 * changed). Navigating on that optimistic status would push the player into the
 * submit / live-GPS screen for a match that then rolls back to `pending` — and
 * for sensor runs it would kick off GPS tracking for a match that never
 * started. So we wait until the start is settled (`startPending === false`):
 * on success the confirmed `in_progress` status drives entry, on failure the
 * status is back to `pending` and entry never fires. Realtime-driven starts
 * (the other side started, or rejoining an already-live match) are unaffected
 * because their `startPending` is false.
 *
 * Team-sport matches stay on their live court and never auto-enter.
 */
export function shouldAutoEnterActiveMatch(input: {
  status: string | undefined
  isMyParticipant: boolean
  isTeamSportActivity: boolean
  myTeamResultSubmitted: boolean
  startPending: boolean
  alreadyNavigated: boolean
}): boolean {
  if (input.status !== 'in_progress') return false
  if (!input.isMyParticipant) return false
  if (input.isTeamSportActivity) return false
  if (input.myTeamResultSubmitted) return false
  if (input.startPending) return false
  if (input.alreadyNavigated) return false
  return true
}
