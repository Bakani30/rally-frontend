import type { DailyHealthMetrics, DailyHealthReadWindow } from './dailyHealthTypes'

type HealthConnectModule = typeof import('react-native-health-connect')

async function loadHealthConnect(): Promise<HealthConnectModule> {
  return import('react-native-health-connect')
}

export async function readAndroidDailyHealthMetrics(
  window: DailyHealthReadWindow,
): Promise<DailyHealthMetrics> {
  const HealthConnect = await loadHealthConnect()
  const initialized = await HealthConnect.initialize()
  if (!initialized) throw new Error('Health Connect is not available on this device')

  const granted = await HealthConnect.requestPermission([
    { accessType: 'read', recordType: 'Steps' },
    { accessType: 'read', recordType: 'Distance' },
    { accessType: 'read', recordType: 'TotalCaloriesBurned' },
    { accessType: 'read', recordType: 'HeartRate' },
  ])
  const hasSteps = granted.some((p) => p.accessType === 'read' && p.recordType === 'Steps')
  const hasDistance = granted.some((p) => p.accessType === 'read' && p.recordType === 'Distance')
  if (!hasSteps || !hasDistance) {
    throw new Error('Health Connect permission was not granted')
  }

  const timeRangeFilter = {
    operator: 'between',
    startTime: window.start.toISOString(),
    endTime: window.end.toISOString(),
  } as const

  const [steps, distance, calories, heartRate] = await Promise.all([
    HealthConnect.aggregateRecord({ recordType: 'Steps', timeRangeFilter }),
    HealthConnect.aggregateRecord({ recordType: 'Distance', timeRangeFilter }),
    safeAggregateRecord(HealthConnect, 'TotalCaloriesBurned', timeRangeFilter),
    safeAggregateRecord(HealthConnect, 'HeartRate', timeRangeFilter),
  ])

  return {
    missionDate: window.missionDate,
    distanceMeters: Math.max(0, Math.round(distance.DISTANCE?.inMeters ?? 0)),
    steps: Math.max(0, Math.round(steps.COUNT_TOTAL ?? 0)),
    calories: optionalRounded((calories as { ENERGY_TOTAL?: { inKilocalories?: number } } | null)?.ENERGY_TOTAL?.inKilocalories),
    avgHeartRate: optionalRounded((heartRate as { BPM_AVG?: number } | null)?.BPM_AVG),
    source: 'health_connect',
  }
}

async function safeAggregateRecord(
  HealthConnect: HealthConnectModule,
  recordType: string,
  timeRangeFilter: { operator: 'between'; startTime: string; endTime: string },
): Promise<Record<string, unknown> | null> {
  try {
    const aggregate = HealthConnect.aggregateRecord as unknown as (input: {
      recordType: string
      timeRangeFilter: typeof timeRangeFilter
    }) => Promise<Record<string, unknown>>
    return await aggregate({ recordType, timeRangeFilter })
  } catch {
    return null
  }
}

function optionalRounded(value: unknown): number | null {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? Math.max(0, Math.round(numberValue)) : null
}
