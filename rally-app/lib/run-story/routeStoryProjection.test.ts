import { describe, expect, it } from 'vitest'

import type { GpsPoint } from '../run-tracking/gps/gpsTypes'
import { projectRouteForStory, storyPointsToSvgPolyline } from './routeStoryProjection'

const point = (lat: number, lng: number, timestamp: number): GpsPoint => ({
  lat,
  lng,
  accuracy: 5,
  timestamp,
  isPaused: false,
})

describe('projectRouteForStory', () => {
  it('keeps projected route inside the padded story viewport', () => {
    const path = [
      point(13.7, 100.5, 0),
      point(13.7005, 100.501, 1000),
      point(13.701, 100.5005, 2000),
    ]

    const projected = projectRouteForStory(path, { width: 240, height: 320, padding: 32 })

    expect(projected.length).toBeGreaterThanOrEqual(3)
    for (const projectedPoint of projected) {
      expect(projectedPoint.x).toBeGreaterThanOrEqual(32)
      expect(projectedPoint.x).toBeLessThanOrEqual(208)
      expect(projectedPoint.y).toBeGreaterThanOrEqual(32)
      expect(projectedPoint.y).toBeLessThanOrEqual(288)
    }
  })

  it('centers a degenerate route', () => {
    const path = [
      point(13.7, 100.5, 0),
      point(13.7, 100.5, 1000),
    ]

    expect(projectRouteForStory(path, { width: 200, height: 300 })).toEqual([
      { x: 100, y: 150 },
    ])
  })

  it('formats SVG polyline points with stable precision', () => {
    expect(storyPointsToSvgPolyline([
      { x: 1.234, y: 5.678 },
      { x: 9.01, y: 2.34 },
    ])).toBe('1.2,5.7 9,2.3')
  })
})
