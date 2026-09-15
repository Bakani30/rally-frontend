import { describe, expect, it } from 'vitest'

import {
  getMatchRealtimeRecoveryDelay,
  patchAlphaRefereeLiveScoreDraft,
  patchAlphaRefereePlayerStatDraft,
  patchBasketballPlayerStatDraft,
} from './matchDetailRealtimePatches'
import type {
  AlphaRefereeLiveScoreDraft,
  BasketballPlayerStatDraft,
  MatchWithRelations,
} from '@/types/match'

function baseMatch(overrides: Partial<MatchWithRelations> = {}): MatchWithRelations {
  return {
    id: 'match-1',
    status: 'in_progress',
    activity_type: 'basketball',
    stake: 30,
    match_participants: [],
    match_invites: [],
    ...overrides,
  } as MatchWithRelations
}

function liveDraft(overrides: Partial<AlphaRefereeLiveScoreDraft> = {}): AlphaRefereeLiveScoreDraft {
  return {
    id: 'draft-1',
    match_id: 'match-1',
    assignment_id: 'assignment-1',
    referee_user_id: 'referee-user',
    status: 'open',
    correction_note: null,
    submitted_at: null,
    correction_requested_at: null,
    created_at: '2026-06-04T00:00:00.000Z',
    updated_at: '2026-06-04T00:00:00.000Z',
    player_stats: [
      {
        id: 'stat-a',
        draft_id: 'draft-1',
        match_id: 'match-1',
        user_id: 'user-a',
        side_index: 0,
        points: 8,
        rebounds: 3,
        assists: 2,
        blocks: 1,
        three_pointers_made: 2,
        created_at: '2026-06-04T00:00:00.000Z',
        updated_at: '2026-06-04T00:00:00.000Z',
      },
    ],
    ...overrides,
  }
}

function selfStatDraft(overrides: Partial<BasketballPlayerStatDraft> = {}): BasketballPlayerStatDraft {
  return {
    id: 'self-a',
    match_id: 'match-1',
    user_id: 'user-a',
    side_index: 0,
    points: 5,
    rebounds: 2,
    assists: 1,
    blocks: 1,
    three_pointers_made: 1,
    note: 'first half',
    created_at: '2026-06-04T00:00:00.000Z',
    updated_at: '2026-06-04T00:00:00.000Z',
    ...overrides,
  }
}

describe('match detail realtime recovery policy', () => {
  it('backs off websocket recovery and caps retries', () => {
    expect(getMatchRealtimeRecoveryDelay(-1)).toBe(500)
    expect(getMatchRealtimeRecoveryDelay(0)).toBe(500)
    expect(getMatchRealtimeRecoveryDelay(1)).toBe(1_000)
    expect(getMatchRealtimeRecoveryDelay(5)).toBe(10_000)
    expect(getMatchRealtimeRecoveryDelay(12)).toBe(10_000)
  })
})

describe('match detail realtime cache patches', () => {
  it('updates referee live score draft status without dropping player stats', () => {
    const match = baseMatch({ alpha_referee_live_score_drafts: [liveDraft()] })
    const patched = patchAlphaRefereeLiveScoreDraft(match, {
      id: 'draft-1',
      status: 'correction_requested',
      correction_note: 'Side A score needs review',
      updated_at: '2026-06-04T00:01:00.000Z',
    }, 'UPDATE')

    expect(patched.alpha_referee_live_score_drafts).toMatchObject([
      {
        id: 'draft-1',
        status: 'correction_requested',
        correction_note: 'Side A score needs review',
        player_stats: [{ id: 'stat-a', points: 8 }],
      },
    ])
  })

  it('updates referee player stat draft scores in the cached live draft', () => {
    const match = baseMatch({ alpha_referee_live_score_drafts: [liveDraft()] })
    const patched = patchAlphaRefereePlayerStatDraft(match, {
      id: 'stat-a',
      draft_id: 'draft-1',
      user_id: 'user-a',
      points: 11,
      rebounds: 4,
      updated_at: '2026-06-04T00:02:00.000Z',
    }, 'UPDATE')

    const draft = Array.isArray(patched.alpha_referee_live_score_drafts)
      ? patched.alpha_referee_live_score_drafts[0]
      : patched.alpha_referee_live_score_drafts

    expect(draft?.player_stats).toMatchObject([
      {
        id: 'stat-a',
        user_id: 'user-a',
        points: 11,
        rebounds: 4,
        assists: 2,
      },
    ])
  })

  it('inserts and updates basketball player self-stat drafts by user identity', () => {
    const inserted = patchBasketballPlayerStatDraft(baseMatch(), {
      id: 'self-a',
      match_id: 'match-1',
      user_id: 'user-a',
      side_index: 0,
      points: 5,
      rebounds: 2,
      assists: 1,
      blocks: 1,
      three_pointers_made: 1,
      note: 'first half',
      created_at: '2026-06-04T00:00:00.000Z',
      updated_at: '2026-06-04T00:00:00.000Z',
    }, 'INSERT')
    const updated = patchBasketballPlayerStatDraft(inserted, {
      user_id: 'user-a',
      points: 9,
      note: null,
      updated_at: '2026-06-04T00:03:00.000Z',
    }, 'UPDATE')

    expect(updated.basketball_player_stat_drafts).toMatchObject([
      {
        id: 'self-a',
        user_id: 'user-a',
        points: 9,
        rebounds: 2,
        note: null,
      },
    ])
  })

  it('removes basketball player self-stat drafts on delete events', () => {
    const match = baseMatch({ basketball_player_stat_drafts: [selfStatDraft()] })
    const patched = patchBasketballPlayerStatDraft(match, { id: 'self-a' }, 'DELETE')

    expect(patched.basketball_player_stat_drafts).toEqual([])
  })
})
