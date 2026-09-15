import type { DailyHealthMetrics, DailyHealthReadWindow } from './dailyHealthTypes'

const STEP_TYPE = 'HKQuantityTypeIdentifierStepCount'
const DISTANCE_TYPE = 'HKQuantityTypeIdentifierDistanceWalkingRunning'
const ACTIVE_ENERGY_TYPE = 'HKQuantityTypeIdentifierActiveEnergyBurned'
const HEART_RATE_TYPE = 'HKQuantityTypeIdentifierHeartRate'

type HealthKitModule = typeof import('@kingstinct/react-native-healthkit')

async function loadHealthKit(): Promise<HealthKitModule> {
  return import('@kingstinct/react-native-healthkit')
}

export async function readIosDailyHealthMetrics(
  window: DailyHealthReadWindow,
): Promise<DailyHealthMetrics> {
  const HealthKit = await loadHealthKit()
  const available = await HealthKit.isHealthDataAvailableAsync()
  if (!available) throw new Error('HealthKit is not available on this device')

  await HealthKit.requestAuthorization({
    toRead: [STEP_TYPE, DISTANCE_TYPE, ACTIVE_ENERGY_TYPE, HEART_RATE_TYPE],
  })

  const [stepStats, distanceStats, calorieStats, heartRateStats] = await Promise.all([
    HealthKit.queryStatisticsForQuantity(STEP_TYPE, ['cumulativeSum'], {
      unit: 'count',
      filter: { date: { startDate: window.start, endDate: window.end } },
    }),
    HealthKit.queryStatisticsForQuantity(DISTANCE_TYPE, ['cumulativeSum'], {
      unit: 'm',
      filter: { date: { startDate: window.start, endDate: window.end } },
    }),
    safeQueryStatistics(HealthKit, ACTIVE_ENERGY_TYPE, ['cumulativeSum'], 'kcal', window),
    safeQueryStatistics(HealthKit, HEART_RATE_TYPE, ['discreteAverage'], 'count/min', window),
  ])

  return {
    missionDate: window.missionDate,
    distanceMeters: Math.max(0, Math.round(distanceStats.sumQuantity?.quantity ?? 0)),
    steps: Math.max(0, Math.round(stepStats.sumQuantity?.quantity ?? 0)),
    calories: optionalRounded(calorieStats?.sumQuantity?.quantity),
    avgHeartRate: optionalRounded(heartRateStats?.averageQuantity?.quantity),
    source: 'healthkit',
  }
}

async function safeQueryStatistics(
  HealthKit: HealthKitModule,
  type: Parameters<HealthKitModule['queryStatisticsForQuantity']>[0],
  statistics: Parameters<HealthKitModule['queryStatisticsForQuantity']>[1],
  unit: string,
  window: DailyHealthReadWindow,
): Promise<{ sumQuantity?: { quantity?: number }; averageQuantity?: { quantity?: number } } | null> {
  try {
    return await HealthKit.queryStatisticsForQuantity(type, statistics, {
      unit,
      filter: { date: { startDate: window.start, endDate: window.end } },
    }) as { sumQuantity?: { quantity?: number }; averageQuantity?: { quantity?: number } }
  } catch {
    return null
  }
}

function optionalRounded(value: unknown): number | null {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? Math.max(0, Math.round(numberValue)) : null
}
