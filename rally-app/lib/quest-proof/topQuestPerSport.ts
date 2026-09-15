// Pure: return the top quest (highest reward) per sport section in running→basketball→badminton order.
// Delegates grouping+sort to groupBySport, then takes section.views[0] from each non-empty section.
// No React/RN.
import { groupBySport } from './questSportGrouping'
import type { QuestTemplateView } from './questProofTypes'

export function topQuestPerSport(views: QuestTemplateView[]): QuestTemplateView[] {
  return groupBySport(views).map((section) => section.views[0])
}
