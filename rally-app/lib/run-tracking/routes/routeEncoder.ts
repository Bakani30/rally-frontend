import type { GeoJsonLineString } from './routeTypes'

/**
 * Google Encoded Polyline Algorithm (precision 1e5) — pure bitwise impl.
 *
 * Why we own this rather than pull in a library:
 *   - polyline / @mapbox/polyline / turf.js add ~30-200KB to the bundle for
 *     ~50 lines of math. RN start-up size matters; this is leaf code.
 *   - We need the EXACT same impl on client and Edge Function (Deno).
 *     Owning it removes dependency drift between two runtimes.
 *
 * Coordinate convention:
 *   - GeoJSON LineString stores `[lng, lat]` per RFC 7946.
 *   - Google's polyline format encodes `(lat, lng)` deltas in that order.
 *   - The two halves of this module never confuse the two: the low-level
 *     `encodePolyline / decodePolyline` work in (lat, lng) order; the
 *     `*GeoJsonLineString` helpers do the swap so callers stop worrying.
 *
 * Spec: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 *
 * Pure: no globals, no imports beyond a type-only routeTypes import. Safe in
 * RN, Node, Deno, browser.
 */

const DEFAULT_PRECISION = 5 // 1e5 — the Google default

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Encode `[lat, lng]` pairs into a polyline string.
 *
 * Returns "" for an empty input — no exception. Caller should not try to
 * draw an empty string on a map; just check `points.length` upstream.
 */
export function encodePolyline(
  points: readonly (readonly [number, number])[],
  precision: number = DEFAULT_PRECISION,
): string {
  if (points.length === 0) return ''
  const factor = Math.pow(10, precision)
  let prevLat = 0
  let prevLng = 0
  let out = ''
  for (let i = 0; i < points.length; i++) {
    const lat = Math.round(points[i][0] * factor)
    const lng = Math.round(points[i][1] * factor)
    out += encodeSignedValue(lat - prevLat)
    out += encodeSignedValue(lng - prevLng)
    prevLat = lat
    prevLng = lng
  }
  return out
}

/**
 * Decode a polyline string into `[lat, lng]` pairs.
 *
 * Returns `[]` for an empty string — no exception. Throws only when the
 * input is structurally malformed (truncated mid-value), since that's a
 * caller bug we want surfaced rather than silently producing wrong points.
 */
export function decodePolyline(
  encoded: string,
  precision: number = DEFAULT_PRECISION,
): [number, number][] {
  if (encoded.length === 0) return []
  const factor = Math.pow(10, precision)
  const out: [number, number][] = []
  let index = 0
  let lat = 0
  let lng = 0
  const length = encoded.length
  while (index < length) {
    const dLatResult = decodeSignedValue(encoded, index, length)
    lat += dLatResult.value
    index = dLatResult.nextIndex

    const dLngResult = decodeSignedValue(encoded, index, length)
    lng += dLngResult.value
    index = dLngResult.nextIndex

    out.push([lat / factor, lng / factor])
  }
  return out
}

/**
 * Encode a GeoJSON LineString. Swaps [lng, lat] → (lat, lng) before encoding.
 * Returns "" for empty `coordinates`.
 */
export function encodeGeoJsonLineString(
  line: GeoJsonLineString,
  precision: number = DEFAULT_PRECISION,
): string {
  if (!line || line.coordinates.length === 0) return ''
  const swapped: [number, number][] = new Array(line.coordinates.length)
  for (let i = 0; i < line.coordinates.length; i++) {
    const [lng, lat] = line.coordinates[i]
    swapped[i] = [lat, lng]
  }
  return encodePolyline(swapped, precision)
}

/**
 * Decode a polyline back into a GeoJSON LineString. Swaps (lat, lng) → [lng, lat].
 * Always returns a valid LineString; coordinates may be empty.
 */
export function decodeGeoJsonLineString(
  encoded: string,
  precision: number = DEFAULT_PRECISION,
): GeoJsonLineString {
  const latLng = decodePolyline(encoded, precision)
  const coords: [number, number][] = new Array(latLng.length)
  for (let i = 0; i < latLng.length; i++) {
    coords[i] = [latLng[i][1], latLng[i][0]] // [lng, lat]
  }
  return { type: 'LineString', coordinates: coords }
}

// ---------------------------------------------------------------------------
// Bitwise core (private)
// ---------------------------------------------------------------------------

/**
 * Encode one signed integer using Google's variable-length scheme:
 *   1. Left-shift 1 bit (multiply by 2) to make room for sign.
 *   2. If negative, invert the bits (one's complement of the shifted value).
 *   3. Emit 5-bit chunks, low-order first. All chunks except the last get
 *      0x20 set (continuation). Each chunk is offset by 63 to land in the
 *      printable ASCII range starting at '?'.
 *
 * `>>> 0` and `~` operate on 32-bit values in JS, which is exactly what the
 * spec wants. For deltas at 1e5 precision, magnitudes stay well under 2^31.
 */
function encodeSignedValue(value: number): string {
  // Shift left 1 then invert if negative — produces 2's-complement-ish
  // unsigned form expected by the algorithm.
  let v = value < 0 ? ~(value << 1) : value << 1
  // Force unsigned interpretation; shift can produce negative int32.
  v >>>= 0
  let out = ''
  while (v >= 0x20) {
    out += String.fromCharCode((0x20 | (v & 0x1f)) + 63)
    v >>>= 5
  }
  out += String.fromCharCode(v + 63)
  return out
}

/**
 * Decode one signed integer starting at `index`. Returns the value and the
 * index AFTER the last byte consumed. Throws if the string ends mid-value
 * (last byte still has continuation bit set).
 */
function decodeSignedValue(
  encoded: string,
  index: number,
  length: number,
): { value: number; nextIndex: number } {
  let shift = 0
  let result = 0
  let byte = 0
  do {
    if (index >= length) {
      throw new Error(`decodePolyline: truncated input at index ${index}`)
    }
    byte = encoded.charCodeAt(index++) - 63
    if (byte < 0) {
      throw new Error(
        `decodePolyline: invalid byte 0x${(byte + 63).toString(16)} at index ${index - 1}`,
      )
    }
    result |= (byte & 0x1f) << shift
    shift += 5
    // Guard against runaway loops on malformed long values. 32-bit signed
    // ints fit in 6 chunks (5 * 6 = 30 bits + 2 spare).
    if (shift > 35) {
      throw new Error(`decodePolyline: value overflow at index ${index - 1}`)
    }
  } while (byte >= 0x20)

  // Reverse the encoder transform: low bit is sign flag.
  const value = result & 1 ? ~(result >>> 1) : result >>> 1
  return { value, nextIndex: index }
}
