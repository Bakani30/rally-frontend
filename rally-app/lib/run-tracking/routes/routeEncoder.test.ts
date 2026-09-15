import { describe, expect, it } from 'vitest'
import {
  decodeGeoJsonLineString,
  decodePolyline,
  encodeGeoJsonLineString,
  encodePolyline,
} from './routeEncoder'
import type { GeoJsonLineString } from './routeTypes'

// Tolerance: encode rounds to 1e5 precision, so each coord can drift by up
// to half-a-unit-of-precision = 5e-6 degrees on round trip.
const PRECISION_TOLERANCE = 1e-5

function expectClose(a: number, b: number, tol: number = PRECISION_TOLERANCE): void {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(tol)
}

describe('encodePolyline / decodePolyline — Google canonical fixture', () => {
  // From https://developers.google.com/maps/documentation/utilities/polylinealgorithm
  // Points: (38.5, -120.2), (40.7, -120.95), (43.252, -126.453)
  const points: [number, number][] = [
    [38.5, -120.2],
    [40.7, -120.95],
    [43.252, -126.453],
  ]
  const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@'

  it('encodes the canonical 3-point fixture exactly', () => {
    expect(encodePolyline(points)).toBe(encoded)
  })

  it('decodes the canonical 3-point fixture within tolerance', () => {
    const decoded = decodePolyline(encoded)
    expect(decoded).toHaveLength(3)
    for (let i = 0; i < points.length; i++) {
      expectClose(decoded[i][0], points[i][0])
      expectClose(decoded[i][1], points[i][1])
    }
  })
})

describe('round-trip stability', () => {
  it('encode → decode preserves coords within 1e-5 across mixed signs', () => {
    const points: [number, number][] = [
      [13.756331, 100.501765],   // Bangkok
      [-33.86882, 151.20929],    // Sydney
      [40.712776, -74.005974],   // New York (negative lng)
      [-22.906847, -43.172897],  // Rio (both negative)
      [78.222, 15.6469],         // Svalbard (high lat)
    ]
    const decoded = decodePolyline(encodePolyline(points))
    expect(decoded).toHaveLength(points.length)
    for (let i = 0; i < points.length; i++) {
      expectClose(decoded[i][0], points[i][0])
      expectClose(decoded[i][1], points[i][1])
    }
  })

  it('handles tiny deltas between consecutive points (1m-scale GPS samples)', () => {
    // 1m at the equator is ~9e-6 degrees of longitude — right on the
    // precision boundary. Generate a synthetic 1Hz path of 100 such steps.
    const points: [number, number][] = []
    let lat = 13.7
    let lng = 100.5
    for (let i = 0; i < 100; i++) {
      points.push([lat, lng])
      lat += 1e-5
      lng += 1e-5
    }
    const decoded = decodePolyline(encodePolyline(points))
    expect(decoded).toHaveLength(100)
    expectClose(decoded[0][0], points[0][0])
    expectClose(decoded[99][0], points[99][0])
  })

  it('absorbs sub-precision floating-point noise on input', () => {
    // Add 1e-10 noise — well below the 1e-5 round threshold. Round trip
    // should produce identical decoded values regardless.
    const clean: [number, number][] = [[13.7, 100.5], [13.71, 100.51]]
    const noisy: [number, number][] = clean.map(
      ([la, ln]) => [la + 1e-10, ln - 1e-10] as [number, number],
    )
    expect(encodePolyline(noisy)).toBe(encodePolyline(clean))
  })

  it('single-point round trip', () => {
    const one: [number, number][] = [[1.234567, -89.999999]]
    const decoded = decodePolyline(encodePolyline(one))
    expect(decoded).toHaveLength(1)
    expectClose(decoded[0][0], one[0][0])
    expectClose(decoded[0][1], one[0][1])
  })
})

describe('negative coordinates', () => {
  it('encodes a fully southern-hemisphere west-of-meridian path', () => {
    const points: [number, number][] = [
      [-1.0, -1.0],
      [-2.5, -3.5],
      [-5.0, -10.0],
    ]
    const decoded = decodePolyline(encodePolyline(points))
    for (let i = 0; i < points.length; i++) {
      expectClose(decoded[i][0], points[i][0])
      expectClose(decoded[i][1], points[i][1])
    }
  })

  it('handles extreme antarctic / antimeridian coords', () => {
    const points: [number, number][] = [
      [-89.9, -179.9],
      [-89.9, 179.9],
    ]
    const decoded = decodePolyline(encodePolyline(points))
    expectClose(decoded[0][0], points[0][0])
    expectClose(decoded[0][1], points[0][1])
    expectClose(decoded[1][0], points[1][0])
    expectClose(decoded[1][1], points[1][1])
  })

  it('handles a delta that crosses zero (negative → positive)', () => {
    // First point negative, next positive — encoder emits a large positive delta.
    const points: [number, number][] = [[-1.0, -1.0], [1.0, 1.0]]
    const decoded = decodePolyline(encodePolyline(points))
    expectClose(decoded[1][0], 1.0)
    expectClose(decoded[1][1], 1.0)
  })
})

describe('empty / degenerate inputs', () => {
  it('encodePolyline([]) returns ""', () => {
    expect(encodePolyline([])).toBe('')
  })

  it('decodePolyline("") returns []', () => {
    expect(decodePolyline('')).toEqual([])
  })

  it('round trip on empty is stable', () => {
    expect(decodePolyline(encodePolyline([]))).toEqual([])
    expect(encodePolyline(decodePolyline(''))).toBe('')
  })

  it('encodeGeoJsonLineString on empty coordinates returns ""', () => {
    const empty: GeoJsonLineString = { type: 'LineString', coordinates: [] }
    expect(encodeGeoJsonLineString(empty)).toBe('')
  })

  it('decodeGeoJsonLineString("") returns a valid empty LineString', () => {
    const out = decodeGeoJsonLineString('')
    expect(out.type).toBe('LineString')
    expect(out.coordinates).toEqual([])
  })
})

describe('malformed input is surfaced, not silently mis-decoded', () => {
  it('throws on truncated input (continuation bit at end)', () => {
    // 0x7f = 127 → byte after -63 = 64, which has the 0x20 continuation bit set,
    // expecting another byte. Single-char input therefore cannot terminate.
    expect(() => decodePolyline('')).toThrow(/truncated/)
  })

  it('throws on byte below the 63-offset range', () => {
    // 0x20 - 63 = -31 → invalid (must be >= 0).
    expect(() => decodePolyline(' ')).toThrow(/invalid byte/)
  })
})

describe('GeoJSON [lng, lat] swap correctness', () => {
  it('encode → decode round-trips the LineString with no axis flip', () => {
    // GeoJSON: lng first.
    const line: GeoJsonLineString = {
      type: 'LineString',
      coordinates: [
        [100.5018, 13.7563],   // Bangkok
        [100.5028, 13.7573],
        [100.5038, 13.7583],
      ],
    }
    const encoded = encodeGeoJsonLineString(line)
    const decoded = decodeGeoJsonLineString(encoded)
    expect(decoded.type).toBe('LineString')
    expect(decoded.coordinates).toHaveLength(line.coordinates.length)
    for (let i = 0; i < line.coordinates.length; i++) {
      expectClose(decoded.coordinates[i][0], line.coordinates[i][0]) // lng
      expectClose(decoded.coordinates[i][1], line.coordinates[i][1]) // lat
    }
  })

  it('encoded GeoJSON matches encoding the swapped raw pairs', () => {
    const line: GeoJsonLineString = {
      type: 'LineString',
      coordinates: [
        [-120.2, 38.5],
        [-120.95, 40.7],
        [-126.453, 43.252],
      ],
    }
    const swapped: [number, number][] = line.coordinates.map(
      ([lng, lat]) => [lat, lng] as [number, number],
    )
    expect(encodeGeoJsonLineString(line)).toBe(encodePolyline(swapped))
  })

  it('does NOT match when caller forgets to swap (regression guard)', () => {
    const line: GeoJsonLineString = {
      type: 'LineString',
      coordinates: [[-120.2, 38.5], [-120.95, 40.7]],
    }
    // Naive (wrong) encode treats GeoJSON pairs as already (lat, lng).
    const wrong = encodePolyline(line.coordinates)
    const right = encodeGeoJsonLineString(line)
    expect(wrong).not.toBe(right)
  })
})
