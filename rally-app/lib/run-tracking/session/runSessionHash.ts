import * as Crypto from 'expo-crypto'
import type { GpsPoint } from '../gps/gpsTypes'

/**
 * SHA-256 hex digest of the canonicalized GPS path.
 *
 * Field order is explicit so the server can reproduce the same hash from the
 * received JSON. Optional fields use explicit null rather than undefined so
 * JSON.stringify emits them consistently across engines.
 */
export async function hashGpsPath(path: readonly GpsPoint[]): Promise<string> {
  const canonical = JSON.stringify(
    path.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      accuracy: p.accuracy,
      altitude: p.altitude ?? null,
      speed: p.speed ?? null,
      timestamp: p.timestamp,
      isPaused: p.isPaused,
    })),
  )
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonical, {
    encoding: Crypto.CryptoEncoding.HEX,
  })
}
