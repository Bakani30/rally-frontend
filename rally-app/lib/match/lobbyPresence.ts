/**
 * Decide whether to surface the "the host removed you from this room" notice.
 *
 * The match-detail screen can only observe that the local user's participant
 * row disappeared (`isMyParticipant` flipped false) — it cannot tell *who*
 * removed it. A host kick and a voluntary self-leave produce the exact same
 * signal: both `host_kick_match_participant_atomic` and
 * `leave_match_lobby_atomic` hard-`DELETE` the row, and the client also drops
 * the row optimistically the instant the user taps leave. Without an explicit
 * intent flag the screen would wrongly tell a user who left on purpose that the
 * host removed them.
 *
 * `selfExitInitiated` is that intent flag: the screen sets it before it fires
 * its own leave/cancel/decline, so a self-triggered removal stays silent while
 * a host kick (where the local user never initiated an exit) still notifies.
 */
export function shouldNotifyRemovedFromRoom(input: {
  selfExitInitiated: boolean
  wasParticipant: boolean
  isMyParticipant: boolean
  isPreStartPlayerLobby: boolean
}): boolean {
  if (input.selfExitInitiated) return false
  if (input.isMyParticipant) return false
  if (!input.wasParticipant) return false
  if (!input.isPreStartPlayerLobby) return false
  return true
}
