// Pure: sort quest views by rewardPoints desc with titleTH (th locale) tiebreak, take n.
// No React/RN. Mirrors the intra-sport comparator in questSportGrouping.ts.
import type { QuestTemplateView } from './questProofTypes'

export function topQuestsByReward(views: QuestTemplateView[], n: number): QuestTemplateView[] {
  return [...views]
    .sort((a, b) => b.rewardPoints - a.rewardPoints || a.titleTH.localeCompare(b.titleTH, 'th'))
    .slice(0, n)
}
