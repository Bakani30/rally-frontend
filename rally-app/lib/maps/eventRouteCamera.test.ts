import { describe, expect, it } from 'vitest'

import type { RouteBounds } from './routeCamera'
import { eventRouteCamera, type EventCameraViewport } from './eventRouteCamera'

const VIEWPORT: EventCameraViewport = {
  widthPx: 390,
  heightPx: 780,
  padding: { top: 90, right: 24, bottom: 280, left: 24 },
}

// ~2.2 km x ~1.1 km around Lumpini Park, Bangkok.
const PARK_BOUNDS: RouteBounds = [100.5380, 13.7270, 100.5580, 13.7370]
// ~44 km point-to-point (city-to-city scale).
const LONG_BOUNDS: RouteBounds = [100.50, 13.70, 100.90, 13.90]
// Tiny 400 m loop.
const SHORT_BOUNDS: RouteBounds = [100.5410, 13.7300, 100.5414, 13.7304]

/** Meters/pixel at the camera's zoom and latitude (web mercator). */
function metersPerPixel(zoom: number, lat: number): number {
  return (156_543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom
}

function visibleSpanMeters(zoom: number, lat: number, px: number): number {
  return metersPerPixel(zoom, lat) * px
}

describe('eventRouteCamera', () => {
  it('fits the whole route inside the padded viewport', () => {
    const camera = eventRouteCamera(PARK_BOUNDS, VIEWPORT)
    const usableW = VIEWPORT.widthPx - VIEWPORT.padding.left - VIEWPORT.padding.right
    const usableH = VIEWPORT.heightPx - VIEWPORT.padding.top - VIEWPORT.padding.bottom
    const extentXm = Math.abs(PARK_BOUNDS[2] - PARK_BOUNDS[0]) * 111_320 * Math.cos((13.732 * Math.PI) / 180)
    const extentYm = Math.abs(PARK_BOUNDS[3] - PARK_BOUNDS[1]) * 111_320
    expect(visibleSpanMeters(camera.zoom, camera.center[1], usableW)).toBeGreaterThanOrEqual(extentXm)
    expect(visibleSpanMeters(camera.zoom, camera.center[1], usableH)).toBeGreaterThanOrEqual(extentYm)
  })

  it('reserves bottom padding by shifting the camera center south', () => {
    const camera = eventRouteCamera(PARK_BOUNDS, VIEWPORT)
    const geographicCenterLat = (PARK_BOUNDS[1] + PARK_BOUNDS[3]) / 2
    expect(camera.center[1]).toBeLessThan(geographicCenterLat)
  })

  it('does not shift the center when padding is symmetric', () => {
    const camera = eventRouteCamera(PARK_BOUNDS, {
      ...VIEWPORT,
      padding: { top: 40, right: 24, bottom: 40, left: 24 },
    })
    expect(camera.center[1]).toBeCloseTo((PARK_BOUNDS[1] + PARK_BOUNDS[3]) / 2, 10)
    expect(camera.center[0]).toBeCloseTo((PARK_BOUNDS[0] + PARK_BOUNDS[2]) / 2, 10)
  })

  it('does not over-zoom a short compact loop', () => {
    const camera = eventRouteCamera(SHORT_BOUNDS, VIEWPORT)
    expect(camera.zoom).toBeLessThanOrEqual(16.5)
  })

  it('zooms out enough that a long route is not cropped', () => {
    const long = eventRouteCamera(LONG_BOUNDS, VIEWPORT)
    const short = eventRouteCamera(SHORT_BOUNDS, VIEWPORT)
    expect(long.zoom).toBeLessThan(short.zoom)
    const usableH = VIEWPORT.heightPx - VIEWPORT.padding.top - VIEWPORT.padding.bottom
    const extentYm = Math.abs(LONG_BOUNDS[3] - LONG_BOUNDS[1]) * 111_320
    expect(visibleSpanMeters(long.zoom, long.center[1], usableH)).toBeGreaterThanOrEqual(extentYm)
  })

  it('is deterministic', () => {
    expect(eventRouteCamera(PARK_BOUNDS, VIEWPORT)).toEqual(eventRouteCamera(PARK_BOUNDS, VIEWPORT))
  })
})
