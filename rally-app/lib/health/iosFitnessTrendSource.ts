import type { FitnessTrend } from './fitnessTrendSource'
import { groupLastPerDay } from './fitnessTrendSource'

const RESTING_HR_TYPE = 'HKQuantityTypeIdentifierRestingHeartRate'
const VO2_MAX_TYPE = 'HKQuantityTypeIdentifierVO2Max'
const SPO2_TYPE = 'HKQuantityTypeIdentifierOxygenSaturation'
const HRV_TYPE = 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN'

type HealthKitModule = typeof import('@kingstinct/react-native-healthkit')

async function loadHealthKit(): Promise<HealthKitModule> {
  return import('@kingstinct/react-native-healthkit')
}

// HealthKit reports SpO2 as a 0-1 fraction; some readings may already arrive as a 0-100 percent.
// Normalize to 0-100 so callers never need to know which shape a given sample used.
export function normalizeSpo2Percent(quantity: number): number {
  return quantity <= 1 ? quantity * 100 : quantity
}

export async function readIosFitnessTrend(days: number, now: Date): Promise<FitnessTrend> {
  const HealthKit = await loadHealthKit()
  const available = await HealthKit.isHealthDataAvailableAsync()
  if (!available) return { restingHrByDay: [], spo2ByDay: [], hrvByDay: [], latestVo2Max: null }

  await HealthKit.requestAuthorization({ toRead: [RESTING_HR_TYPE, VO2_MAX_TYPE, SPO2_TYPE, HRV_TYPE] })

  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const [restingHrByDay, latestVo2Max, spo2ByDay, hrvByDay] = await Promise.all([
    safeQueryRestingHrByDay(HealthKit, startDate, now),
    safeQueryLatestVo2Max(HealthKit, startDate, now),
    safeQuerySpo2ByDay(HealthKit, startDate, now),
    safeQueryHrvByDay(HealthKit, startDate, now),
  ])

  return { restingHrByDay, spo2ByDay, hrvByDay, latestVo2Max }
}

async function safeQueryRestingHrByDay(
  HealthKit: HealthKitModule,
  startDate: Date,
  endDate: Date,
): Promise<FitnessTrend['restingHrByDay']> {
  try {
    const samples = await HealthKit.queryQuantitySamples(RESTING_HR_TYPE, {
      unit: 'count/min',
      filter: { date: { startDate, endDate } },
      limit: 0,
      ascending: true,
    })
    return groupLastPerDay(samples.map((sample) => ({ timestampMs: sample.startDate.getTime(), value: sample.quantity }))).map(
      ({ day, value }) => ({ day, bpm: value }),
    )
  } catch {
    return []
  }
}

async function safeQueryLatestVo2Max(
  HealthKit: HealthKitModule,
  startDate: Date,
  endDate: Date,
): Promise<number | null> {
  try {
    const samples = await HealthKit.queryQuantitySamples(VO2_MAX_TYPE, {
      unit: 'ml/(kg*min)',
      filter: { date: { startDate, endDate } },
      limit: 0,
      ascending: true,
    })
    if (samples.length === 0) return null
    return samples[samples.length - 1].quantity
  } catch {
    return null
  }
}

async function safeQuerySpo2ByDay(
  HealthKit: HealthKitModule,
  startDate: Date,
  endDate: Date,
): Promise<FitnessTrend['spo2ByDay']> {
  try {
    const samples = await HealthKit.queryQuantitySamples(SPO2_TYPE, {
      unit: '%',
      filter: { date: { startDate, endDate } },
      limit: 0,
      ascending: true,
    })
    return groupLastPerDay(
      samples.map((sample) => ({
        timestampMs: sample.startDate.getTime(),
        value: normalizeSpo2Percent(sample.quantity),
      })),
    ).map(({ day, value }) => ({ day, percent: value }))
  } catch {
    return []
  }
}

async function safeQueryHrvByDay(
  HealthKit: HealthKitModule,
  startDate: Date,
  endDate: Date,
): Promise<FitnessTrend['hrvByDay']> {
  try {
    const samples = await HealthKit.queryQuantitySamples(HRV_TYPE, {
      unit: 'ms',
      filter: { date: { startDate, endDate } },
      limit: 0,
      ascending: true,
    })
    return groupLastPerDay(samples.map((sample) => ({ timestampMs: sample.startDate.getTime(), value: sample.quantity }))).map(
      ({ day, value }) => ({ day, ms: value }),
    )
  } catch {
    return []
  }
}
