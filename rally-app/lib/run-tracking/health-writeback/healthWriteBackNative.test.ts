import { describe, expect, it, vi } from 'vitest'
import type { GpsPoint } from '../gps/gpsTypes'
import type { SaveRunToHealthInput } from './healthWriteBackTypes'

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
}))

import { buildHealthConnectWriteBatches } from './healthWriteBackNative'

const path: GpsPoint[] = [
  {
    lat: 13.7563,
    lng: 100.5018,
    accuracy: 8,
    timestamp: Date.parse('2026-05-31T08:00:00.000Z'),
    isPaused: false,
  },
  {
    lat: 13.757,
    lng: 100.502,
    accuracy: 8,
    timestamp: Date.parse('2026-05-31T08:00:05.000Z'),
    isPaused: false,
  },
]

const input: SaveRunToHealthInput = {
  activitySessionId: 'activity-123',
  source: 'gps_live',
  activityType: 'running',
  startedAt: new Date('2026-05-31T08:00:00.000Z'),
  endedAt: new Date('2026-05-31T08:30:00.000Z'),
  durationSeconds: 1800,
  distanceMeters: 5000,
  path,
  title: 'Morning run',
  serverConfirmed: true,
}

describe('buildHealthConnectWriteBatches', () => {
  it('builds Health Connect exercise and distance records as separate insert batches', () => {
    const batches = buildHealthConnectWriteBatches(input, 56)

    expect(batches).toHaveLength(2)
    expect(batches[0]).toMatchObject([
      {
        recordType: 'ExerciseSession',
        exerciseType: 56,
        exerciseRoute: { route: expect.any(Array) },
      },
    ])
    expect(batches[1]).toMatchObject([
      {
        recordType: 'Distance',
        distance: { value: 5000, unit: 'meters' },
      },
    ])
  })
})
