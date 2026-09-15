import { describe, expect, it } from 'vitest'

import { notificationLiveSurfaceToBanner } from './notificationLiveSurfaceService'

const MATCH_ID = '11111111-1111-4111-8111-111111111111'
const INVITE_ID = '33333333-3333-4333-8333-333333333333'

function makeSurface(overrides = {}) {
  return {
    surface_id: 'match_invited:invite-1',
    kind: 'match_invited',
    title: 'คำเชิญเข้า match',
    body: 'mint ชวนคุณแข่ง basketball',
    actor_user_id: '22222222-2222-4222-8222-222222222222',
    actor_display_name: 'mint',
    actor_handle: 'mint',
    actor_avatar_url: 'https://example.com/avatar.png',
    route: '/notifications',
    match_id: MATCH_ID,
    invite_id: INVITE_ID,
    activity_type: 'basketball',
    created_at: '2026-05-18T00:00:00.000Z',
    expires_at: '2026-05-18T01:00:00.000Z',
    ...overrides,
  } as const
}

describe('notification live surface service', () => {
  it('maps match invite RPC rows into Rally Island banner state', () => {
    expect(notificationLiveSurfaceToBanner(makeSurface())).toEqual({
      kind: 'match_invited',
      title: 'คำเชิญเข้า match',
      body: 'mint',
      headline: 'mint',
      actorName: 'mint',
      subtitle: 'mint ชวนคุณแข่ง basketball',
      route: '/notifications',
      matchId: MATCH_ID,
      inviteId: INVITE_ID,
      requesterId: null,
      avatarUrl: 'https://example.com/avatar.png',
      activityType: 'basketball',
    })
  })

  it('maps friend request RPC rows to the friends route', () => {
    expect(notificationLiveSurfaceToBanner(makeSurface({
      surface_id: 'friend_request:sender:me',
      kind: 'friend_request',
      title: 'คำขอเป็นเพื่อน',
      body: 'mint ขอเป็นเพื่อนกับคุณ',
      route: '/friends',
      match_id: null,
      invite_id: null,
      activity_type: null,
    }))).toMatchObject({
      kind: 'friend_request',
      title: 'คำขอเป็นเพื่อน',
      body: 'mint',
      headline: 'mint added you',
      actorName: 'mint',
      subtitle: 'mint ขอเป็นเพื่อนกับคุณ',
      route: '/friends',
      matchId: null,
      inviteId: null,
      requesterId: '22222222-2222-4222-8222-222222222222',
      activityType: null,
    })
  })
})
