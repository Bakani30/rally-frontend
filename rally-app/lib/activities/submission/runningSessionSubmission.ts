import type { RunningSubmissionData } from './submissionTypes'

export type RunningSessionSubmissionMetricInput = {
  serverDistanceMeters?: number | null
  serverPaceSecondsPerKm?: number | null
}

export function buildRunningSubmissionDataFromSession(
  input: RunningSessionSubmissionMetricInput,
): RunningSubmissionData {
  const serverDistance = Math.max(0, Math.round(input.serverDistanceMeters ?? 0))
  const serverPace = Math.max(0, Math.round(input.serverPaceSecondsPerKm ?? 0))
  const movingTime = serverDistance > 0 && serverPace > 0
    ? Math.max(1, Math.round((serverDistance * serverPace) / 1000))
    : 1

  return {
    distance_meters: Math.max(1, serverDistance),
    moving_time_seconds: movingTime,
  }
}
