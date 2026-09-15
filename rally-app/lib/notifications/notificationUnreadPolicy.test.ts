import { describe, expect, it } from 'vitest'

import { getNotificationUnreadLatestActionAt } from './notificationUnreadPolicy'

describe('getNotificationUnreadLatestActionAt', () => {
  it('combines fresh summary actions with live pending invite timestamps', () => {
    expect(getNotificationUnreadLatestActionAt({
      summaryLatestActionAt: '2026-06-05T08:00:00.000Z',
      pendingInviteSentAts: [
        '2026-06-05T08:10:00.000Z',
        '2026-06-05T07:50:00.000Z',
      ],
      refereeDutyActionAts: [],
    })).toBe('2026-06-05T08:10:00.000Z')
  })

  it('falls back to summary when there are no live invite rows', () => {
    expect(getNotificationUnreadLatestActionAt({
      summaryLatestActionAt: '2026-06-05T08:00:00.000Z',
      pendingInviteSentAts: [],
      refereeDutyActionAts: [],
    })).toBe('2026-06-05T08:00:00.000Z')
  })

  it('combines live referee assignment timestamps with other notification actions', () => {
    expect(getNotificationUnreadLatestActionAt({
      summaryLatestActionAt: '2026-06-05T08:00:00.000Z',
      pendingInviteSentAts: ['2026-06-05T08:10:00.000Z'],
      refereeDutyActionAts: ['2026-06-05T08:20:00.000Z'],
    })).toBe('2026-06-05T08:20:00.000Z')
  })

  it('an unseen rank demotion counts toward the unread signal', () => {
    expect(getNotificationUnreadLatestActionAt({
      summaryLatestActionAt: '2026-06-05T08:00:00.000Z',
      pendingInviteSentAts: [],
      refereeDutyActionAts: [],
      demotionActionAts: ['2026-06-05T09:00:00.000Z'],
    })).toBe('2026-06-05T09:00:00.000Z')
  })

  it('falls back to other sources when there are no unseen demotions', () => {
    expect(getNotificationUnreadLatestActionAt({
      summaryLatestActionAt: '2026-06-05T08:00:00.000Z',
      pendingInviteSentAts: [],
      refereeDutyActionAts: [],
      demotionActionAts: [],
    })).toBe('2026-06-05T08:00:00.000Z')
  })
})
