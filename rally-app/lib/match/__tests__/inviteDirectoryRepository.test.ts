import { describe, expect, it, vi } from 'vitest'
import { mapEligibleRefereeRow, mapInvitableFriendRow } from '../inviteDirectoryRepository'

// vi.mock is hoisted by vitest — keeps supabase out of node test env
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: vi.fn() } }))

describe('mapInvitableFriendRow', () => {
  it('maps snake_case rpc row to InvitableFriend', () => {
    const row = {
      friend_id: 'u1',
      display_name: 'Bank',
      handle: 'bank',
      avatar_url: null,
      frame_asset_ref: null,
      rating: 820,
      recently_played: true,
      suggested: false,
      invite_status: 'pending',
      last_invited_at: '2026-06-29T00:00:00Z',
    }
    expect(mapInvitableFriendRow(row)).toEqual({
      friendId: 'u1',
      displayName: 'Bank',
      handle: 'bank',
      avatarUrl: null,
      frameAssetRef: null,
      rating: 820,
      recentlyPlayed: true,
      suggested: false,
      inviteStatus: 'pending',
      lastInvitedAt: '2026-06-29T00:00:00Z',
    })
  })

  it('defaults invite_status to none when unrecognised', () => {
    const row = {
      friend_id: 'u2',
      display_name: null,
      handle: null,
      avatar_url: null,
      frame_asset_ref: null,
      rating: 500,
      recently_played: false,
      suggested: true,
      invite_status: 'unknown',
      last_invited_at: null,
    }
    expect(mapInvitableFriendRow(row).inviteStatus).toBe('none')
  })

  it('defaults rating to 500 when missing', () => {
    const row = {
      friend_id: 'u3',
      display_name: null,
      handle: null,
      avatar_url: null,
      frame_asset_ref: null,
      rating: null,
      recently_played: false,
      suggested: false,
      invite_status: 'none',
      last_invited_at: null,
    }
    expect(mapInvitableFriendRow(row).rating).toBe(500)
  })
})

describe('mapEligibleRefereeRow', () => {
  it('maps snake_case rpc row to EligibleReferee', () => {
    const row = {
      user_id: 'r1',
      display_name: 'Ref One',
      handle: 'refone',
      avatar_url: 'https://example.com/avatar.jpg',
      frame_asset_ref: null,
      trust_tier: 'trusted',
      completed_matches: 12,
      clean_matches: 10,
      disputed_matches: 2,
      eligible: true,
      assigned: false,
    }
    expect(mapEligibleRefereeRow(row)).toEqual({
      userId: 'r1',
      displayName: 'Ref One',
      handle: 'refone',
      avatarUrl: 'https://example.com/avatar.jpg',
      frameAssetRef: null,
      trustTier: 'trusted',
      completedMatches: 12,
      cleanMatches: 10,
      disputedMatches: 2,
      eligible: true,
      assigned: false,
    })
  })

  it('defaults trust_tier to candidate when missing', () => {
    const row = {
      user_id: 'r2',
      display_name: null,
      handle: null,
      avatar_url: null,
      frame_asset_ref: null,
      trust_tier: null,
      completed_matches: 0,
      clean_matches: 0,
      disputed_matches: 0,
      eligible: false,
      assigned: false,
    }
    expect(mapEligibleRefereeRow(row).trustTier).toBe('candidate')
  })
})
