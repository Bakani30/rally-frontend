// Pure: sort quest views running-first, then rewardPoints desc, titleTH tiebreak (th locale), take n.
// Running quests surface first so the sensor_sync progress card is always visible.
// No React/RN imports.
import type { QuestTemplateView } from './questProofTypes'

export function homeDailyQuestOrder(views: QuestTemplateView[], n: number): QuestTemplateView[] {
  return [...views]
    .sort((a, b) => {
      const aGroup = a.activity === 'running' ? 0 : 1
      const bGroup = b.activity === 'running' ? 0 : 1
      if (aGroup !== bGroup) return aGroup - bGroup
      return b.rewardPoints - a.rewardPoints || a.titleTH.localeCompare(b.titleTH, 'th')
    })
    .slice(0, n)
}
