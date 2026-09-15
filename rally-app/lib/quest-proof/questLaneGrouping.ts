// Pure: group quest catalog views into ordered lane sections. No React/RN.
import type { QuestLane, QuestTemplateView } from './questProofTypes'

export type QuestLaneSection = { lane: QuestLane; labelTH: string; views: QuestTemplateView[] }

const LANE_ORDER: QuestLane[] = ['move', 'explore', 'practice']
const LANE_LABEL_TH: Record<QuestLane, string> = { move: 'ขยับ', explore: 'สำรวจ', practice: 'ซ้อม' }

export function groupByLane(views: QuestTemplateView[]): QuestLaneSection[] {
  return LANE_ORDER.flatMap((lane) => {
    const inLane = views
      .filter((v) => v.lane === lane)
      .sort((a, b) => b.rewardPoints - a.rewardPoints || a.titleTH.localeCompare(b.titleTH, 'th'))
    return inLane.length ? [{ lane, labelTH: LANE_LABEL_TH[lane], views: inLane }] : []
  })
}
