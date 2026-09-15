import { Platform } from 'react-native'
import {
  buildHealthConnectClientRecordId,
  buildHealthWriteBackMetadata,
} from './healthWriteBackMetadata'
import {
  mapGpsPathToAppleHealthRoute,
  mapGpsPathToHealthConnectRoute,
} from './healthWriteBackRoute'
import type {
  HealthWriteBackPlatform,
  HealthWriteBackWriter,
  HealthWriteBackWriterResult,
  SaveRunToHealthInput,
} from './healthWriteBackTypes'

const APPLE_HEALTH_RUNNING_ACTIVITY_TYPE = 37
const HEALTH_CONNECT_RUNNING_EXERCISE_TYPE = 56
const HEALTH_CONNECT_ACTIVELY_RECORDED = 1

export const nativeHealthWriteBackWriter: HealthWriteBackWriter = {
  async save(input) {
    if (Platform.OS === 'ios') return saveRunToAppleHealth(input)
    if (Platform.OS === 'android') return saveRunToHealthConnect(input)
    throw new Error('Health write-back is unavailable on this platform.')
  },
}

export function getNativeHealthWriteBackPlatform(): HealthWriteBackPlatform | null {
  if (Platform.OS === 'ios') return 'ios'
  if (Platform.OS === 'android') return 'android'
  return null
}

async function saveRunToAppleHealth(
  input: SaveRunToHealthInput,
): Promise<HealthWriteBackWriterResult> {
  const HealthKit = require('@kingstinct/react-native-healthkit') as {
    WorkoutActivityType?: { running?: number }
    saveWorkoutSample: (
      workoutActivityType: number,
      quantities: readonly unknown[],
      startDate: Date,
      endDate: Date,
      totals?: { distance?: number },
      metadata?: Record<string, string>,
    ) => Promise<{ uuid?: string; saveWorkoutRoute?: (locations: readonly unknown[]) => Promise<boolean> }>
  }

  const workout = await HealthKit.saveWorkoutSample(
    HealthKit.WorkoutActivityType?.running ?? APPLE_HEALTH_RUNNING_ACTIVITY_TYPE,
    [],
    input.startedAt,
    input.endedAt,
    { distance: input.distanceMeters },
    buildHealthWriteBackMetadata(input),
  )

  const route = mapGpsPathToAppleHealthRoute(input.path)
  if (route.length >= 2 && workout.saveWorkoutRoute) {
    await workout.saveWorkoutRoute(route)
  }

  return { recordId: workout.uuid ?? input.activitySessionId }
}

async function saveRunToHealthConnect(
  input: SaveRunToHealthInput,
): Promise<HealthWriteBackWriterResult> {
  const HC = require('react-native-health-connect') as {
    ExerciseType?: { RUNNING?: number }
    insertRecords: (records: unknown[]) => Promise<string[]>
  }
  const route = mapGpsPathToHealthConnectRoute(input.path)
  if (route.length < 2) {
    throw new Error('Route data is required for Health Connect write-back.')
  }

  const startTime = input.startedAt.toISOString()
  const endTime = input.endedAt.toISOString()
  const [sessionBatch, distanceBatch] = buildHealthConnectWriteBatches(
    input,
    HC.ExerciseType?.RUNNING ?? HEALTH_CONNECT_RUNNING_EXERCISE_TYPE,
  )

  const sessionRecordIds = await HC.insertRecords(sessionBatch)
  await HC.insertRecords(distanceBatch)

  return { recordId: sessionRecordIds[0] ?? buildHealthConnectClientRecordId(input.activitySessionId, 'session') }
}

export function buildHealthConnectWriteBatches(
  input: SaveRunToHealthInput,
  exerciseType = HEALTH_CONNECT_RUNNING_EXERCISE_TYPE,
): [unknown[], unknown[]] {
  const route = mapGpsPathToHealthConnectRoute(input.path)
  if (route.length < 2) {
    throw new Error('Route data is required for Health Connect write-back.')
  }

  const startTime = input.startedAt.toISOString()
  const endTime = input.endedAt.toISOString()
  const sessionClientRecordId = buildHealthConnectClientRecordId(input.activitySessionId, 'session')
  const distanceClientRecordId = buildHealthConnectClientRecordId(input.activitySessionId, 'distance')

  const sessionRecord = {
    recordType: 'ExerciseSession',
    exerciseType,
    startTime,
    endTime,
    title: input.title || 'Rally Run',
    notes: 'Recorded by Rally.',
    exerciseRoute: { route },
    metadata: {
      clientRecordId: sessionClientRecordId,
      clientRecordVersion: 1,
      recordingMethod: HEALTH_CONNECT_ACTIVELY_RECORDED,
    },
  }
  const distanceRecord = {
    recordType: 'Distance',
    startTime,
    endTime,
    distance: { value: input.distanceMeters, unit: 'meters' },
    metadata: {
      clientRecordId: distanceClientRecordId,
      clientRecordVersion: 1,
      recordingMethod: HEALTH_CONNECT_ACTIVELY_RECORDED,
    },
  }

  return [[sessionRecord], [distanceRecord]]
}
