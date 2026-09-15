import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type { GpsPoint, Split } from '../gps/gpsTypes'
import type { RunSourceKind } from './runSourceAdapter'
import { hashGpsPath } from './runSessionHash'
import { sanitizeSplitsForRunSubmission } from './runSessionSubmissionSanitize'
import type { RunBodyMetricsSubmitPayload } from './runBodyMetricsSubmitMapper'

/**
 * Thin transport layer over the `submit-run-session` edge function.
 *
 * Responsibilities:
 *   - Map domain types (Date, GpsPoint) → wire types (ISO string, plain JSON)
 *   - Surface edge-function error envelopes via extractEdgeFunctionError
 *   - Decode result (snake-case is already camelCased on server side)
 *
 * Does NOT contain business logic. Distance/pace recompute, anti-tamper, and
 * verification level decisions all live server-side; the client just claims
 * its numbers and reads back what the server decided.
 */

export type SubmitRunSessionInput = {
  matchId?: string | null
  challengeId?: string | null
  source: RunSourceKind
  externalWorkoutId: string
  startedAt: Date
  endedAt: Date
  distanceMeters: number
  pausedDurationSeconds: number
  path: readonly GpsPoint[]
  splits?: readonly Split[]
  elevationGainMeters?: number
  avgHeartRate?: number
  integrityFlags?: readonly string[]
  steps?: number
  /**
   * Display-only HR-zone/intensity summary, computed best-effort right
   * before submit (see computeSubmitBodyMetrics.ts) on both the live GPS
   * path (makeSubmitDeps) and the health-import path (importHealthRun).
   * Absent whenever the device read/profile fetch fails or yields no HR data.
   */
  bodyMetrics?: RunBodyMetricsSubmitPayload
}

export type SubmitRunSessionResult = {
  activitySessionId: string
  /** 0 = manual, 1 = external_health, 2 = gps_live (server-decided) */
  verificationLevel: 0 | 1 | 2
  /** True when (userId, source, externalWorkoutId) was already on file. */
  alreadyExists: boolean
  /** Server's recomputed distance — UI should display this, not the claim. */
  serverDistanceMeters: number
  serverPaceSecondsPerKm: number
  pointReward: number
  rewardGranted: boolean
  rewardReason: 'solo_run' | 'already_recorded' | 'not_eligible' | 'daily_cap' | 'coop_match_pending'
}

export async function submitRunSession(
  input: SubmitRunSessionInput,
): Promise<SubmitRunSessionResult> {
  const pathForBody = input.path.map((p) => {
    const point: {
      lat: number
      lng: number
      accuracy: number
      altitude?: number
      speed?: number
      timestamp: number
      isPaused: boolean
    } = {
      lat: p.lat,
      lng: p.lng,
      accuracy: p.accuracy,
      timestamp: p.timestamp,
      isPaused: p.isPaused,
    }
    if (p.altitude != null) point.altitude = p.altitude
    if (p.speed != null) point.speed = p.speed
    return point
  })
  const rawDataHash = await hashGpsPath(input.path)

  const sanitizedSplits = sanitizeSplitsForRunSubmission(input.splits)

  const body = {
    matchId: input.matchId ?? undefined,
    challengeId: input.challengeId ?? undefined,
    source: input.source,
    externalWorkoutId: input.externalWorkoutId,
    startedAt: input.startedAt.toISOString(),
    endedAt: input.endedAt.toISOString(),
    distanceMeters: input.distanceMeters,
    pausedDurationSeconds: input.pausedDurationSeconds,
    path: pathForBody,
    splits: sanitizedSplits?.map((s) => ({
      km: s.km,
      timeSeconds: s.timeSeconds,
      paceSecondsPerKm: s.paceSecondsPerKm,
    })),
    elevationGainMeters: input.elevationGainMeters,
    avgHeartRate: input.avgHeartRate,
    integrityFlags: input.integrityFlags ? Array.from(input.integrityFlags) : undefined,
    steps: input.steps,
    rawDataHash,
    bodyMetrics: input.bodyMetrics,
  }

  const { data, error } = await invokeAuthenticatedFunction<SubmitRunSessionResult>(
    'submit-run-session',
    { body },
  )

  if (error) throw await extractEdgeFunctionError(error, 'Failed to submit run session')
  if (!data?.activitySessionId) {
    throw new Error('submit-run-session returned no activitySessionId')
  }
  return data
}
