import { DAILY_MISSION_DISTANCE_METERS } from './dailyMissionTypes'

/** Kilometres still needed to reach the daily walk goal (clamped to 0 once met). */
export function remainingDailyMissionKm(distanceMeters: number): number {
  const remaining = (DAILY_MISSION_DISTANCE_METERS - distanceMeters) / 1000
  return remaining > 0 ? remaining : 0
}
