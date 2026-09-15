import { describe, expect, it } from 'vitest'
import { resolveMatchInviteNotificationIntent, resolveNotificationRoute } from './notificationPayload'

const MATCH_ID = '11111111-1111-4111-8111-111111111111'
const INVITE_ID = '33333333-3333-4333-8333-333333333333'
const CHALLENGE_ID = '22222222-2222-4222-8222-222222222222'

describe('resolveNotificationRoute', () => {
  it('routes valid match payloads to match detail', () => {
    expect(resolveNotificationRoute({ matchId: MATCH_ID })).toEqual({
      kind: 'match',
      matchId: MATCH_ID,
    })
    expect(resolveNotificationRoute({ match_id: MATCH_ID })).toEqual({
      kind: 'match',
      matchId: MATCH_ID,
    })
    expect(resolveNotificationRoute({ route: `/match/${MATCH_ID}` })).toEqual({
      kind: 'match',
      matchId: MATCH_ID,
    })
    expect(resolveNotificationRoute({ url: `rallyapp://match/${MATCH_ID}` })).toEqual({
      kind: 'match',
      matchId: MATCH_ID,
    })
  })

  it('routes generic invite taps to notifications without prompt intent', () => {
    expect(resolveNotificationRoute({ type: 'match_invited', matchId: MATCH_ID })).toEqual({
      kind: 'notifications',
    })
    expect(resolveNotificationRoute({
      type: 'match_invited',
      route: `/match/${MATCH_ID}?from=notification`,
    })).toEqual({
      kind: 'notifications',
    })
    expect(resolveNotificationRoute({
      type: 'match_invited',
      url: `rallyapp://match/${MATCH_ID}?from=notification`,
    })).toEqual({
      kind: 'notifications',
    })
  })

  it('does not treat generic match invite payloads as accept intents', () => {
    expect(resolveMatchInviteNotificationIntent({
      type: 'match_invited',
      matchId: MATCH_ID,
      inviteId: INVITE_ID,
    })).toBeNull()
    expect(resolveMatchInviteNotificationIntent({
      type: 'match_invited',
      rally_surface_match_id: MATCH_ID,
    })).toBeNull()
  })

  it('routes valid challenge payloads to challenge detail', () => {
    expect(resolveNotificationRoute({ challengeId: CHALLENGE_ID })).toEqual({
      kind: 'challenge',
      challengeId: CHALLENGE_ID,
    })
    expect(resolveNotificationRoute({ challenge_id: CHALLENGE_ID })).toEqual({
      kind: 'challenge',
      challengeId: CHALLENGE_ID,
    })
    expect(resolveNotificationRoute({ route: `/challenges/${CHALLENGE_ID}` })).toEqual({
      kind: 'challenge',
      challengeId: CHALLENGE_ID,
    })
  })

  it('ignores malformed ids', () => {
    expect(resolveNotificationRoute({ matchId: '../wallet' })).toEqual({ kind: 'none' })
    expect(resolveNotificationRoute({ challengeId: 123 })).toEqual({ kind: 'none' })
  })

  it('routes inbox payloads to notifications', () => {
    expect(resolveNotificationRoute({ route: '/notifications' })).toEqual({ kind: 'notifications' })
    expect(resolveNotificationRoute({ url: 'rallyapp://notifications' })).toEqual({ kind: 'notifications' })
  })

  it('routes referee assignment payloads to the referee board', () => {
    expect(resolveNotificationRoute({
      type: 'referee_assigned',
      matchId: MATCH_ID,
      route: '/referee',
    })).toEqual({ kind: 'referee' })
    expect(resolveNotificationRoute({
      type: 'referee_assigned',
      matchId: MATCH_ID,
      url: 'rallyapp://referee',
    })).toEqual({ kind: 'referee' })
  })
})
