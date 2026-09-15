/**
 * Pure decision layer for the multiplayer run crew map. Keeps every rule about
 * presence phase, freshness, and freeze detection out of the React hook so it
 * can be unit-tested and reasoned about in isolation.
 *
 * Two independent axes describe a teammate:
 *   - liveness: how much to trust the dot on the map right now
 *       'live'   fresh messages + moving (or explicitly running/ready)
 *       'paused' sender says they paused; still connected, just not moving
 *       'stale'  no fresh message for a while, OR fresh heartbeats but the
 *                position has frozen (GPS stuck) — show degraded, don't drop
 *       'lost'   silent long enough that we stop showing them
 *   - phase: what the runner is doing (ready | running | paused), broadcast by
 *     the sender via derivePresencePhase.
 */
import type { TeamRunLocation, TeamRunPhase } from './teamRunPresenceTypes'

/** No fresh broadcast for this long → the teammate is shown as stale. */
export const STALE_AFTER_MS = 8_000
/** Silent for this long → drop the teammate from the map entirely. */
export const LOST_AFTER_MS = 60_000
/**
 * Heartbeats keep arriving but coordinates have not changed for this long →
 * treat as stale (frozen GPS). Prevents a stuck runner from looking live at a
 * position they left minutes ago.
 */
export const FROZEN_AFTER_MS = 30_000

export type TeammateLiveness = 'live' | 'paused' | 'stale' | 'lost'

export type TeammatePresence = {
  location: TeamRunLocation
  /** Receiver wall-clock time when this teammate's coordinates last changed. */
  lastMovedAt: number
}

export type TeammatePresenceMap = Record<string, TeammatePresence>

export type TeammateView = {
  location: TeamRunLocation
  liveness: TeammateLiveness
  lastMovedAt: number
}

type DerivePresencePhaseInput = {
  status: 'idle' | 'active' | 'paused' | 'stopped'
  isAutoPaused: boolean
  isVehiclePaused: boolean
}

/**
 * Maps the local run session status onto the phase we broadcast to teammates.
 * A runner that is auto-paused or vehicle-paused is still `status === 'active'`
 * locally, so without this they would be mislabeled as running on peers' maps.
 */
export function derivePresencePhase({
  status,
  isAutoPaused,
  isVehiclePaused,
}: DerivePresencePhaseInput): TeamRunPhase {
  if (status === 'active') {
    return isAutoPaused || isVehiclePaused ? 'paused' : 'running'
  }
  if (status === 'paused') return 'paused'
  return 'ready'
}

/**
 * Folds one incoming broadcast into the presence map. Ignores out-of-order
 * (older-timestamp) messages and only advances `lastMovedAt` when the
 * coordinates actually change, which is what lets freeze detection work.
 */
export function applyTeammateLocation(
  map: TeammatePresenceMap,
  incoming: TeamRunLocation,
  now: number,
  allowedUserIds?: ReadonlySet<string>,
): TeammatePresenceMap {
  // Anti-spoof: broadcast payloads carry a self-declared userId, so drop any
  // that does not belong to a known match participant. Without this an
  // authorized runner could publish under a teammate's identity.
  if (allowedUserIds && !allowedUserIds.has(incoming.userId)) return map

  const existing = map[incoming.userId]
  if (existing && incoming.timestamp < existing.location.timestamp) return map

  const moved =
    !existing || existing.location.lat !== incoming.lat || existing.location.lng !== incoming.lng

  return {
    ...map,
    [incoming.userId]: {
      location: incoming,
      lastMovedAt: moved ? now : existing.lastMovedAt,
    },
  }
}

export function deriveTeammateLiveness(presence: TeammatePresence, now: number): TeammateLiveness {
  const messageAge = now - presence.location.timestamp
  if (messageAge > LOST_AFTER_MS) return 'lost'
  if (messageAge > STALE_AFTER_MS) return 'stale'
  if (presence.location.phase === 'paused') return 'paused'
  if (now - presence.lastMovedAt > FROZEN_AFTER_MS) return 'stale'
  return 'live'
}

/**
 * Drops only teammates that have crossed the lost threshold. Stale/paused
 * teammates are kept so the UI can degrade them instead of making them vanish.
 * Returns the same reference when nothing changes to avoid needless re-renders.
 */
export function pruneLostTeammates(
  map: TeammatePresenceMap,
  now: number,
  allowedUserIds?: ReadonlySet<string>,
): TeammatePresenceMap {
  let changed = false
  const next: TeammatePresenceMap = {}
  for (const [userId, presence] of Object.entries(map)) {
    // Drop lost entries and — once the participant allowlist is known — any
    // entry that isn't a real match participant, closing the window where a
    // spoofed userId slipped in before the roster loaded.
    if (deriveTeammateLiveness(presence, now) === 'lost' || (allowedUserIds && !allowedUserIds.has(userId))) {
      changed = true
      continue
    }
    next[userId] = presence
  }
  return changed ? next : map
}

/**
 * Presentational list for the map/roster: lost teammates removed, each tagged
 * with liveness, ordered by userId for a stable render (no marker reshuffle).
 */
export function buildTeammateViews(map: TeammatePresenceMap, now: number): TeammateView[] {
  return Object.values(map)
    .map((presence) => ({
      location: presence.location,
      liveness: deriveTeammateLiveness(presence, now),
      lastMovedAt: presence.lastMovedAt,
    }))
    .filter((view) => view.liveness !== 'lost')
    .sort((a, b) => (a.location.userId < b.location.userId ? -1 : a.location.userId > b.location.userId ? 1 : 0))
}
