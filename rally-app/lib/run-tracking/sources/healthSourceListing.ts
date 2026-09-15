import { Platform } from 'react-native'
import { healthWorkoutDedupeKey } from './healthWorkoutIdentity'
export { healthWorkoutDedupeKey } from './healthWorkoutIdentity'

/**
 * Lightweight facade for "list recent running workouts I can import".
 * Returns the same shape regardless of platform so the sync screen can
 * render one list of cards. Enough info to decide whether to import
 * (start time, distance, duration); the actual mapping into RunSession
 * happens via createHealthKitSource / createHealthConnectSource using
 * the same record id.
 *
 * SDKs are require()-loaded behind Platform branches so this module is
 * safe to import from cross-platform code.
 */

export type HealthListItem = {
  /** Stable id used for both display key and as externalWorkoutId. */
  id: string
  startedAt: Date
  endedAt: Date
  distanceMeters: number
  durationSeconds: number
  source: 'healthkit' | 'health_connect'
}

const LOOKBACK_DAYS = 14
const DEFAULT_LIMIT = 50

export type ListRecentHealthRunsOptions = {
  since?: Date
  now?: Date
  limit?: number
}

export async function listRecentHealthRuns(
  options: ListRecentHealthRunsOptions = {},
): Promise<HealthListItem[]> {
  const runs =
    Platform.OS === 'ios'
      ? await listHealthKitRuns(options)
      : Platform.OS === 'android'
        ? await listHealthConnectRuns(options)
        : []
  return dedupeHealthRuns(runs)
}

function dedupeHealthRuns(items: readonly HealthListItem[]): HealthListItem[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = healthWorkoutDedupeKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function listHealthKitRuns(options: ListRecentHealthRunsOptions): Promise<HealthListItem[]> {
  try {
    const hk = require('@kingstinct/react-native-healthkit') as {
      queryWorkoutSamples: (options: {
        from: Date
        to: Date
        ascending?: boolean
        limit?: number
        filter?: { workoutActivityType?: string }
      }) => Promise<readonly HealthKitWorkoutLike[]>
    }
    const now = options.now ?? new Date()
    const from = options.since ?? new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    const samples = await hk.queryWorkoutSamples({
      from,
      to: now,
      ascending: false,
      limit: options.limit ?? DEFAULT_LIMIT,
      filter: { workoutActivityType: 'running' },
    })
    return samples.map((s): HealthListItem => ({
      id: s.uuid,
      startedAt: new Date(s.startDate),
      endedAt: new Date(s.endDate),
      distanceMeters: Math.round(s.totalDistance?.quantity ?? 0),
      durationSeconds: Math.max(
        0,
        Math.round((new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 1000),
      ),
      source: 'healthkit',
    })).filter((item) => item.endedAt >= from)
  } catch (err) {
    console.warn('[health] HealthKit query failed', err)
    return []
  }
}

async function listHealthConnectRuns(options: ListRecentHealthRunsOptions): Promise<HealthListItem[]> {
  try {
    const hc = require('react-native-health-connect') as {
      initialize: () => Promise<boolean>
      readRecords: (
        type: 'ExerciseSession',
        request: {
          timeRangeFilter: { operator: 'between'; startTime: string; endTime: string }
          ascendingOrder?: boolean
          pageSize?: number
        },
      ) => Promise<{ records: readonly ExerciseSessionLike[] }>
    }
    if (!(await hc.initialize())) return []
    const now = options.now ?? new Date()
    const from = options.since ?? new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    const result = await hc.readRecords('ExerciseSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: from.toISOString(),
        endTime: now.toISOString(),
      },
      ascendingOrder: false,
      pageSize: options.limit ?? DEFAULT_LIMIT,
    })
    return result.records
      .filter((r) => r.exerciseType === 'EXERCISE_TYPE_RUNNING' || r.exerciseType === 56)
      .map((r): HealthListItem => ({
        id: r.metadata.id,
        startedAt: new Date(r.startTime),
        endedAt: new Date(r.endTime),
        distanceMeters: Math.round(r.distance?.inMeters ?? 0),
        durationSeconds: Math.max(
          0,
          Math.round((new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 1000),
        ),
        source: 'health_connect',
      }))
      .filter((item) => item.endedAt >= from)
  } catch (err) {
    console.warn('[health] Health Connect query failed', err)
    return []
  }
}

// Loose shapes — actual SDK types vary by version, kept narrow on purpose
// so a minor SDK bump doesn't break our mapping layer.
type HealthKitWorkoutLike = {
  uuid: string
  startDate: string | Date
  endDate: string | Date
  totalDistance?: { quantity: number }
}

type ExerciseSessionLike = {
  metadata: { id: string }
  startTime: string
  endTime: string
  exerciseType?: number | string
  distance?: { inMeters: number }
}
