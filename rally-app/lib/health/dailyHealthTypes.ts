export const DAILY_HEALTH_SOURCES = [
  'healthkit',
  'health_connect',
  'pedometer',
  'device_motion',
] as const

export type DailyHealthSource = typeof DAILY_HEALTH_SOURCES[number]

export type DailyHealthMetrics = {
  missionDate: string
  distanceMeters: number
  steps: number
  calories: number | null
  avgHeartRate: number | null
  source: DailyHealthSource
}

export type DailyHealthReadWindow = {
  missionDate: string
  start: Date
  end: Date
}
