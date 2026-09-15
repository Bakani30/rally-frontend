import type { DailyQuestItem, QuestActivity } from './questTypes'

export type QuestFilter = 'all' | QuestActivity

export const QUEST_FILTERS: { key: QuestFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'special', label: 'Special' },
  { key: 'running', label: 'Run' },
  { key: 'basketball', label: 'Basketball' },
  { key: 'badminton', label: 'Badminton' },
]

export function isQuestVisibleForFilter(quest: DailyQuestItem, filter: QuestFilter): boolean {
  if (filter === 'all') return true
  return quest.activity === filter
}
