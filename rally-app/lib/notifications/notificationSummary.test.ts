import { describe, expect, it } from 'vitest'

import { normalizeNotificationActionSummary } from './notificationSummary'

describe('normalizeNotificationActionSummary', () => {
  it('returns an empty summary when no actions exist', () => {
    expect(normalizeNotificationActionSummary(null)).toEqual({
      latestActionAt: null,
      pendingInviteCount: 0,
      incomingFriendRequestCount: 0,
      matchActionCount: 0,
      refereeDutyCount: 0,
    })
  })

  it('maps pending invite counts from the RPC row', () => {
    expect(normalizeNotificationActionSummary({
      latest_action_at: '2026-05-13T01:00:00.000Z',
      pending_invite_count: 2,
      incoming_friend_request_count: 0,
      match_action_count: 0,
      referee_duty_count: 0,
    })).toMatchObject({
      latestActionAt: '2026-05-13T01:00:00.000Z',
      pendingInviteCount: 2,
    })
  })

  it('maps incoming friend request counts from the RPC row', () => {
    expect(normalizeNotificationActionSummary({
      latest_action_at: '2026-05-13T02:00:00.000Z',
      pending_invite_count: 0,
      incoming_friend_request_count: 1,
      match_action_count: 0,
      referee_duty_count: 0,
    })).toMatchObject({
      latestActionAt: '2026-05-13T02:00:00.000Z',
      incomingFriendRequestCount: 1,
    })
  })

  it('maps submitted/disputed match action counts from the RPC row', () => {
    expect(normalizeNotificationActionSummary({
      latest_action_at: '2026-05-13T03:00:00.000Z',
      pending_invite_count: 0,
      incoming_friend_request_count: 0,
      match_action_count: 3,
      referee_duty_count: 0,
    })).toMatchObject({
      latestActionAt: '2026-05-13T03:00:00.000Z',
      matchActionCount: 3,
    })
  })

  it('maps team-result review actions through matchActionCount', () => {
    expect(normalizeNotificationActionSummary({
      latest_action_at: '2026-05-13T04:00:00.000Z',
      pending_invite_count: 0,
      incoming_friend_request_count: 0,
      match_action_count: 1,
      referee_duty_count: 0,
    })).toEqual({
      latestActionAt: '2026-05-13T04:00:00.000Z',
      pendingInviteCount: 0,
      incomingFriendRequestCount: 0,
      matchActionCount: 1,
      refereeDutyCount: 0,
    })
  })

  it('maps referee duty counts when the RPC exposes them', () => {
    expect(normalizeNotificationActionSummary({
      latest_action_at: '2026-06-14T03:00:00.000Z',
      pending_invite_count: 0,
      incoming_friend_request_count: 0,
      match_action_count: 0,
      referee_duty_count: 2,
    })).toEqual({
      latestActionAt: '2026-06-14T03:00:00.000Z',
      pendingInviteCount: 0,
      incomingFriendRequestCount: 0,
      matchActionCount: 0,
      refereeDutyCount: 2,
    })
  })
})
