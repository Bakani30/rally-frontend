import type { ActivityHistoryItem } from '@/lib/activities/history/activityHistoryTypes'
import type { AnalysisProfile } from '@/lib/profile/analysisProfileTypes'
import type { GpsPoint, Split } from '@/lib/run-tracking/gps/gpsTypes'
import { evaluateRouteQuality } from '@/lib/run-tracking/routes/routeQualityGate'

import type { BuildRunInsightInput, RunInsightSource } from './runInsightTypes'

export function buildRunInsightInputFromActivity(
  activity: ActivityHistoryItem,
  profile?: AnalysisProfile | null,
): BuildRunInsightInput {
  const details = activity.running_activity_details
  const path = readRoutePath(details?.route_summary)
  const splits = readSplits(details?.splits)
  const routeQuality = activity.source === 'gps_live' && path.length > 0
    ? evaluateRouteQuality({
      path,
      distanceMeters: details?.distance_meters ?? null,
      durationSeconds: details?.moving_time_seconds ?? activity.duration_seconds ?? null,
    })
    : null

  return {
    startedAt: activity.started_at,
    source: toRunInsightSource(activity.source),
    distanceMeters: details?.distance_meters ?? null,
    movingTimeSeconds: details?.moving_time_seconds ?? activity.duration_seconds ?? null,
    paceSecondsPerKm: details?.pace_seconds_per_km ?? null,
    splits,
    pathPointCount: path.length,
    elevationGainMeters: details?.elevation_gain_meters ?? null,
    avgHeartRate: details?.avg_heart_rate ?? null,
    maxHeartRate: details?.max_heart_rate ?? null,
    avgCadence: details?.avg_cadence ?? null,
    perceivedEffort: activity.perceived_effort ?? null,
    integrityFlags: details?.integrity_flags ?? [],
    routeQuality,
    rewardPolicy: readRewardPolicy(activity.context),
    pointDelta: activity.point_delta,
    profile: profile
      ? {
        birthYear: profile.birthYear,
        competitionCategory: profile.competitionCategory,
        runningLevel: profile.runningLevel,
        primaryGoal: profile.primaryGoal,
        preferredUnits: profile.preferredUnits,
      }
      : null,
  }
}

function toRunInsightSource(source: string): RunInsightSource {
  if (
    source === 'gps_live' ||
    source === 'healthkit' ||
    source === 'health_connect' ||
    source === 'garmin' ||
    source === 'manual'
  ) {
    return source
  }
  return 'manual'
}

function readRewardPolicy(context: Record<string, unknown> | null | undefined): string | null {
  const value = context?.reward_policy
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readRoutePath(routeSummary: Record<string, unknown> | null | undefined): GpsPoint[] {
  const path = routeSummary?.path
  if (!Array.isArray(path)) return []
  return path.filter(isGpsPoint)
}

function readSplits(rawSplits: unknown[] | null | undefined): Split[] {
  if (!Array.isArray(rawSplits)) return []
  return rawSplits
    .map((split) => {
      if (!isRecord(split)) return null
      const km = numberFromUnknown(split.km)
      const timeSeconds = numberFromUnknown(split.timeSeconds ?? split.time_seconds)
      const paceSecondsPerKm = numberFromUnknown(split.paceSecondsPerKm ?? split.pace_seconds_per_km)
      if (km == null || timeSeconds == null || paceSecondsPerKm == null) return null
      return { km, timeSeconds, paceSecondsPerKm }
    })
    .filter((split): split is Split => split !== null)
}

function isGpsPoint(value: unknown): value is GpsPoint {
  if (!isRecord(value)) return false
  return (
    typeof value.lat === 'number' &&
    typeof value.lng === 'number' &&
    typeof value.accuracy === 'number' &&
    typeof value.timestamp === 'number' &&
    typeof value.isPaused === 'boolean'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function numberFromUnknown(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return null
}
