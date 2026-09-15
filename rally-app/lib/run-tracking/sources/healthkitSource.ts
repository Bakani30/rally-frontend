import type { GpsPoint } from '../gps/gpsTypes'
import { deriveSplits } from '../session/runSessionDerive'
import type { RunSession, RunSource } from '../session/runSourceAdapter'

/**
 * HealthKit source — iOS only. Imports a single HKWorkout (running) into
 * Rally's canonical RunSession shape. The picker screen drives selection;
 * this module is the boundary between HealthKit's domain types and
 * Rally's run-tracking domain.
 *
 * Permission handling lives in `permissions/healthPermissions.ts`. This
 * source assumes read access has already been granted; if the underlying
 * SDK throws, we surface the error to the caller for display.
 *
 * Why we don't pull route polylines:
 *   HealthKit exposes route locations via HKWorkoutRoute → HKWorkoutRouteQuery,
 *   which is async and can return tens of thousands of points. Phase 2
 *   imports the workout summary; route detail is a Phase 4 enhancement.
 *   The path field stays empty; verification_level=1 (external_health)
 *   bypasses the path-based hygiene checks server-side.
 */

type HealthKitWorkoutInput = {
  /** HKWorkout.uuid — the deduplication key in activity_sessions. */
  uuid: string
  startDate: Date
  endDate: Date
  /** Total distance in meters (HKQuantityTypeIdentifier.distanceWalkingRunning). */
  distanceMeters: number
  /** Activity duration excluding paused intervals. */
  durationSeconds: number
  /** Sum of paused intervals from HKWorkout.activities pause events. */
  pausedDurationSeconds?: number
  avgHeartRate?: number
  totalElevationAscendedMeters?: number
}

export function createHealthKitSource(workout: HealthKitWorkoutInput): RunSource {
  return {
    kind: 'healthkit',
    async produce(): Promise<RunSession> {
      const path: GpsPoint[] = []
      const distanceMeters = Math.max(0, Math.round(workout.distanceMeters))
      const durationSeconds = Math.max(
        1,
        Math.round((workout.endDate.getTime() - workout.startDate.getTime()) / 1000),
      )
      const pausedDurationSeconds = Math.max(0, Math.round(workout.pausedDurationSeconds ?? 0))
      const activeSeconds = Math.max(1, durationSeconds - pausedDurationSeconds)
      const paceSecondsPerKm =
        distanceMeters > 0
          ? Math.round((activeSeconds * 1000) / distanceMeters)
          : 0

      return {
        externalWorkoutId: workout.uuid,
        startedAt: workout.startDate,
        endedAt: workout.endDate,
        distanceMeters,
        durationSeconds: activeSeconds,
        pausedDurationSeconds,
        paceSecondsPerKm,
        path,
        // No path → splits empty. The summary screen falls back to
        // displaying just total distance/duration/pace.
        splits: deriveSplits(path),
        avgHeartRate: workout.avgHeartRate,
        elevationGainMeters: workout.totalElevationAscendedMeters,
        verificationLevel: 1,
        integrityFlags: ['external_health_source'],
      }
    },
  }
}
