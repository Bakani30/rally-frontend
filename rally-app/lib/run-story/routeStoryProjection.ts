import { buildDisplayRoutePath } from '../maps/displayRoutePath'
import type { GpsPoint } from '../run-tracking/gps/gpsTypes'

export type RouteStoryPoint = {
  x: number
  y: number
}

export type RouteStoryProjectionOptions = {
  width: number
  height: number
  padding?: number
}

const METERS_PER_DEG_LAT = 111_320
const DEFAULT_PADDING = 24

export function projectRouteForStory(
  path: readonly GpsPoint[],
  options: RouteStoryProjectionOptions,
): RouteStoryPoint[] {
  const width = Math.max(0, options.width)
  const height = Math.max(0, options.height)
  const padding = Math.max(0, Math.min(options.padding ?? DEFAULT_PADDING, width / 2, height / 2))
  const innerWidth = Math.max(0, width - padding * 2)
  const innerHeight = Math.max(0, height - padding * 2)

  if (path.length === 0 || innerWidth === 0 || innerHeight === 0) return []

  const displayPath = buildDisplayRoutePath(path)
  const origin = displayPath[0]
  const metersPerDegLng = Math.max(
    1,
    METERS_PER_DEG_LAT * Math.cos((origin.lat * Math.PI) / 180),
  )
  const meterPoints = displayPath.map((point) => ({
    x: (point.lng - origin.lng) * metersPerDegLng,
    y: (origin.lat - point.lat) * METERS_PER_DEG_LAT,
  }))

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of meterPoints) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  const routeWidth = maxX - minX
  const routeHeight = maxY - minY
  if (routeWidth === 0 && routeHeight === 0) {
    return [{ x: width / 2, y: height / 2 }]
  }

  const safeRouteWidth = routeWidth === 0 ? 1 : routeWidth
  const safeRouteHeight = routeHeight === 0 ? 1 : routeHeight
  const scale = Math.min(innerWidth / safeRouteWidth, innerHeight / safeRouteHeight)
  const scaledWidth = routeWidth * scale
  const scaledHeight = routeHeight * scale
  const offsetX = padding + (innerWidth - scaledWidth) / 2
  const offsetY = padding + (innerHeight - scaledHeight) / 2

  return meterPoints.map((point) => ({
    x: offsetX + (point.x - minX) * scale,
    y: offsetY + (point.y - minY) * scale,
  }))
}

export function storyPointsToSvgPolyline(points: readonly RouteStoryPoint[]): string {
  return points.map((point) => `${round(point.x)},${round(point.y)}`).join(' ')
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}
