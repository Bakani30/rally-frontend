// Assembles QuestDoneInputs from existing data hooks for the hub done-detection.
// No direct DB/network calls — delegates to useQuestDailyState and useDailyMissionToday.
import type { QuestDoneInputs } from '@/lib/quest-proof/questDoneState'
import type { QuestProofStatus } from '@/lib/quest-proof/questProofTypes'
import { DAILY_MISSION_DISTANCE_METERS } from '@/lib/daily-mission/dailyMissionTypes'
import { useDailyMissionToday } from './useDailyMissionToday'
import { useQuestDailyState } from './useQuestDailyState'

/**
 * Assembles QuestDoneInputs from available hooks.
 *
 * - sessionStatusByTemplate: keyed by templateId, status only (filters 'none').
 * - healthGoalMet: true when today's dailyMission sync recorded ≥ 7km. Read from
 *   the shared query cache the sync mutation publishes to (useDailyMissionToday),
 *   NOT from a hub-local mutation — so it reflects a sync fired anywhere (home
 *   card or the sensor_sync quest popup). Defaults to false until a sync lands.
 * - checkedInActivities: empty Set — no geofence check-in hook is available this
 *   pass. Geofence quests will always show as not-done until this is wired.
 */
export function useQuestDoneInputs(userId?: string): {
  inputs: QuestDoneInputs
  isLoading: boolean
} {
  const daily = useQuestDailyState(userId)
  // Read-only observer of the sync result written to the shared cache key.
  const dailyMission = useDailyMissionToday(userId)

  const sessionStatusByTemplate: Record<string, QuestProofStatus> = {}
  for (const [templateId, state] of Object.entries(daily.data ?? {})) {
    if (state.status !== 'none') {
      sessionStatusByTemplate[templateId] = state.status
    }
  }

  const distanceMeters = dailyMission.data?.metrics.distanceMeters ?? 0
  const healthGoalMet = distanceMeters >= DAILY_MISSION_DISTANCE_METERS

  const inputs: QuestDoneInputs = {
    sessionStatusByTemplate,
    healthGoalMet,
    // No geofence check-in hook available — always empty this pass.
    checkedInActivities: new Set<string>(),
  }

  return {
    inputs,
    isLoading: daily.isPending,
  }
}
