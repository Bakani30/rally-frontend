import { describe, expect, it } from 'vitest'

import {
  boundsCenter,
  boundsDiagonalMeters,
  shouldUseSummaryRouteCenterZoom,
  summaryRouteCameraBounds,
  summaryRouteCameraMetrics,
  zoomForSummaryRoute,
} from './routeCamera'

describe('route camera helpers', () => {
  it('centers route bounds from west/south/east/north coordinates', () => {
    expect(boundsCenter([100, 13, 101, 14])).toEqual([100.5, 13.5])
  })

  it('keeps genuinely short summary routes close enough to inspect', () => {
    const camera = summaryRouteCameraMetrics([100.5, 13.7, 100.5007, 13.7007], 120)

    expect(shouldUseSummaryRouteCenterZoom(camera)).toBe(true)
    expect(zoomForSummaryRoute(camera)).toBeGreaterThanOrEqual(16.2)
    expect(zoomForSummaryRoute(camera)).toBeLessThanOrEqual(16.4)
  })

  it('keeps compact one-kilometer loops close enough to inspect', () => {
    const camera = summaryRouteCameraMetrics([100.5, 13.7, 100.501, 13.701], 1_050)

    expect(camera.spreadMeters).toBeLessThan(200)
    expect(camera.cameraSizeMeters).toBe(367.5)
    expect(camera.compactnessRatio).toBeLessThan(0.2)
    expect(shouldUseSummaryRouteCenterZoom(camera)).toBe(true)
    expect(zoomForSummaryRoute(camera)).toBeGreaterThanOrEqual(16.25)
    expect(zoomForSummaryRoute(camera)).toBeLessThanOrEqual(16.35)
  })

  it('keeps compact multi-kilometer loops readable instead of pulling far away', () => {
    const camera = summaryRouteCameraMetrics([100.5, 13.7, 100.501, 13.701], 5_000)

    expect(camera.spreadMeters).toBeLessThan(200)
    expect(camera.cameraSizeMeters).toBeGreaterThan(1_700)
    expect(camera.cameraSizeMeters).toBeLessThan(1_800)
    expect(shouldUseSummaryRouteCenterZoom(camera)).toBe(true)
    expect(zoomForSummaryRoute(camera)).toBeGreaterThanOrEqual(15.45)
    expect(zoomForSummaryRoute(camera)).toBeLessThanOrEqual(15.55)
  })

  it('expands compact summary route bounds around the same center before fitting the map', () => {
    const bounds: [number, number, number, number] = [100.5, 13.7, 100.501, 13.701]
    const expanded = summaryRouteCameraBounds(bounds, 1_050)

    expect(boundsCenter(expanded)).toEqual(boundsCenter(bounds))
    expect(boundsDiagonalMeters(expanded)).toBeGreaterThan(510)
    expect(boundsDiagonalMeters(expanded)).toBeLessThan(530)
    expect(expanded[0]).toBeLessThan(bounds[0])
    expect(expanded[1]).toBeLessThan(bounds[1])
    expect(expanded[2]).toBeGreaterThan(bounds[2])
    expect(expanded[3]).toBeGreaterThan(bounds[3])
  })

  it('keeps travel-away summary route bounds unchanged for normal bounds fitting', () => {
    const bounds: [number, number, number, number] = [100.5, 13.7, 100.5, 13.709]

    expect(summaryRouteCameraBounds(bounds, 1_050)).toEqual(bounds)
  })

  it('uses bounds fitting when the route actually travels away from the start', () => {
    const camera = summaryRouteCameraMetrics([100.5, 13.7, 100.5, 13.709], 1_050)

    expect(camera.spreadMeters).toBeGreaterThan(990)
    expect(camera.cameraSizeMeters).toBeGreaterThan(990)
    expect(camera.cameraSizeMeters).toBeLessThan(1_020)
    expect(camera.compactnessRatio).toBeGreaterThan(0.9)
    expect(shouldUseSummaryRouteCenterZoom(camera)).toBe(false)
  })

  it('falls back to bounds fitting for geographically large routes', () => {
    const camera = summaryRouteCameraMetrics([100.5, 13.7, 100.5, 13.741], 5_500)

    expect(camera.spreadMeters).toBeGreaterThan(4_500)
    expect(shouldUseSummaryRouteCenterZoom(camera)).toBe(false)
  })

  it('measures bounds diagonals in meters', () => {
    const diagonal = boundsDiagonalMeters([100.5, 13.7, 100.5, 13.709])

    expect(diagonal).toBeGreaterThan(990)
    expect(diagonal).toBeLessThan(1_020)
  })
})
