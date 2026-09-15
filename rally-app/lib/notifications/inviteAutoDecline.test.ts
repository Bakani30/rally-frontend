import { describe, expect, it } from 'vitest'
import { getInviteAutoDeclineDelayMs } from './inviteAutoDecline'

describe('getInviteAutoDeclineDelayMs', () => {
  it('returns remaining time until 30 seconds after sentAt', () => {
    expect(
      getInviteAutoDeclineDelayMs(
        '2026-05-12T10:00:00.000Z',
        new Date('2026-05-12T10:00:12.000Z').getTime(),
      ),
    ).toBe(18_000)
  })

  it('returns zero for stale invites', () => {
    expect(
      getInviteAutoDeclineDelayMs(
        '2026-05-12T10:00:00.000Z',
        new Date('2026-05-12T10:00:31.000Z').getTime(),
      ),
    ).toBe(0)
  })
})
