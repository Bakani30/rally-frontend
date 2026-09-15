import type { GeoJsonLineString } from './routeTypes'

/**
 * GPX parser — minimal, written from scratch against the public GPX 1.1
 * spec (Topografix, https://www.topografix.com/GPX/1/1/). NOT vendored from
 * any third-party library; the implementation is intentionally tiny and
 * regex-based to avoid:
 *
 *   - GPL/AGPL/SSPL contagion in this commercial codebase
 *   - DOMParser / xml2js dependencies (no native DOMParser in RN, and a
 *     bundled XML lib would add 30–80 KB for what is effectively five
 *     element kinds)
 *
 * Scope:
 *   - Track points  <trkpt lat="..." lon="...">
 *   - Route points  <rtept lat="..." lon="...">
 *   - Optional <ele> and <time> children inside each point
 *   - Points are returned in document order across ALL <trk>/<trkseg>/<rte>
 *     (some exporters split a single planned route into multiple <trkseg>s).
 *
 * Out of scope on purpose:
 *   - <wpt> standalone waypoints — these are POIs, not a continuous path.
 *   - GPX 1.0 namespace differences — we accept both since the element shape
 *     is identical.
 *   - GPX extensions (<extensions> blocks). Garmin / Strava put cadence,
 *     heart rate, etc. there; we don't need them for a planned route.
 *
 * The function is pure and runtime-agnostic (RN, Node, Deno).
 */

export type GpxPoint = {
  lat: number
  lng: number
  /** Elevation in meters above sea level, when present. */
  ele?: number
  /** ISO 8601 timestamp from the device, when present. */
  time?: string
}

export type GpxParseResult = {
  /** Points in document order. May span multiple <trk>/<trkseg>/<rte>. */
  points: GpxPoint[]
  /** First <name> encountered inside a <trk> or <rte>, or null if missing. */
  name: string | null
  /** Sum of straight-line haversine distances between successive points (meters). */
  totalLengthMeters: number
}

/**
 * Parse a GPX document and return the union of all track + route points.
 *
 * Throws on malformed input ONLY if no points can be extracted. Tag-level
 * issues (missing <ele>, broken namespaces, stray whitespace) are tolerated
 * because real-world GPX exporters disagree on details.
 */
export function parseGpx(xml: string): GpxParseResult {
  if (typeof xml !== 'string' || xml.trim().length === 0) {
    throw new Error('parseGpx: empty input')
  }

  const points: GpxPoint[] = []
  // Single regex matches both <trkpt …>…</trkpt> and <rtept …>…</rtept>,
  // capturing the attribute soup and the inner block separately. The "[\s\S]"
  // class lets us match across newlines without the global "s" flag (some RN
  // engines historically lacked it).
  const POINT_RE = /<(?:trkpt|rtept)\b([^>]*)(?:\/>|>([\s\S]*?)<\/(?:trkpt|rtept)>)/gi
  let m: RegExpExecArray | null
  while ((m = POINT_RE.exec(xml)) !== null) {
    const attrs = m[1]
    const body = m[2] ?? ''
    const lat = parseAttrNumber(attrs, 'lat')
    const lng = parseAttrNumber(attrs, 'lon')
    if (lat === null || lng === null) continue
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue
    const ele = parseChildNumber(body, 'ele')
    const time = parseChildText(body, 'time')
    const point: GpxPoint = { lat, lng }
    if (ele !== null) point.ele = ele
    if (time !== null) point.time = time
    points.push(point)
  }

  if (points.length === 0) {
    throw new Error('parseGpx: no <trkpt> or <rtept> elements found')
  }

  const name = parseFirstName(xml)
  const totalLengthMeters = computeLineLengthMeters(points)
  return { points, name, totalLengthMeters }
}

/** Convert parsed GPX into a GeoJSON LineString (drops elevation + time). */
export function gpxToGeoJsonLineString(result: GpxParseResult): GeoJsonLineString {
  return {
    type: 'LineString',
    coordinates: result.points.map((p) => [p.lng, p.lat]),
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function parseAttrNumber(attrs: string, name: string): number | null {
  // Match `name="value"` or `name='value'`, allowing arbitrary whitespace.
  const re = new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i')
  const match = re.exec(attrs)
  if (!match) return null
  const n = Number(match[1])
  return Number.isFinite(n) ? n : null
}

function parseChildNumber(body: string, tag: string): number | null {
  const text = parseChildText(body, tag)
  if (text === null) return null
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

function parseChildText(body: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const match = re.exec(body)
  if (!match) return null
  return match[1].trim()
}

function parseFirstName(xml: string): string | null {
  // <name> can sit at <gpx>, <trk>, or <rte> level. Take the first non-empty
  // one — exporters commonly put the route's display name in the outermost
  // <name>.
  const re = /<name[^>]*>([\s\S]*?)<\/name>/i
  const match = re.exec(xml)
  if (!match) return null
  const value = match[1].trim()
  return value.length > 0 ? value : null
}

function computeLineLengthMeters(points: readonly GpxPoint[]): number {
  if (points.length < 2) return 0
  let meters = 0
  for (let i = 1; i < points.length; i++) {
    meters += haversineMeters(points[i - 1], points[i])
  }
  return meters
}

const EARTH_RADIUS_M = 6_371_000

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}
