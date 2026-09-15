export interface LatLng { lat: number; lng: number }
export interface SpotGeo extends LatLng { radiusM: number; dwellSeconds?: number }

export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function isInRange(user: LatLng, spot: SpotGeo): boolean {
  return distanceMeters(user, spot) <= spot.radiusM
}

export function dwellRemainingSeconds(
  arrivedAtMs: number, dwellSeconds: number, nowMs: number,
): number {
  const elapsed = Math.floor((nowMs - arrivedAtMs) / 1000)
  return Math.max(dwellSeconds - elapsed, 0)
}

export function canClaim(
  user: LatLng, spot: SpotGeo, arrivedAtMs: number, nowMs: number,
): boolean {
  if (!isInRange(user, spot)) return false
  return dwellRemainingSeconds(arrivedAtMs, spot.dwellSeconds ?? 0, nowMs) === 0
}
