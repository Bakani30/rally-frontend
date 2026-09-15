import { describe, expect, it } from 'vitest'

import type { DailyQuestItem } from './questTypes'
import { isQuestVisibleForFilter, QUEST_FILTERS } from './questFilters'

const baseQuest: DailyQuestItem = {
  id: 'quest',
  title: 'Quest',
  subtitle: 'Quest subtitle',
  activity: 'running',
  evidenceMode: 'video_proof',
  action: 'video_submission',
  rewardPoints: 1,
  icon: 'star',
  status: 'ready',
  statusLabel: 'Ready',
  progress: 0,
}

describe('daily quest filters', () => {
  it('replaces Sync with Special in the quest hub filters', () => {
    expect(QUEST_FILTERS.map((filter) => filter.key)).toEqual([
      'all',
      'special',
      'running',
      'basketball',
      'badminton',
    ])
    expect(QUEST_FILTERS.map((filter) => filter.label)).toEqual([
      'All',
      'Special',
      'Run',
      'Basketball',
      'Badminton',
    ])
  })

  it('keeps sensor-sync daily running quests in Run instead of a Sync filter', () => {
    const dailySyncQuest: DailyQuestItem = {
      ...baseQuest,
      id: 'sync-daily-7k',
      activity: 'running',
      evidenceMode: 'sensor_sync',
      action: 'sync_daily_mission',
    }

    expect(isQuestVisibleForFilter(dailySyncQuest, 'running')).toBe(true)
    expect(isQuestVisibleForFilter(dailySyncQuest, 'special')).toBe(false)
  })

  it('routes admin special quests into the Special filter', () => {
    const specialQuest: DailyQuestItem = {
      ...baseQuest,
      id: 'admin-special-drop',
      activity: 'special',
      title: 'Admin Special Drop',
    }

    expect(isQuestVisibleForFilter(specialQuest, 'special')).toBe(true)
    expect(isQuestVisibleForFilter(specialQuest, 'running')).toBe(false)
  })
})
