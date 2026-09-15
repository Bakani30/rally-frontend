import type { GpsPoint } from '../gps/gpsTypes'
import { deriveSplits } from '../session/runSessionDerive'
import type { RunSession, RunSource } from '../session/runSourceAdapter'

/**
 * Health Connect source — Android only. Imports an ExerciseSession (running)
 * via react-native-health-connect into Rally's canonical RunSession.
 *
 * Same scoping decision as HealthKit: we read summary fields. ExerciseRoute
 * (location samples) lives behind a separate read permission and additional
 * RPC; defer to Phase 4. verification_level=1 keeps the path-light import
 * server-friendly.
 */

type HealthConnectExerciseSessionInput = {
  /** ExerciseSession.metadata.id — dedup key. */
  id: string
  startTime: Date
  endTime: Date
  /** TotalDistanceRecord.distance.inMeters. */
  distanceMeters: number
  /** Duration excluding pauses (sum of segments / activeDuration). */
  activeDurationSeconds: number
  /** Sum of pause segments. */
  pausedDurationSeconds?: number
  avgHeartRate?: number
  totalAscentMeters?: number
}

export function createHealthConnectSource(
  workout: HealthConnectExerciseSessionInput,
): RunSource {
  return {
    kind: 'health_connect',
    async produce(): Promise<RunSession> {
      const path: GpsPoint[] = []
      const distanceMeters = Math.max(0, Math.round(workout.distanceMeters))
      const activeSeconds = Math.max(1, Math.round(workout.activeDurationSeconds))
      const pausedDurationSeconds = Math.max(0, Math.round(workout.pausedDurationSeconds ?? 0))
      const paceSecondsPerKm =
        distanceMeters > 0
          ? Math.round((activeSeconds * 1000) / distanceMeters)
          : 0

      return {
        externalWorkoutId: workout.id,
        startedAt: workout.startTime,
        endedAt: workout.endTime,
        distanceMeters,
        durationSeconds: activeSeconds,
        pausedDurationSeconds,
        paceSecondsPerKm,
        path,
        splits: deriveSplits(path),
        avgHeartRate: workout.avgHeartRate,
        elevationGainMeters: workout.totalAscentMeters,
        verificationLevel: 1,
        integrityFlags: ['external_health_source'],
      }
    },
  }
}
