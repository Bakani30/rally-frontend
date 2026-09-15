import type { GeoJsonLineString } from './routeTypes'

export type HeartRoutePoint = {
  lat: number
  lng: number
}

const BANGKOK_HEART_CENTER: HeartRoutePoint = {
  lat: 13.7563,
  lng: 100.5018,
}

const METERS_PER_DEG_LAT = 111_320
const DEFAULT_HEART_WIDTH_M = 220
const DEFAULT_HEART_POINTS = 180

export function createHeartRouteFixture(
  center: HeartRoutePoint = BANGKOK_HEART_CENTER,
  widthMeters = DEFAULT_HEART_WIDTH_M,
  pointCount = DEFAULT_HEART_POINTS,
): HeartRoutePoint[] {
  const samples = Math.max(32, pointCount)
  const raw = Array.from({ length: samples }, (_, index) => {
    const t = Math.PI + (2 * Math.PI * index) / (samples - 1)
    return {
      x: 16 * Math.sin(t) ** 3,
      y:
        13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t),
    }
  })

  const xs = raw.map((point) => point.x)
  const ys = raw.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const width = Math.max(1, maxX - minX)
  const height = Math.max(1, maxY - minY)
  const heightMeters = widthMeters * 0.9
  const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos((center.lat * Math.PI) / 180)

  return raw.map((point) => {
    const eastMeters = ((point.x - minX) / width - 0.5) * widthMeters
    const northMeters = ((point.y - minY) / height - 0.5) * heightMeters
    return {
      lat: center.lat + northMeters / METERS_PER_DEG_LAT,
      lng: center.lng + eastMeters / metersPerDegLng,
    }
  })
}

export function createHeartRouteGeoJson(): GeoJsonLineString {
  return {
    type: 'LineString',
    coordinates: createHeartRouteFixture().map((point) => [point.lng, point.lat]),
  }
}
