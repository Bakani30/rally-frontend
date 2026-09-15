import { describe, expect, it } from 'vitest'
import {
  HEALTH_CONNECT_WRITE_PERMISSIONS,
  HEALTHKIT_WRITE_TYPES,
  hasAllHealthConnectWritePermissions,
} from './healthWriteBackPermissions'

describe('health write-back permission mapping', () => {
  it('requests the iOS workout, route, and running distance write scopes', () => {
    expect(HEALTHKIT_WRITE_TYPES).toEqual([
      'HKWorkoutTypeIdentifier',
      'HKWorkoutRouteTypeIdentifier',
      'HKQuantityTypeIdentifierDistanceWalkingRunning',
    ])
  })

  it('requests Android exercise, distance, and route write permissions', () => {
    expect(HEALTH_CONNECT_WRITE_PERMISSIONS).toEqual([
      { accessType: 'write', recordType: 'ExerciseSession' },
      { accessType: 'write', recordType: 'Distance' },
      { accessType: 'write', recordType: 'ExerciseRoute' },
    ])
  })

  it('checks full Android write grants without accepting partial route grants', () => {
    expect(hasAllHealthConnectWritePermissions([
      { accessType: 'write', recordType: 'ExerciseSession' },
      { accessType: 'write', recordType: 'Distance' },
      { accessType: 'write', recordType: 'ExerciseRoute' },
    ])).toBe(true)

    expect(hasAllHealthConnectWritePermissions([
      { accessType: 'write', recordType: 'ExerciseSession' },
      { accessType: 'write', recordType: 'Distance' },
    ])).toBe(false)
  })
})
