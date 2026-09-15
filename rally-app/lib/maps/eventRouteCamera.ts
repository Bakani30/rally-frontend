import { boundsCenter, type RouteBounds } from '@/lib/maps/routeCamera'

/**
 * Static camera fit for the official event map: the whole planned route must
 * sit inside the viewport with safe padding on all sides, including extra
 * bottom padding reserved for the event detail card. Pure math (web-mercator)
 * so it is testable without MapLibre; the screen sets the result once as the
 * initial camera and never refits after the user pans or zooms.
 */

export type EventCameraViewport = {
  widthPx: number
  heightPx: number
  padding: { top: number; right: number; bottom: number; left: number }
}

export type EventRouteCamera = {
  center: [longitude: number, latitude: number]
  zoom: number
}

/** Web-mercator meters/pixel at zoom 0 on the equator (512px tiles → 256 base). */
const METERS_PER_PIXEL_Z0 = 156_543.03392
/** Never zoom in past this, so short loops keep street context. */
const MAX_ZOOM = 16.5
const MIN_ZOOM = 3
/** Treat tiny routes as at least this large so they are not over-zoomed. */
const MIN_EXTENT_M = 260

const METERS_PER_DEGREE_LAT = 111_320

export function eventRouteCamera(
  bounds: RouteBounds,
  viewport: EventCameraViewport,
): EventRouteCamera {
  const [west, south, east, north] = bounds
  const [centerLng, centerLat] = boundsCenter(bounds)
  const { padding } = viewport

  const usableWidthPx = Math.max(40, viewport.widthPx - padding.left - padding.right)
  const usableHeightPx = Math.max(40, viewport.heightPx - padding.top - padding.bottom)

  const metersPerDegreeLng = Math.max(
    1,
    METERS_PER_DEGREE_LAT * Math.cos((centerLat * Math.PI) / 180),
  )
  const extentXm = Math.max(MIN_EXTENT_M, Math.abs(east - west) * metersPerDegreeLng)
  const extentYm = Math.max(MIN_EXTENT_M, Math.abs(north - south) * METERS_PER_DEGREE_LAT)

  const latScale = Math.max(0.05, Math.cos((centerLat * Math.PI) / 180))
  const zoomForX = Math.log2((METERS_PER_PIXEL_Z0 * latScale * usableWidthPx) / extentXm)
  const zoomForY = Math.log2((METERS_PER_PIXEL_Z0 * latScale * usableHeightPx) / extentYm)
  const zoom = clamp(Math.min(zoomForX, zoomForY), MIN_ZOOM, MAX_ZOOM)

  // Asymmetric padding (big bottom card) shifts the visual center up, so move
  // the camera center down in screen space to keep the route centered in the
  // usable area.
  const metersPerPixel = (METERS_PER_PIXEL_Z0 * latScale) / 2 ** zoom
  const shiftDownPx = (padding.bottom - padding.top) / 2
  const shiftLat = (shiftDownPx * metersPerPixel) / METERS_PER_DEGREE_LAT

  return {
    center: [centerLng, centerLat - shiftLat],
    zoom: Math.round(zoom * 100) / 100,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
