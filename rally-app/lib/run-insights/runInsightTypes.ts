import type { CompetitionCategory, PrimaryGoal, RunningLevel } from '@/lib/profile/analysisProfileTypes'
import type { Split } from '@/lib/run-tracking/gps/gpsTypes'
import type { RouteQualityGateResult } from '@/lib/run-tracking/routes/routeQualityGate'
import type { RunBenchmarkSource } from './runBenchmarkRegistry'

export type RunInsightSource = 'manual' | 'gps_live' | 'healthkit' | 'health_connect' | 'garmin'

export type RunInsightProfile = {
  birthYear?: number | null
  competitionCategory?: CompetitionCategory | null
  runningLevel?: RunningLevel | null
  primaryGoal?: PrimaryGoal | null
  preferredUnits?: 'metric' | 'imperial'
}

export type RunRecoveryContext = {
  sleepMinutes?: number | null
  restingHeartRate?: number | null
  hrvMs?: number | null
}

export type RunInsightHistorySample = {
  source: RunInsightSource
  distanceMeters: number | null
  movingTimeSeconds: number | null
  paceSecondsPerKm: number | null
  pathPointCount?: number | null
  integrityFlags?: unknown[]
}

export type BuildRunInsightInput = RunInsightHistorySample & {
  startedAt?: string | null
  source: RunInsightSource
  distanceMeters: number | null
  movingTimeSeconds: number | null
  paceSecondsPerKm: number | null
  splits?: Split[]
  pathPointCount?: number | null
  elevationGainMeters?: number | null
  avgHeartRate?: number | null
  maxHeartRate?: number | null
  avgCadence?: number | null
  perceivedEffort?: number | null
  integrityFlags?: unknown[]
  routeQuality?: RouteQualityGateResult | null
  rewardPolicy?: string | null
  pointDelta?: number | null
  profile?: RunInsightProfile | null
  recovery?: RunRecoveryContext | null
  history?: RunInsightHistorySample[]
}

export type RunInsightSeverity = 'positive' | 'neutral' | 'warning'
export type RunShareSensitivity = 'public_default' | 'explicit_sensitive'

export type RunInsightCard = {
  id: string
  title: string
  body: string
  severity: RunInsightSeverity
}

export type RunShareCandidate = {
  id: string
  label: string
  value: string
  sensitivity: RunShareSensitivity
}

export type RunInsightStat = {
  id: 'history' | 'pace-code' | 'load-code' | 'control-code' | 'trust-code'
  label: string
  value: string
  detail: string
  severity: RunInsightSeverity
}

export type RunBenchmarkComparisonLevel =
  | 'self_recent'
  | 'web_age_grade'
  | 'web_effort'
  | 'source_note'

export type RunBenchmarkComparison = {
  id: string
  level: RunBenchmarkComparisonLevel
  title: string
  metricLabel: string
  valueLabel: string
  referenceLabel: string
  deltaLabel: string | null
  body: string
  status: 'ready' | 'missing' | 'note'
  severity: RunInsightSeverity
  contextOnly: true
  source?: RunBenchmarkSource
}

export type RunInsightSummary = {
  credibilityCards: RunInsightCard[]
  storyCards: RunInsightCard[]
  historyCards: RunInsightCard[]
  statBoard: RunInsightStat[]
  benchmarkComparisons: RunBenchmarkComparison[]
  trainingTips: RunInsightCard[]
  shareCandidates: RunShareCandidate[]
  sensitiveMetrics: RunShareCandidate[]
}
