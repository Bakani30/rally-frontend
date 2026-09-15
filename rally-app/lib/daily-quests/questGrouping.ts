import type { DailyQuestItem, QuestActivity } from './questTypes'

export type QuestActivitySection = {
  activity: QuestActivity
  label: string
  quests: DailyQuestItem[]
}

export const QUEST_ACTIVITY_ORDER: QuestActivity[] = [
  'running',
  'basketball',
  'badminton',
  'special',
]

const QUEST_ACTIVITY_LABEL: Record<QuestActivity, string> = {
  running: 'RUN',
  basketball: 'BASKETBALL',
  badminton: 'BADMINTON',
  special: 'SPECIAL',
}

/** Quests bucketed into fixed-order activity sections; empty sections dropped. */
export function groupQuestsByActivity(quests: DailyQuestItem[]): QuestActivitySection[] {
  return QUEST_ACTIVITY_ORDER.map((activity) => ({
    activity,
    label: QUEST_ACTIVITY_LABEL[activity],
    quests: quests.filter((quest) => quest.activity === activity),
  })).filter((section) => section.quests.length > 0)
}
