// Pure: group quest catalog views by sport, ordered + sorted. No React/RN.
import type { QuestActivity } from '@/lib/daily-quests/questTypes'
import type { QuestTemplateView } from './questProofTypes'
export type QuestSportSection = { activity: QuestActivity; labelTH: string; views: QuestTemplateView[] }
const ORDER: QuestActivity[] = ['running', 'basketball', 'badminton', 'special']
const LABEL: Record<QuestActivity, string> = { running: 'วิ่ง', basketball: 'บาส', badminton: 'แบด', special: 'อื่นๆ' }
export function groupBySport(views: QuestTemplateView[]): QuestSportSection[] {
  return ORDER.flatMap((activity) => {
    const inSport = views
      .filter((v) => v.activity === activity)
      .sort((a, b) => b.rewardPoints - a.rewardPoints || a.titleTH.localeCompare(b.titleTH, 'th'))
    return inSport.length ? [{ activity, labelTH: LABEL[activity], views: inSport }] : []
  })
}
