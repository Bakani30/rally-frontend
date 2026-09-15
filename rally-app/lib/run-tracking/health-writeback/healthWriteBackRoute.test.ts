import { describe, expect, it } from 'vitest'
import type { GpsPoint } from '../gps/gpsTypes'
import {
  mapGpsPathToAppleHealthRoute,
  mapGpsPathToHealthConnectRoute,
  validRoutePoints,
} from './healthWriteBackRoute'

const basePoint: GpsPoint = {
  lat: 13.7563,
  lng: 100.5018,
  accuracy: 8,
  altitude: 12,
  speed: 3.2,
  timestamp: Date.parse('2026-05-31T08:00:00.000Z'),
  isPaused: false,
}

describe('health write-back route mapping', () => {
  it('filters paused and invalid route points', () => {
    const path: GpsPoint[] = [
      basePoint,
      { ...basePoint, lat: 91, timestamp: basePoint.timestamp + 1000 },
      { ...basePoint, isPaused: true, timestamp: basePoint.timestamp + 2000 },
      { ...basePoint, lat: 13.757, lng: 100.502, timestamp: basePoint.timestamp + 3000 },
    ]

    expect(validRoutePoints(path)).toHaveLength(2)
  })

  it('maps Rally GPS points to Apple Health route locations', () => {
    const route = mapGpsPathToAppleHealthRoute([basePoint])

    expect(route[0]).toMatchObject({
      latitude: 13.7563,
      longitude: 100.5018,
      horizontalAccuracy: 8,
      altitude: 12,
      speed: 3.2,
      verticalAccuracy: 0,
      course: 0,
    })
    expect(route[0].date.toISOString()).toBe('2026-05-31T08:00:00.000Z')
  })

  it('maps Rally GPS points to Health Connect route locations', () => {
    expect(mapGpsPathToHealthConnectRoute([basePoint])).toEqual([
      {
        time: '2026-05-31T08:00:00.000Z',
        latitude: 13.7563,
        longitude: 100.5018,
        horizontalAccuracy: { value: 8, unit: 'meters' },
        altitude: { value: 12, unit: 'meters' },
      },
    ])
  })

  it('uses safe accuracy defaults when the OS reports unusable values', () => {
    const route = mapGpsPathToHealthConnectRoute([{ ...basePoint, accuracy: 0 }])
    expect(route[0].horizontalAccuracy).toEqual({ value: 25, unit: 'meters' })
  })
})
