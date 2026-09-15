import { Platform } from 'react-native'

import type {
  BasketballCourtModeMetrics,
  BasketballCourtModeSource,
} from '@/lib/activities/basketball/courtModeTypes'

const STEP_TYPE = 'HKQuantityTypeIdentifierStepCount'
const DISTANCE_TYPE = 'HKQuantityTypeIdentifierDistanceWalkingRunning'
const ACTIVE_ENERGY_TYPE = 'HKQuantityTypeIdentifierActiveEnergyBurned'
const HEART_RATE_TYPE = 'HKQuantityTypeIdentifierHeartRate'
const RESTING_HEART_RATE_TYPE = 'HKQuantityTypeIdentifierRestingHeartRate'
const WORKOUT_TYPE = 'HKWorkoutTypeIdentifier'
const HEALTHKIT_BASKETBALL_WORKOUT = 6
const HEALTH_CONNECT_BASKETBALL_WORKOUT = 5
const HIGH_CADENCE_STEPS_PER_MINUTE = 95

type CourtModeWindow = {
  start: Date
  end: Date
}

type HealthConnectModule = typeof import('react-native-health-connect')
type HealthKitModule = typeof import('@kingstinct/react-native-healthkit')

export async function readDeviceBasketballCourtMetrics(
  startedAt: Date,
  endedAt: Date,
): Promise<BasketballCourtModeMetrics> {
  if (endedAt.getTime() <= startedAt.getTime()) {
    throw new Error('Court mode end time must be after start time')
  }
  const window = { start: startedAt, end: endedAt }
  const metrics = Platform.OS === 'ios'
    ? await readIosBasketballCourtMetrics(window)
    : Platform.OS === 'android'
      ? await readAndroidBasketballCourtMetrics(window)
      : null

  if (!metrics) throw new Error('Basketball Court Mode sync needs iOS or Android')
  return withPhoneOnlySource(metrics)
}

async function loadHealthKit(): Promise<HealthKitModule> {
  return import('@kingstinct/react-native-healthkit')
}

async function loadHealthConnect(): Promise<HealthConnectModule> {
  return import('react-native-health-connect')
}

async function readIosBasketballCourtMetrics(
  window: CourtModeWindow,
): Promise<BasketballCourtModeMetrics> {
  const HealthKit = await loadHealthKit()
  const available = await HealthKit.isHealthDataAvailableAsync()
  if (!available) throw new Error('HealthKit is not available on this device')

  await HealthKit.requestAuthorization({
    toRead: [
      STEP_TYPE,
      DISTANCE_TYPE,
      ACTIVE_ENERGY_TYPE,
      HEART_RATE_TYPE,
      RESTING_HEART_RATE_TYPE,
      WORKOUT_TYPE,
    ],
  })

  const [steps, distance, calories, heartRate, restingHeartRate, heartRateSamples, workouts] =
    await Promise.all([
      HealthKit.queryStatisticsForQuantity(STEP_TYPE, ['cumulativeSum'], {
        unit: 'count',
        filter: { date: { startDate: window.start, endDate: window.end } },
      }),
      HealthKit.queryStatisticsForQuantity(DISTANCE_TYPE, ['cumulativeSum'], {
        unit: 'm',
        filter: { date: { startDate: window.start, endDate: window.end } },
      }),
      safeQueryStatistics(HealthKit, ACTIVE_ENERGY_TYPE, ['cumulativeSum'], 'kcal', window),
      safeQueryStatistics(HealthKit, HEART_RATE_TYPE, ['discreteAverage', 'discreteMax'], 'count/min', window),
      safeQueryRestingHeartRate(HealthKit, window),
      safeQueryQuantitySamples(HealthKit, HEART_RATE_TYPE, 'count/min', window),
      safeQueryBasketballWorkouts(HealthKit, window),
    ])
  const hrCoverage = estimateSampleCoverageSeconds(heartRateSamples)

  return {
    startedAt: window.start.toISOString(),
    endedAt: window.end.toISOString(),
    source: 'healthkit',
    basketballWorkoutSeconds: sumWorkoutOverlapSeconds(workouts, window),
    steps: Math.max(0, Math.round(steps.sumQuantity?.quantity ?? 0)),
    distanceMeters: Math.max(0, Math.round(distance.sumQuantity?.quantity ?? 0)),
    activeCalories: optionalRounded(calories?.sumQuantity?.quantity),
    avgHeartRate: optionalRounded(heartRate?.averageQuantity?.quantity),
    maxHeartRate: optionalRounded(heartRate?.maximumQuantity?.quantity),
    restingHeartRate: optionalRounded(restingHeartRate?.mostRecentQuantity?.quantity),
    heartRateCoverageSeconds: hrCoverage,
    cadenceHighSeconds: null,
    cadenceMax: null,
  }
}

async function readAndroidBasketballCourtMetrics(
  window: CourtModeWindow,
): Promise<BasketballCourtModeMetrics> {
  const HealthConnect = await loadHealthConnect()
  const initialized = await HealthConnect.initialize()
  if (!initialized) throw new Error('Health Connect is not available on this device')

  const granted = await HealthConnect.requestPermission([
    { accessType: 'read', recordType: 'ExerciseSession' },
    { accessType: 'read', recordType: 'Steps' },
    { accessType: 'read', recordType: 'Distance' },
    { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
    { accessType: 'read', recordType: 'TotalCaloriesBurned' },
    { accessType: 'read', recordType: 'HeartRate' },
    { accessType: 'read', recordType: 'RestingHeartRate' },
    { accessType: 'read', recordType: 'StepsCadence' },
  ])
  const hasCorePermission = granted.some((p) => p.accessType === 'read' && p.recordType === 'Steps')
  if (!hasCorePermission) throw new Error('Health Connect permission was not granted')

  const timeRangeFilter = {
    operator: 'between',
    startTime: window.start.toISOString(),
    endTime: window.end.toISOString(),
  } as const

  const [
    steps,
    distance,
    activeCalories,
    totalCalories,
    heartRate,
    restingHeartRate,
    heartRateRecords,
    cadenceRecords,
    exerciseSessions,
  ] = await Promise.all([
    HealthConnect.aggregateRecord({ recordType: 'Steps', timeRangeFilter }),
    safeAggregateRecord(HealthConnect, 'Distance', timeRangeFilter),
    safeAggregateRecord(HealthConnect, 'ActiveCaloriesBurned', timeRangeFilter),
    safeAggregateRecord(HealthConnect, 'TotalCaloriesBurned', timeRangeFilter),
    safeAggregateRecord(HealthConnect, 'HeartRate', timeRangeFilter),
    safeAggregateRecord(HealthConnect, 'RestingHeartRate', timeRangeFilter),
    safeReadRecords(HealthConnect, 'HeartRate', timeRangeFilter),
    safeReadRecords(HealthConnect, 'StepsCadence', timeRangeFilter),
    safeReadRecords(HealthConnect, 'ExerciseSession', timeRangeFilter),
  ])
  const hrSamples = flattenHealthConnectHeartRateSamples(heartRateRecords)
  const cadenceSamples = flattenHealthConnectCadenceSamples(cadenceRecords)

  return {
    startedAt: window.start.toISOString(),
    endedAt: window.end.toISOString(),
    source: 'health_connect',
    basketballWorkoutSeconds: sumExerciseSessionOverlapSeconds(exerciseSessions, window),
    steps: Math.max(0, Math.round(steps.COUNT_TOTAL ?? 0)),
    distanceMeters: Math.max(0, Math.round(distance?.DISTANCE?.inMeters ?? 0)),
    activeCalories: optionalRounded(
      activeCalories?.ACTIVE_CALORIES_TOTAL?.inKilocalories ??
      totalCalories?.ENERGY_TOTAL?.inKilocalories,
    ),
    avgHeartRate: optionalRounded(heartRate?.BPM_AVG),
    maxHeartRate: optionalRounded(heartRate?.BPM_MAX ?? maxHeartRateFromSamples(hrSamples)),
    restingHeartRate: optionalRounded(restingHeartRate?.BPM_AVG),
    heartRateCoverageSeconds: estimateHealthConnectCoverageSeconds(hrSamples, heartRate?.MEASUREMENTS_COUNT),
    cadenceHighSeconds: estimateHighCadenceSeconds(cadenceSamples),
    cadenceMax: optionalRounded(maxCadence(cadenceSamples)),
  }
}

async function safeQueryStatistics(
  HealthKit: HealthKitModule,
  type: Parameters<HealthKitModule['queryStatisticsForQuantity']>[0],
  statistics: Parameters<HealthKitModule['queryStatisticsForQuantity']>[1],
  unit: string,
  window: CourtModeWindow,
): Promise<{
  sumQuantity?: { quantity?: number }
  averageQuantity?: { quantity?: number }
  maximumQuantity?: { quantity?: number }
} | null> {
  try {
    return await HealthKit.queryStatisticsForQuantity(type, statistics, {
      unit,
      filter: { date: { startDate: window.start, endDate: window.end } },
    }) as {
      sumQuantity?: { quantity?: number }
      averageQuantity?: { quantity?: number }
      maximumQuantity?: { quantity?: number }
    }
  } catch {
    return null
  }
}

async function safeQueryRestingHeartRate(
  HealthKit: HealthKitModule,
  window: CourtModeWindow,
): Promise<{ mostRecentQuantity?: { quantity?: number } } | null> {
  try {
    const startDate = new Date(window.start.getTime() - 30 * 24 * 60 * 60 * 1000)
    return await HealthKit.queryStatisticsForQuantity(RESTING_HEART_RATE_TYPE, ['mostRecent'], {
      unit: 'count/min',
      filter: { date: { startDate, endDate: window.start } },
    }) as { mostRecentQuantity?: { quantity?: number } }
  } catch {
    return null
  }
}

async function safeQueryQuantitySamples(
  HealthKit: HealthKitModule,
  type: Parameters<HealthKitModule['queryQuantitySamples']>[0],
  unit: string,
  window: CourtModeWindow,
): Promise<readonly { startDate: Date; endDate: Date; quantity: number }[]> {
  try {
    return await HealthKit.queryQuantitySamples(type, {
      unit,
      limit: 500,
      ascending: true,
      filter: { date: { startDate: window.start, endDate: window.end } },
    }) as readonly { startDate: Date; endDate: Date; quantity: number }[]
  } catch {
    return []
  }
}

async function safeQueryBasketballWorkouts(
  HealthKit: HealthKitModule,
  window: CourtModeWindow,
): Promise<readonly WorkoutLike[]> {
  try {
    const queryWorkoutSamples = HealthKit.queryWorkoutSamples as unknown as (options: {
      limit: number
      ascending?: boolean
      filter?: {
        workoutActivityType?: number
        date?: { startDate: Date; endDate: Date }
      }
    }) => Promise<readonly WorkoutLike[]>
    return await queryWorkoutSamples({
      limit: 20,
      ascending: false,
      filter: {
        workoutActivityType: HEALTHKIT_BASKETBALL_WORKOUT,
        date: { startDate: window.start, endDate: window.end },
      },
    })
  } catch {
    return []
  }
}

async function safeAggregateRecord(
  HealthConnect: HealthConnectModule,
  recordType: string,
  timeRangeFilter: { operator: 'between'; startTime: string; endTime: string },
): Promise<Record<string, any> | null> {
  try {
    const aggregate = HealthConnect.aggregateRecord as unknown as (input: {
      recordType: string
      timeRangeFilter: typeof timeRangeFilter
    }) => Promise<Record<string, any>>
    return await aggregate({ recordType, timeRangeFilter })
  } catch {
    return null
  }
}

async function safeReadRecords(
  HealthConnect: HealthConnectModule,
  recordType: string,
  timeRangeFilter: { operator: 'between'; startTime: string; endTime: string },
): Promise<readonly Record<string, any>[]> {
  try {
    const readRecords = HealthConnect.readRecords as unknown as (
      type: string,
      request: {
        timeRangeFilter: typeof timeRangeFilter
        ascendingOrder?: boolean
        pageSize?: number
      },
    ) => Promise<{ records: readonly Record<string, any>[] }>
    const result = await readRecords(recordType, {
      timeRangeFilter,
      ascendingOrder: true,
      pageSize: 500,
    })
    return result.records
  } catch {
    return []
  }
}

function withPhoneOnlySource(metrics: BasketballCourtModeMetrics): BasketballCourtModeMetrics {
  if (metrics.basketballWorkoutSeconds > 0) return metrics
  if (metrics.avgHeartRate != null || metrics.maxHeartRate != null) return metrics
  return { ...metrics, source: 'phone_motion' satisfies BasketballCourtModeSource }
}

type WorkoutLike = {
  startDate: Date | string
  endDate: Date | string
  workoutActivityType?: number | string
}

function sumWorkoutOverlapSeconds(workouts: readonly WorkoutLike[], window: CourtModeWindow): number {
  return workouts.reduce((total, workout) => {
    if (!isBasketballWorkout(workout.workoutActivityType, HEALTHKIT_BASKETBALL_WORKOUT)) return total
    return total + overlapSeconds(new Date(workout.startDate), new Date(workout.endDate), window)
  }, 0)
}

function sumExerciseSessionOverlapSeconds(
  records: readonly Record<string, any>[],
  window: CourtModeWindow,
): number {
  return records.reduce((total, record) => {
    if (!isBasketballWorkout(record.exerciseType, HEALTH_CONNECT_BASKETBALL_WORKOUT)) return total
    return total + overlapSeconds(new Date(record.startTime), new Date(record.endTime), window)
  }, 0)
}

function isBasketballWorkout(value: unknown, numericCode: number): boolean {
  return value === numericCode || String(value).toLowerCase().includes('basketball')
}

function overlapSeconds(start: Date, end: Date, window: CourtModeWindow): number {
  const startMs = Math.max(start.getTime(), window.start.getTime())
  const endMs = Math.min(end.getTime(), window.end.getTime())
  return Math.max(0, Math.round((endMs - startMs) / 1000))
}

function estimateSampleCoverageSeconds(
  samples: readonly { startDate: Date; endDate: Date }[],
): number {
  if (!samples.length) return 0
  const sorted = samples
    .map((sample) => ({
      start: new Date(sample.startDate).getTime(),
      end: new Date(sample.endDate).getTime(),
    }))
    .filter((sample) => Number.isFinite(sample.start) && Number.isFinite(sample.end))
    .sort((a, b) => a.start - b.start)
  if (!sorted.length) return 0
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  return Math.max(0, Math.min(15 * 60, Math.round((last.end - first.start) / 1000) + 30))
}

function flattenHealthConnectHeartRateSamples(
  records: readonly Record<string, any>[],
): { time: string; beatsPerMinute: number }[] {
  return records.flatMap((record) => Array.isArray(record.samples) ? record.samples : [])
}

function flattenHealthConnectCadenceSamples(
  records: readonly Record<string, any>[],
): { time: string; rate: number }[] {
  return records.flatMap((record) => Array.isArray(record.samples) ? record.samples : [])
}

function estimateHealthConnectCoverageSeconds(
  samples: readonly { time: string }[],
  aggregateCount: unknown,
): number {
  if (!samples.length) {
    const count = Number(aggregateCount)
    return Number.isFinite(count) ? Math.min(15 * 60, Math.round(count) * 10) : 0
  }
  const times = samples
    .map((sample) => new Date(sample.time).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
  if (!times.length) return 0
  return Math.max(0, Math.min(15 * 60, Math.round((times[times.length - 1] - times[0]) / 1000) + 30))
}

function estimateHighCadenceSeconds(samples: readonly { rate: number }[]): number {
  const highSamples = samples.filter((sample) => Number(sample.rate) >= HIGH_CADENCE_STEPS_PER_MINUTE)
  return highSamples.length ? Math.min(15 * 60, highSamples.length * 30) : 0
}

function maxHeartRateFromSamples(samples: readonly { beatsPerMinute: number }[]): number | null {
  const values = samples.map((sample) => Number(sample.beatsPerMinute)).filter(Number.isFinite)
  return values.length ? Math.max(...values) : null
}

function maxCadence(samples: readonly { rate: number }[]): number | null {
  const values = samples.map((sample) => Number(sample.rate)).filter(Number.isFinite)
  return values.length ? Math.max(...values) : null
}

function optionalRounded(value: unknown): number | null {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? Math.max(0, Math.round(numberValue)) : null
}
