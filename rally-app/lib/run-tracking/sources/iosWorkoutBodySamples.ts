import type { WorkoutBodySamples, WorkoutWindow } from './workoutBodySamples'

const HEART_RATE_TYPE = 'HKQuantityTypeIdentifierHeartRate'
const STEP_TYPE = 'HKQuantityTypeIdentifierStepCount'

type HealthKitModule = typeof import('@kingstinct/react-native-healthkit')
type StepStatistics = { sumQuantity?: { quantity?: number } } | null

async function loadHealthKit(): Promise<HealthKitModule> {
  return import('@kingstinct/react-native-healthkit')
}

export async function readIosWorkoutBodySamples(window: WorkoutWindow): Promise<WorkoutBodySamples> {
  const HealthKit = await loadHealthKit()
  const available = await HealthKit.isHealthDataAvailableAsync()
  if (!available) return { hrSamples: [], steps: null }

  await HealthKit.requestAuthorization({ toRead: [HEART_RATE_TYPE, STEP_TYPE] })

  const [hrSamples, stepStats] = await Promise.all([
    safeQueryHeartRateSamples(HealthKit, window),
    safeQueryStepStatistics(HealthKit, window),
  ])

  return {
    hrSamples,
    steps: stepStats?.sumQuantity?.quantity != null ? Math.round(stepStats.sumQuantity.quantity) : null,
  }
}

async function safeQueryHeartRateSamples(
  HealthKit: HealthKitModule,
  window: WorkoutWindow,
): Promise<WorkoutBodySamples['hrSamples']> {
  try {
    const samples = await HealthKit.queryQuantitySamples(HEART_RATE_TYPE, {
      unit: 'count/min',
      filter: { date: { startDate: window.start, endDate: window.end } },
      limit: 0,
      ascending: true,
    })
    return samples.map((sample) => ({ timestampMs: sample.startDate.getTime(), bpm: sample.quantity }))
  } catch {
    return []
  }
}

async function safeQueryStepStatistics(
  HealthKit: HealthKitModule,
  window: WorkoutWindow,
): Promise<StepStatistics> {
  try {
    return await HealthKit.queryStatisticsForQuantity(STEP_TYPE, ['cumulativeSum'], {
      unit: 'count',
      filter: { date: { startDate: window.start, endDate: window.end } },
    })
  } catch {
    return null
  }
}
