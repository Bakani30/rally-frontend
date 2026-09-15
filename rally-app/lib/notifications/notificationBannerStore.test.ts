import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useNotificationBannerStore,
  type NotificationBannerInput,
} from '@/stores/notificationBannerStore'

function banner(input: Partial<NotificationBannerInput> = {}): NotificationBannerInput {
  return {
    kind: 'friend_request',
    title: 'Friend request',
    body: 'Player',
    route: '/friends',
    ...input,
  }
}

describe('notificationBannerStore', () => {
  beforeEach(() => {
    vi.useRealTimers()
    useNotificationBannerStore.getState().clearAll()
  })

  it('promotes higher priority banners and returns to the previous banner after dismiss', () => {
    useNotificationBannerStore.getState().showBanner(
      banner({ id: 'friend-1', kind: 'friend_request' }),
      { priority: 60, dedupeKey: 'friend_request:user-1' },
    )
    useNotificationBannerStore.getState().showBanner(
      banner({ id: 'invite-1', kind: 'match_invited', title: 'Match invite' }),
      { priority: 90, dedupeKey: 'match_invited:invite-1' },
    )

    expect(useNotificationBannerStore.getState().current?.id).toBe('invite-1')

    useNotificationBannerStore.getState().dismissBanner('invite-1')

    expect(useNotificationBannerStore.getState().current?.id).toBe('friend-1')
  })

  it('dedupes queued banners by dedupe key', () => {
    useNotificationBannerStore.getState().showBanner(
      banner({ id: 'invite-1', kind: 'match_invited', title: 'Old invite' }),
      { priority: 90, dedupeKey: 'match_invited:invite-1' },
    )
    useNotificationBannerStore.getState().showBanner(
      banner({ id: 'friend-1', kind: 'friend_request' }),
      { priority: 60, dedupeKey: 'friend_request:user-1' },
    )
    useNotificationBannerStore.getState().showBanner(
      banner({ id: 'friend-2', kind: 'friend_request', body: 'Updated player' }),
      { priority: 60, dedupeKey: 'friend_request:user-1' },
    )

    expect(useNotificationBannerStore.getState().queue).toHaveLength(1)
    expect(useNotificationBannerStore.getState().queue[0]).toMatchObject({
      id: 'friend-2',
      body: 'Updated player',
    })
  })

  it('expires stale current banners and promotes the next queued banner', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-26T00:00:00.000Z'))

    useNotificationBannerStore.getState().showBanner(
      banner({ id: 'expires-now', kind: 'match_invited' }),
      { priority: 90, dedupeKey: 'match_invited:invite-1', ttlMs: 1000 },
    )
    useNotificationBannerStore.getState().showBanner(
      banner({ id: 'next-up', kind: 'friend_request' }),
      { priority: 60, dedupeKey: 'friend_request:user-1' },
    )

    vi.setSystemTime(new Date('2026-05-26T00:00:02.000Z'))
    useNotificationBannerStore.getState().pruneExpired()

    expect(useNotificationBannerStore.getState().current?.id).toBe('next-up')
  })
})
