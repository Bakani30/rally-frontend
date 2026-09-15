import type { FitnessTrend } from './fitnessTrendSource'
import { groupLastPerDay } from './fitnessTrendSource'

type HealthConnectModule = typeof import('react-native-health-connect')
type TimeRangeFilter = { operator: 'between'; startTime: string; endTime: string }

async function loadHealthConnect(): Promise<HealthConnectModule> {
  return import('react-native-health-connect')
}

export async function readAndroidFitnessTrend(days: number, now: Date): Promise<FitnessTrend> {
  const HealthConnect = await loadHealthConnect()
  const initialized = await HealthConnect.initialize()
  if (!initialized) return { restingHrByDay: [], spo2ByDay: [], hrvByDay: [], latestVo2Max: null }

  const granted = await HealthConnect.requestPermission([
    { accessType: 'read', recordType: 'RestingHeartRate' },
    { accessType: 'read', recordType: 'Vo2Max' },
    { accessType: 'read', recordType: 'OxygenSaturation' },
    { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
  ])
  const hasRestingHr = granted.some((p) => p.accessType === 'read' && p.recordType === 'RestingHeartRate')
  const hasVo2Max = granted.some((p) => p.accessType === 'read' && p.recordType === 'Vo2Max')
  const hasSpo2 = granted.some((p) => p.accessType === 'read' && p.recordType === 'OxygenSaturation')
  const hasHrv = granted.some((p) => p.accessType === 'read' && p.recordType === 'HeartRateVariabilityRmssd')

  const timeRangeFilter: TimeRangeFilter = {
    operator: 'between',
    startTime: new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString(),
    endTime: now.toISOString(),
  }

  const [restingHrByDay, latestVo2Max, spo2ByDay, hrvByDay] = await Promise.all([
    hasRestingHr ? safeReadRestingHrByDay(HealthConnect, timeRangeFilter) : Promise.resolve([]),
    hasVo2Max ? safeReadLatestVo2Max(HealthConnect, timeRangeFilter) : Promise.resolve(null),
    hasSpo2 ? safeReadSpo2ByDay(HealthConnect, timeRangeFilter) : Promise.resolve([]),
    hasHrv ? safeReadHrvByDay(HealthConnect, timeRangeFilter) : Promise.resolve([]),
  ])

  return { restingHrByDay, spo2ByDay, hrvByDay, latestVo2Max }
}

async function safeReadRestingHrByDay(
  HealthConnect: HealthConnectModule,
  timeRangeFilter: TimeRangeFilter,
): Promise<FitnessTrend['restingHrByDay']> {
  try {
    const result = await HealthConnect.readRecords('RestingHeartRate', { timeRangeFilter })
    return groupLastPerDay(
      result.records.map((record) => ({
        timestampMs: new Date(record.time).getTime(),
        value: record.beatsPerMinute,
      })),
    ).map(({ day, value }) => ({ day, bpm: value }))
  } catch {
    return []
  }
}

async function safeReadLatestVo2Max(
  HealthConnect: HealthConnectModule,
  timeRangeFilter: TimeRangeFilter,
): Promise<number | null> {
  try {
    const result = await HealthConnect.readRecords('Vo2Max', { timeRangeFilter })
    if (result.records.length === 0) return null
    const latest = result.records.reduce((a, b) => (new Date(a.time) > new Date(b.time) ? a : b))
    return latest.vo2MillilitersPerMinuteKilogram
  } catch {
    return null
  }
}

async function safeReadSpo2ByDay(
  HealthConnect: HealthConnectModule,
  timeRangeFilter: TimeRangeFilter,
): Promise<FitnessTrend['spo2ByDay']> {
  try {
    const result = await HealthConnect.readRecords('OxygenSaturation', { timeRangeFilter })
    return groupLastPerDay(
      result.records.map((record) => ({
        timestampMs: new Date(record.time).getTime(),
        value: record.percentage,
      })),
    ).map(({ day, value }) => ({ day, percent: value }))
  } catch {
    return []
  }
}

async function safeReadHrvByDay(
  HealthConnect: HealthConnectModule,
  timeRangeFilter: TimeRangeFilter,
): Promise<FitnessTrend['hrvByDay']> {
  try {
    const result = await HealthConnect.readRecords('HeartRateVariabilityRmssd', { timeRangeFilter })
    return groupLastPerDay(
      result.records.map((record) => ({
        timestampMs: new Date(record.time).getTime(),
        value: record.heartRateVariabilityMillis,
      })),
    ).map(({ day, value }) => ({ day, ms: value }))
  } catch {
    return []
  }
}
