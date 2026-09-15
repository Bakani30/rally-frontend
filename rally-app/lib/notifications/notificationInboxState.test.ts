import { describe, expect, it } from 'vitest'
import {
  hasUnreadNotificationAction,
  latestNotificationActionAt,
} from './notificationInboxRules'

describe('notificationInboxState', () => {
  it('finds the newest actionable notification timestamp', () => {
    expect(latestNotificationActionAt([
      '2026-05-12T03:00:00.000Z',
      null,
      'invalid',
      '2026-05-12T03:05:00.000Z',
    ])).toBe('2026-05-12T03:05:00.000Z')
  })

  it('marks actions newer than the opened timestamp as unread', () => {
    expect(hasUnreadNotificationAction(
      '2026-05-12T03:05:00.000Z',
      '2026-05-12T03:04:59.000Z',
    )).toBe(true)
    expect(hasUnreadNotificationAction(
      '2026-05-12T03:05:00.000Z',
      '2026-05-12T03:05:00.000Z',
    )).toBe(false)
  })
})
