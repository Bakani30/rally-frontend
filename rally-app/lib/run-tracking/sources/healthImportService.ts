import { computeSubmitBodyMetrics } from '../session/computeSubmitBodyMetrics'
import { submitRunSession, type SubmitRunSessionResult } from '../session/runSessionRepository'
import { createHealthConnectSource } from './healthConnectSource'
import { createHealthKitSource } from './healthkitSource'
import type { HealthListItem } from './healthSourceListing'

/**
 * Imports a selected HealthKit / Health Connect workout through the same
 * server contract as gps_live. External-health v0 is summary-only: platform
 * workout stores provide distance/duration identity, while route polylines are
 * deferred to the Phase 4 source adapters.
 */
export async function importHealthRun(
  item: HealthListItem,
  context: { matchId?: string | null; challengeId?: string | null } = {},
): Promise<SubmitRunSessionResult> {
  const source = item.source === 'healthkit'
    ? createHealthKitSource({
        uuid: item.id,
        startDate: item.startedAt,
        endDate: item.endedAt,
        distanceMeters: item.distanceMeters,
        durationSeconds: item.durationSeconds,
      })
    : createHealthConnectSource({
        id: item.id,
        startTime: item.startedAt,
        endTime: item.endedAt,
        distanceMeters: item.distanceMeters,
        activeDurationSeconds: item.durationSeconds,
      })

  const session = await source.produce()
  // Best-effort body summary from the workout's own wall-clock window —
  // readWorkoutBodySamples fills the HR series/steps for the zones. The
  // platform workout summary carries no calories field, so the server keeps
  // its MET estimate (deviceCalories stays null).
  const bodyMetrics = await computeSubmitBodyMetrics({
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    distanceMeters: session.distanceMeters,
    pausedDurationSeconds: session.pausedDurationSeconds,
    fallbackSteps: session.steps ?? null,
    deviceCalories: null,
  })
  return submitRunSession({
    matchId: context.matchId,
    challengeId: context.challengeId,
    source: source.kind,
    externalWorkoutId: session.externalWorkoutId,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    distanceMeters: session.distanceMeters,
    pausedDurationSeconds: session.pausedDurationSeconds,
    path: session.path,
    splits: session.splits,
    elevationGainMeters: session.elevationGainMeters,
    avgHeartRate: session.avgHeartRate,
    integrityFlags: session.integrityFlags,
    bodyMetrics,
  })
}
