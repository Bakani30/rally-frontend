import { describe, expect, it } from 'vitest'

import type { MatchParticipant, MatchWithRelations } from '@/types/match'
import { buildBasketballRecapMoment, tierByRating } from './matchRecapMoment'

const NOW = '2026-06-20T10:00:00.000Z'

function participant(
  userId: string,
  side: 0 | 1,
  overrides: Partial<MatchParticipant> = {},
): MatchParticipant {
  return {
    user_id: userId,
    side,
    stake_contribution: 50,
    accepted_at: NOW,
    is_active: true,
    rating_before: null,
    rating_after: null,
    users: null,
    ...overrides,
  }
}

function match(overrides: Partial<MatchWithRelations> = {}): MatchWithRelations {
  return {
    id: 'match-1',
    source: 'legacy_standalone',
    created_by: 'user-a',
    activity_type: 'basketball',
    rule_text: null,
    rule_params: {},
    stake: 50,
    stake_currency: 'leaderboard_point',
    deadline: '2026-06-21T10:00:00.000Z',
    status: 'settled',
    accepted_at: NOW,
    started_at: NOW,
    winner_user_id: 'user-a',
    is_tie: false,
    is_coop: false,
    team_size_per_side: 1,
    join_mode: 'open',
    join_code: null,
    entry_code: null,
    match_participants: [
      participant('user-a', 0, { rating_before: 740, rating_after: 760 }),
      participant('user-b', 1, { rating_before: 760, rating_after: 740 }),
    ],
    match_invites: [],
    match_submissions: [],
    match_team_result_submissions: [
      { id: 's0', side_index: 0, submitted_by: 'user-a', team_score: 78, notes: null, proof_urls: [], accepted_by: null, accepted_at: null, created_at: NOW, updated_at: NOW },
      { id: 's1', side_index: 1, submitted_by: 'user-b', team_score: 72, notes: null, proof_urls: [], accepted_by: null, accepted_at: null, created_at: NOW, updated_at: NOW },
    ],
    match_cancel_requests: [],
    match_participant_contributions: [],
    match_abuse_reports: [],
    ...overrides,
  }
}

describe('tierByRating', () => {
  it('maps rating to a tier band by minRating only', () => {
    expect(tierByRating(0)).toBe('bronze')
    expect(tierByRating(749)).toBe('silver')
    expect(tierByRating(750)).toBe('gold')
    expect(tierByRating(1200)).toBe('immortal')
  })
})

describe('buildBasketballRecapMoment', () => {
  it('builds a win moment with score, points and a tier promotion', () => {
    const vm = buildBasketballRecapMoment(match(), 'user-a')
    expect(vm).toMatchObject({
      tone: 'win',
      mySide: 0,
      sideAScore: 78,
      sideBScore: 72,
      pointsDelta: 50,
      currencyUnit: 'pts',
      ratingBefore: 740,
      ratingAfter: 760,
      ratingDelta: 20,
      tier: { before: 'silver', after: 'gold', change: 'promote' },
    })
  })

  it('builds a lose moment with a negative point delta and tier demotion', () => {
    const vm = buildBasketballRecapMoment(match(), 'user-b')
    expect(vm).toMatchObject({
      tone: 'lose',
      pointsDelta: -50,
      ratingDelta: -20,
      tier: { before: 'gold', after: 'silver', change: 'demote' },
    })
  })

  it('builds a tie moment with zero points', () => {
    const vm = buildBasketballRecapMoment(
      match({ winner_user_id: null, is_tie: true }),
      'user-a',
    )
    expect(vm?.tone).toBe('tie')
    expect(vm?.pointsDelta).toBe(0)
  })

  it('returns no tier when a rating snapshot is missing', () => {
    const vm = buildBasketballRecapMoment(
      match({
        match_participants: [
          participant('user-a', 0, { rating_before: null, rating_after: null }),
          participant('user-b', 1),
        ],
      }),
      'user-a',
    )
    expect(vm?.tier).toBeNull()
    expect(vm?.ratingDelta).toBeNull()
  })

  it('returns null for a spectator (non-participant)', () => {
    expect(buildBasketballRecapMoment(match(), 'user-z')).toBeNull()
  })

  it('returns null when the match is not settled', () => {
    expect(buildBasketballRecapMoment(match({ status: 'in_progress' }), 'user-a')).toBeNull()
  })
})
