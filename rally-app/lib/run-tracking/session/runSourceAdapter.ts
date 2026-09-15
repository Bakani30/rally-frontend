import type { GpsPoint, Split } from '../gps/gpsTypes'

/**
 * Source abstraction for run sessions. Each kind (gps_live, healthkit,
 * health_connect) implements `RunSource` and produces a canonical
 * `RunSession` shape that the submission service consumes.
 *
 * Server is authoritative on `verificationLevel`. The value here is a hint
 * the source declares; the server recomputes from `kind` regardless and
 * returns its decision in the response.
 *
 * `externalWorkoutId` is always present:
 *   - gps_live: client-generated UUID at session start (idempotent retry)
 *   - healthkit: HKWorkout.uuid
 *   - health_connect: ExerciseSession.id
 *
 * See skills/run-tracking/SKILL.md §Source abstraction.
 */

export type RunSourceKind = 'gps_live' | 'healthkit' | 'health_connect'

export type RunSession = {
  externalWorkoutId: string
  startedAt: Date
  endedAt: Date
  distanceMeters: number
  durationSeconds: number
  pausedDurationSeconds: number
  paceSecondsPerKm: number
  path: GpsPoint[]
  splits: Split[]
  elevationGainMeters?: number
  avgHeartRate?: number
  /** Sanity-clamped pedometer step count for gps_live sessions, if available. */
  steps?: number
  /** Hint from source; server overwrites based on `kind`. */
  verificationLevel: 0 | 1 | 2
  integrityFlags: string[]
}

export interface RunSource {
  readonly kind: RunSourceKind
  /**
   * Produce a finalized RunSession. For gps_live, called on stop after the
   * subscription has been torn down. For healthkit/health_connect, called
   * when the user picks a historical workout to import.
   */
  produce(): Promise<RunSession>
}
