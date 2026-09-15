import { describe, expect, it } from 'vitest'

import { resolveAttentionDecision } from './attentionPolicy'

describe('resolveAttentionDecision', () => {
  it('routes foreground match invites to the Rally Island with urgent priority', () => {
    expect(resolveAttentionDecision({
      type: 'match_invited',
      route: '/notifications',
      matchId: 'match-1',
      inviteId: 'invite-1',
    }, {
      appState: 'active',
      currentRoute: '/(tabs)',
    })).toMatchObject({
      level: 'urgent',
      surface: 'rally_island',
      priority: 90,
      dedupeKey: 'match_invited:invite-1',
      targetRoute: '/notifications',
    })
  })

  it('keeps actionable notifications out of global overlays when the target route is active', () => {
    expect(resolveAttentionDecision({
      type: 'match_invited',
      route: '/match/match-1',
      matchId: 'match-1',
      inviteId: 'invite-1',
    }, {
      appState: 'active',
      currentRoute: '/match/match-1',
    })).toMatchObject({
      level: 'inline',
      surface: 'inline',
      suppressReason: 'target_route_active',
    })
  })

  it('uses system notification surfaces when the app is backgrounded', () => {
    expect(resolveAttentionDecision({
      type: 'friend_request',
      route: '/friends',
      requesterId: 'user-2',
    }, {
      appState: 'background',
      currentRoute: '/(tabs)',
    })).toMatchObject({
      level: 'urgent',
      surface: 'system_notification',
      priority: 60,
      dedupeKey: 'friend_request:user-2',
    })
  })

  it('suppresses noisy lifecycle updates', () => {
    expect(resolveAttentionDecision({
      type: 'match_accepted',
      route: '/match/match-1',
      matchId: 'match-1',
    }, {
      appState: 'active',
      currentRoute: '/(tabs)',
    })).toMatchObject({
      level: 'silent',
      surface: 'none',
      suppressReason: 'lifecycle_noise',
    })
  })
})
