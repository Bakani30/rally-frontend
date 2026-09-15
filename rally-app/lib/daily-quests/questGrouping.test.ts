import { describe, expect, it } from 'vitest'
import { groupQuestsByActivity } from './questGrouping'
import type { DailyQuestItem, QuestActivity } from './questTypes'

function quest(id: string, activity: QuestActivity): DailyQuestItem {
  return {
    id,
    title: id,
    subtitle: '',
    activity,
    evidenceMode: 'video_proof',
    action: 'video_submission',
    rewardPoints: 10,
    icon: 'star',
    status: 'ready',
    statusLabel: 'Ready',
    progress: 0,
  }
}

describe('groupQuestsByActivity', () => {
  it('orders sections running -> basketball -> badminton -> special and drops empty groups', () => {
    const sections = groupQuestsByActivity([
      quest('b1', 'basketball'),
      quest('r1', 'running'),
      quest('b2', 'basketball'),
    ])
    expect(sections.map((s) => s.activity)).toEqual(['running', 'basketball'])
    expect(sections.map((s) => s.label)).toEqual(['RUN', 'BASKETBALL'])
    expect(sections[1].quests.map((q) => q.id)).toEqual(['b1', 'b2'])
  })

  it('returns an empty array when there are no quests', () => {
    expect(groupQuestsByActivity([])).toEqual([])
  })
})
