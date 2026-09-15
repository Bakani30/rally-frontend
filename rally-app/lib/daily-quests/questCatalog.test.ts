import { describe, expect, it } from 'vitest'

import { DAILY_QUEST_CATALOG, getDailyQuestById } from './questCatalog'

describe('DAILY_QUEST_CATALOG', () => {
  it('defines every v1 daily quest with a stable id, reward, evidence mode, and action', () => {
    expect(DAILY_QUEST_CATALOG.length).toBeGreaterThanOrEqual(5)

    const ids = new Set<string>()
    for (const quest of DAILY_QUEST_CATALOG) {
      expect(quest.id).toMatch(/^[a-z0-9-]+$/)
      expect(ids.has(quest.id)).toBe(false)
      ids.add(quest.id)
      expect(quest.title.length).toBeGreaterThan(0)
      expect(quest.rewardPoints).toBeGreaterThan(0)
      expect(quest.activity).toMatch(/^(running|basketball|badminton|special)$/)
      expect(quest.evidenceMode).toMatch(/^(sensor_sync|timed_sensor_session|video_proof|manual_proof)$/)
      expect(quest.action).toMatch(/^(sync_daily_mission|court_mode|video_submission|manual_submission)$/)
    }
  })

  it('covers running, basketball, badminton, sensor sync, timed sensor, and video proof quests', () => {
    expect(DAILY_QUEST_CATALOG.map((quest) => quest.activity)).toEqual(
      expect.arrayContaining(['running', 'basketball', 'badminton']),
    )
    expect(DAILY_QUEST_CATALOG.some((quest) => (quest.activity as string) === 'sync')).toBe(false)
    expect(DAILY_QUEST_CATALOG.map((quest) => quest.evidenceMode)).toEqual(
      expect.arrayContaining(['sensor_sync', 'timed_sensor_session', 'video_proof']),
    )
  })

  it('treats the 7K daily sync quest as the running sensor-sync quest', () => {
    expect(getDailyQuestById('sync-daily-7k')).toMatchObject({
      activity: 'running',
      evidenceMode: 'sensor_sync',
      action: 'sync_daily_mission',
      rewardPoints: 50,
    })
  })

  it('labels the daily sync quest as Daily Walk 7K while keeping the stable id', () => {
    expect(getDailyQuestById('sync-daily-7k')?.title).toBe('Daily Walk 7K')
  })

  it('exposes Basketball Court Mode as a 20 point timed sensor quest', () => {
    expect(getDailyQuestById('basketball-court-mode')).toMatchObject({
      activity: 'basketball',
      evidenceMode: 'timed_sensor_session',
      action: 'court_mode',
      rewardPoints: 20,
    })
  })

  it('defines Basketball as one Court Mode quest plus four timestamp video quests', () => {
    const basketballQuests = DAILY_QUEST_CATALOG.filter((quest) => quest.activity === 'basketball')
    const courtModeQuests = basketballQuests.filter((quest) => quest.action === 'court_mode')

    expect(basketballQuests.map((quest) => quest.id)).toEqual([
      'basketball-court-mode',
      'basketball-free-throw-check',
      'basketball-handle-burst',
      'basketball-layup-pair',
      'basketball-spot-shot-practice',
    ])
    expect(courtModeQuests).toHaveLength(1)
    expect(basketballQuests.map((quest) => [quest.title, quest.rewardPoints, quest.evidenceMode])).toEqual([
      ['15-Min Court Mode', 20, 'timed_sensor_session'],
      ['Free Throw Check', 10, 'video_proof'],
      ['15s Handle Burst', 8, 'video_proof'],
      ['Layup Pair', 8, 'video_proof'],
      ['Spot Shot Practice', 10, 'video_proof'],
    ])
    expect(basketballQuests.map((quest) => quest.subtitle)).toEqual([
      expect.stringContaining('Workout / Effort / Footwork'),
      expect.stringContaining('3 ลูก'),
      expect.stringContaining('15 วินาที'),
      expect.stringContaining('layup'),
      expect.stringContaining('5 ลูก'),
    ])
  })
})
