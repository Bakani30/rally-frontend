import { haversineMeters } from '@/lib/run-tracking/gps/gpsDistance'

export type RouteBounds = [number, number, number, number]

export type SummaryRouteCameraMetrics = {
  spreadMeters: number
  distanceMeters: number
  cameraSizeMeters: number
  compactnessRatio: number
}

const SUMMARY_ROUTE_CENTER_ZOOM_MAX_SPREAD_M = 1_400
const SUMMARY_ROUTE_SHORT_SPREAD_M = 320
const SUMMARY_ROUTE_LOOP_COMPACTNESS_RATIO = 0.58
const SUMMARY_ROUTE_MIN_CAMERA_SIZE_M = 320
const SUMMARY_ROUTE_MAX_CAMERA_SIZE_M = 4_000
const SUMMARY_ROUTE_DISTANCE_CONTEXT_RATIO = 0.35
const SUMMARY_ROUTE_DISTANCE_CONTEXT_MAX_M = 1_800
const SUMMARY_ROUTE_MAX_ZOOM = 16.35
const SUMMARY_ROUTE_MIN_ZOOM = 15.05

export function boundsCenter(bounds: RouteBounds): [number, number] {
  const [west, south, east, north] = bounds
  return [(west + east) / 2, (south + north) / 2]
}

export function boundsDiagonalMeters(bounds: RouteBounds): number {
  const [west, south, east, north] = bounds
  return haversineMeters({ lat: south, lng: west }, { lat: north, lng: east })
}

export function summaryRouteCameraMetrics(
  bounds: RouteBounds,
  distanceMeters: number,
): SummaryRouteCameraMetrics {
  const spreadMeters = boundsDiagonalMeters(bounds)
  const safeDistanceMeters = Number.isFinite(distanceMeters) ? Math.max(0, distanceMeters) : 0
  const distanceContextMeters = Math.min(
    safeDistanceMeters * SUMMARY_ROUTE_DISTANCE_CONTEXT_RATIO,
    SUMMARY_ROUTE_DISTANCE_CONTEXT_MAX_M,
  )
  const referenceDistanceMeters = Math.max(spreadMeters, safeDistanceMeters)

  return {
    spreadMeters,
    distanceMeters: safeDistanceMeters,
    cameraSizeMeters: Math.max(
      spreadMeters,
      distanceContextMeters,
      SUMMARY_ROUTE_MIN_CAMERA_SIZE_M,
    ),
    compactnessRatio: referenceDistanceMeters > 0 ? spreadMeters / referenceDistanceMeters : 1,
  }
}

export function shouldUseSummaryRouteCenterZoom(metrics: SummaryRouteCameraMetrics): boolean {
  const isShortRoute = metrics.spreadMeters < SUMMARY_ROUTE_SHORT_SPREAD_M
  const isCompactLoop =
    metrics.spreadMeters < SUMMARY_ROUTE_CENTER_ZOOM_MAX_SPREAD_M
    && metrics.compactnessRatio <= SUMMARY_ROUTE_LOOP_COMPACTNESS_RATIO

  return (
    Number.isFinite(metrics.spreadMeters)
    && metrics.spreadMeters > 0
    && (isShortRoute || isCompactLoop)
  )
}

export function summaryRouteCameraBounds(
  bounds: RouteBounds,
  distanceMeters: number,
): RouteBounds {
  const metrics = summaryRouteCameraMetrics(bounds, distanceMeters)
  if (!shouldUseSummaryRouteCenterZoom(metrics)) return bounds

  const [west, south, east, north] = bounds
  const [centerLng, centerLat] = boundsCenter(bounds)
  const metersPerDegreeLat = 111_320
  const metersPerDegreeLng = Math.max(
    1,
    metersPerDegreeLat * Math.cos((centerLat * Math.PI) / 180),
  )
  const currentWidthMeters = Math.abs(east - west) * metersPerDegreeLng
  const currentHeightMeters = Math.abs(north - south) * metersPerDegreeLat
  const targetWidthMeters = Math.max(currentWidthMeters, metrics.cameraSizeMeters)
  const targetHeightMeters = Math.max(currentHeightMeters, metrics.cameraSizeMeters)
  const halfLng = (targetWidthMeters / 2) / metersPerDegreeLng
  const halfLat = (targetHeightMeters / 2) / metersPerDegreeLat

  return [
    centerLng - halfLng,
    centerLat - halfLat,
    centerLng + halfLng,
    centerLat + halfLat,
  ]
}

export function zoomForSummaryRoute(metrics: SummaryRouteCameraMetrics): number {
  const sizeMeters = Math.max(
    SUMMARY_ROUTE_MIN_CAMERA_SIZE_M,
    Math.min(SUMMARY_ROUTE_MAX_CAMERA_SIZE_M, metrics.cameraSizeMeters),
  )
  const normalized =
    Math.log(sizeMeters / SUMMARY_ROUTE_MIN_CAMERA_SIZE_M)
    / Math.log(SUMMARY_ROUTE_MAX_CAMERA_SIZE_M / SUMMARY_ROUTE_MIN_CAMERA_SIZE_M)
  const zoom = SUMMARY_ROUTE_MAX_ZOOM
    - normalized * (SUMMARY_ROUTE_MAX_ZOOM - SUMMARY_ROUTE_MIN_ZOOM)

  return Math.round(zoom * 100) / 100
}
