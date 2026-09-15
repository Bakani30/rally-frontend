import { normalizeReplayEmoji } from './replayEmoji'

export type ReplayMapMarker = { lat: number; lng: number } | null

/**
 * Optional co-op/PvP track rendered alongside the current player's route.
 * The current player's track remains the camera leader. Both revealed fields
 * must be derived from the same companion replay timeline: MapLibre consumes
 * the coordinate slice, while native Apple Map consumes the progress value.
 */
export type ReplayMapCompanion = {
  id: string
  fullCoordinates: [number, number][]
  revealedCoordinates: [number, number][]
  revealedProgress: number
  marker: ReplayMapMarker
  color: string
  markerAvatarUrl?: string | null
  markerEmoji?: string | null
  markerInitials?: string
}

function isCoordinate(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    Number.isFinite(value[0]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[1]) &&
    value[1] >= -90 &&
    value[1] <= 90
  )
}

function normalizeMarker(marker: ReplayMapMarker): ReplayMapMarker {
  if (
    !marker ||
    !Number.isFinite(marker.lat) ||
    !Number.isFinite(marker.lng) ||
    marker.lat < -90 ||
    marker.lat > 90 ||
    marker.lng < -180 ||
    marker.lng > 180
  ) return null
  return marker
}

/** Validate and canonicalize companion data before crossing provider boundaries. */
export function normalizeReplayMapCompanions(
  companions: readonly ReplayMapCompanion[],
): ReplayMapCompanion[] {
  const seenIds = new Set<string>()

  return companions.flatMap((companion) => {
    const id = companion.id.trim()
    const fullCoordinates = companion.fullCoordinates.filter(isCoordinate)
    if (!id || seenIds.has(id) || fullCoordinates.length < 2 || !companion.color.trim()) return []
    seenIds.add(id)

    const revealedCoordinates = companion.revealedCoordinates.filter(isCoordinate)
    const markerEmoji = companion.markerEmoji ? normalizeReplayEmoji(companion.markerEmoji) : null

    return [{
      ...companion,
      id,
      fullCoordinates,
      revealedCoordinates,
      revealedProgress: Math.max(0, Math.min(1, companion.revealedProgress)),
      marker: normalizeMarker(companion.marker),
      color: companion.color.trim(),
      markerEmoji: markerEmoji || null,
    }]
  })
}

export const EMPTY_REPLAY_MAP_COMPANIONS: ReplayMapCompanion[] = []
