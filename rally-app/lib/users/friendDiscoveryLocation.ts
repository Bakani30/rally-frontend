export const FRIEND_DISCOVERY_CELL_DEGREES = 0.05
export const FRIEND_DISCOVERY_MIN_AGE = 15

export type FriendDiscoveryCoordinates = {
  lat: number
  lng: number
}

export type FriendDiscoveryCell = {
  cellLat: number
  cellLng: number
}

export function isFriendDiscoveryLocationAgeEligible(
  birthDate: string | null,
  now: Date = new Date(),
): boolean {
  if (!birthDate) return false
  const born = new Date(`${birthDate}T00:00:00Z`)
  if (Number.isNaN(born.getTime())) return false

  let age = now.getUTCFullYear() - born.getUTCFullYear()
  const beforeBirthday =
    now.getUTCMonth() < born.getUTCMonth() ||
    (now.getUTCMonth() === born.getUTCMonth() && now.getUTCDate() < born.getUTCDate())
  if (beforeBirthday) age -= 1
  return age >= FRIEND_DISCOVERY_MIN_AGE
}

/**
 * Buckets a foreground GPS fix into a coarse cell before it leaves the app.
 * A 0.05-degree cell is roughly 5 km across in Thailand; the raw fix is never
 * persisted or sent to the discovery RPC.
 */
export function toFriendDiscoveryCell(
  coordinates: FriendDiscoveryCoordinates,
): FriendDiscoveryCell {
  if (
    !Number.isFinite(coordinates.lat)
    || !Number.isFinite(coordinates.lng)
    || coordinates.lat < -90
    || coordinates.lat > 90
    || coordinates.lng < -180
    || coordinates.lng > 180
  ) {
    throw new Error('location_invalid')
  }

  return {
    cellLat: Math.floor(coordinates.lat / FRIEND_DISCOVERY_CELL_DEGREES),
    cellLng: Math.floor(coordinates.lng / FRIEND_DISCOVERY_CELL_DEGREES),
  }
}
