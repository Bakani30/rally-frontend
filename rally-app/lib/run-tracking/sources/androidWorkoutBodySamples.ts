import type { WorkoutBodySamples, WorkoutWindow } from './workoutBodySamples'

type HealthConnectModule = typeof import('react-native-health-connect')

async function loadHealthConnect(): Promise<HealthConnectModule> {
  return import('react-native-health-connect')
}

export async function readAndroidWorkoutBodySamples(window: WorkoutWindow): Promise<WorkoutBodySamples> {
  const HealthConnect = await loadHealthConnect()
  const initialized = await HealthConnect.initialize()
  if (!initialized) return { hrSamples: [], steps: null }

  const granted = await HealthConnect.requestPermission([
    { accessType: 'read', recordType: 'HeartRate' },
    { accessType: 'read', recordType: 'Steps' },
  ])
  const hasHr = granted.some((p) => p.accessType === 'read' && p.recordType === 'HeartRate')
  const hasSteps = granted.some((p) => p.accessType === 'read' && p.recordType === 'Steps')

  const timeRangeFilter = {
    operator: 'between',
    startTime: window.start.toISOString(),
    endTime: window.end.toISOString(),
  } as const

  const [hrSamples, steps] = await Promise.all([
    hasHr ? safeReadHeartRateSamples(HealthConnect, timeRangeFilter) : Promise.resolve([]),
    hasSteps ? safeAggregateSteps(HealthConnect, timeRangeFilter) : Promise.resolve(null),
  ])

  return { hrSamples, steps }
}

async function safeReadHeartRateSamples(
  HealthConnect: HealthConnectModule,
  timeRangeFilter: { operator: 'between'; startTime: string; endTime: string },
): Promise<WorkoutBodySamples['hrSamples']> {
  try {
    const result = await HealthConnect.readRecords('HeartRate', { timeRangeFilter })
    return result.records.flatMap((record) =>
      record.samples.map((sample) => ({
        timestampMs: new Date(sample.time).getTime(),
        bpm: sample.beatsPerMinute,
      })),
    )
  } catch {
    return []
  }
}

async function safeAggregateSteps(
  HealthConnect: HealthConnectModule,
  timeRangeFilter: { operator: 'between'; startTime: string; endTime: string },
): Promise<number | null> {
  try {
    const result = await HealthConnect.aggregateRecord({ recordType: 'Steps', timeRangeFilter })
    return result.COUNT_TOTAL != null ? Math.round(result.COUNT_TOTAL) : null
  } catch {
    return null
  }
}
