import { describe, expect, it } from 'vitest'
import {
  createLiveSurfaceSnapshot,
  liveSurfaceFromNotificationData,
  liveSurfaceToNotificationData,
} from './liveSurface'
import { liveSurfaceToIosActivityPayload } from './iosLiveActivity'

const MATCH_ID = '11111111-1111-4111-8111-111111111111'
const INVITE_ID = '33333333-3333-4333-8333-333333333333'

describe('live surface snapshots', () => {
  it('serializes match invite data for notification transports', () => {
    const snapshot = createLiveSurfaceSnapshot({
      kind: 'match_invite',
      title: 'คำเชิญเข้า match',
      actorUserId: '22222222-2222-4222-8222-222222222222',
      actorName: 'chat2',
      actorAvatarUrl: 'https://example.com/avatar.png',
      activityType: 'basketball',
      matchId: MATCH_ID,
      inviteId: INVITE_ID,
      route: '/notifications',
      expiresAt: '2026-05-12T06:40:00.000Z',
    })

    expect(liveSurfaceToNotificationData(snapshot)).toMatchObject({
      rally_surface_kind: 'match_invite',
      rally_surface_title: 'คำเชิญเข้า match',
      rally_surface_headline: 'chat2',
      rally_surface_subtitle: 'chat2 invited you to Basketball',
      rally_surface_actor_user_id: '22222222-2222-4222-8222-222222222222',
      rally_surface_actor_name: 'chat2',
      rally_surface_actor_avatar_url: 'https://example.com/avatar.png',
      rally_surface_activity_type: 'basketball',
      rally_surface_match_id: MATCH_ID,
      rally_surface_invite_id: INVITE_ID,
      rally_surface_route: '/notifications',
      rally_surface_expires_at: '2026-05-12T06:40:00.000Z',
    })
  })

  it('parses push data back to a shared surface snapshot', () => {
    expect(
      liveSurfaceFromNotificationData({
        rally_surface_kind: 'friend_request',
        rally_surface_actor_user_id: '22222222-2222-4222-8222-222222222222',
        rally_surface_actor_name: 'mint',
        rally_surface_route: '/friends',
      }),
    ).toMatchObject({
      kind: 'friend_request',
      title: 'คำขอเป็นเพื่อน',
      headline: 'mint added you',
      subtitle: 'Open Rally to review the request',
      actorUserId: '22222222-2222-4222-8222-222222222222',
      actorName: 'mint',
      route: '/friends',
    })
  })

  it('projects the same snapshot into an iOS ActivityKit-ready shape', () => {
    const snapshot = createLiveSurfaceSnapshot({
      kind: 'match_invite',
      actorName: 'chat2',
      activityType: 'basketball',
      matchId: MATCH_ID,
      expiresAt: '2026-05-12T06:40:00.000Z',
    })

    expect(liveSurfaceToIosActivityPayload(snapshot)).toEqual({
      attributes: {
        surfaceId: `match-${MATCH_ID}`,
        kind: 'match_invite',
        matchId: MATCH_ID,
        route: '/notifications',
      },
      contentState: {
        title: 'คำเชิญเข้า match',
        actorName: 'chat2',
        actorAvatarUrl: null,
        activityType: 'basketball',
        expiresAt: '2026-05-12T06:40:00.000Z',
      },
      staleDate: '2026-05-12T06:40:00.000Z',
    })
  })
})
