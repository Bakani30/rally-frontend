import { describe, expect, it } from 'vitest'
import { deriveMatchListTrustBadge, deriveMatchTrustBadge } from './matchTrustBadge'
import type { MatchWithRelations, RefereeSportProfile } from '../../types/match'

describe('deriveMatchTrustBadge', () => {
  it('uses settled referee match record as the strongest trust state', () => {
    const badge = deriveMatchTrustBadge({
      ...baseMatch(),
      status: 'settled',
      referee_match_records: [{
        id: 'record-1',
        match_id: 'match-1',
        assignment_id: 'assignment-1',
        referee_user_id: 'ref-1',
        activity_type: 'basketball',
        result_id: 'result-1',
        final_status: 'accepted',
        correction_count: 0,
        had_dispute: false,
        quality_delta: 30,
        referee_level_after: 3,
        trust_tier_after: 'official_ready',
        settled_at: '2026-06-12T00:00:00.000Z',
        created_at: '2026-06-12T00:00:00.000Z',
        updated_at: '2026-06-12T00:00:00.000Z',
      }],
      player_score_drafts: [{
        id: 'draft-1',
        match_id: 'match-1',
        activity_type: 'basketball',
        side_index: 0,
        submitted_by: 'user-1',
        status: 'submitted',
        team_score: 21,
        basketball_stats: [],
        badminton_sets: [],
        note: null,
        proof_urls: [],
        submitted_at: '2026-06-12T00:00:00.000Z',
        created_at: '2026-06-12T00:00:00.000Z',
        updated_at: '2026-06-12T00:00:00.000Z',
      }],
    })

    expect(badge.kind).toBe('referee_verified')
    expect(badge.title).toBe('Referee-Verified')
    expect(badge.subtitle).toContain('Level 3')
    expect(badge.subtitle).toContain('Official-ready')
  })

  it('shows live referee score with sport profile level while players review', () => {
    const badge = deriveMatchTrustBadge({
      ...baseMatch(),
      match_referee_assignments: [assignment()],
      alpha_referee_result_submissions: [{
        id: 'result-1',
        match_id: 'match-1',
        assignment_id: 'assignment-1',
        referee_user_id: 'ref-1',
        result_kind: 'team_score',
        side_0_score: 20,
        side_1_score: 18,
        winner_side: 0,
        winner_user_id: null,
        is_tie: false,
        note: null,
        proof_urls: [],
        status: 'pending_player_action',
        created_at: '2026-06-12T00:00:00.000Z',
        updated_at: '2026-06-12T00:00:00.000Z',
      }],
    }, profile())

    expect(badge.kind).toBe('referee_score')
    expect(badge.subtitle).toContain('Level 2')
    expect(badge.metric).toBe('4.6')
  })

  it('falls back to player score draft state when no referee exists', () => {
    const badge = deriveMatchTrustBadge({
      ...baseMatch(),
      player_score_drafts: [{
        id: 'draft-1',
        match_id: 'match-1',
        activity_type: 'badminton',
        side_index: 0,
        submitted_by: 'user-1',
        status: 'submitted',
        team_score: 21,
        basketball_stats: [],
        badminton_sets: [{ side0Score: 21, side1Score: 17 }],
        note: null,
        proof_urls: [],
        submitted_at: '2026-06-12T00:00:00.000Z',
        created_at: '2026-06-12T00:00:00.000Z',
        updated_at: '2026-06-12T00:00:00.000Z',
      }],
    })

    expect(badge.kind).toBe('player_score_draft')
    expect(badge.metric).toBe('1/2')
  })
})

describe('deriveMatchListTrustBadge', () => {
  it('uses referee metadata for settled verified match rows', () => {
    const badge = deriveMatchListTrustBadge({
      ...baseMyMatch(),
      trust_source: 'referee_verified',
      trust_label: 'Referee-Verified',
      trust_weight: 100,
      referee_level: 2,
      referee_trust_tier: 'community',
      referee_final_status: 'accepted',
    })

    expect(badge.label).toBe('Referee-Verified')
    expect(badge.detail).toContain('L2')
    expect(badge.weight).toBe(100)
    expect(badge.tone).toBe('green')
  })

  it('falls back to honor weighting when older rows have no trust summary', () => {
    const badge = deriveMatchListTrustBadge(baseMyMatch())

    expect(badge.source).toBe('honor')
    expect(badge.weight).toBe(30)
    expect(badge.detail).toBe('Player-confirmed result')
  })
})

function baseMyMatch() {
  return {
    id: 'match-1',
    created_by: 'host',
    activity_type: 'basketball',
    stake: 10,
    stake_currency: 'leaderboard_point' as const,
    status: 'settled' as const,
    deadline: '2026-06-12T10:00:00.000Z',
    winner_user_id: 'host',
    is_tie: false,
    is_coop: false,
    updated_at: '2026-06-12T11:00:00.000Z',
  }
}

function baseMatch(): MatchWithRelations {
  return {
    id: 'match-1',
    source: 'legacy_standalone',
    created_by: 'user-1',
    activity_type: 'basketball',
    rule_text: null,
    rule_params: {},
    stake: 10,
    stake_currency: 'leaderboard_point',
    deadline: '2026-06-12T00:00:00.000Z',
    status: 'in_progress',
    accepted_at: null,
    started_at: null,
    winner_user_id: null,
    is_tie: false,
    is_coop: false,
    team_size_per_side: 3,
    join_mode: 'invite',
    join_code: null,
    entry_code: null,
    match_participants: [],
    match_submissions: [],
  }
}

function assignment() {
  return {
    id: 'assignment-1',
    match_id: 'match-1',
    referee_user_id: 'ref-1',
    activity_type: 'basketball' as const,
    assigned_by: 'user-1',
    status: 'assigned' as const,
    assigned_at: '2026-06-12T00:00:00.000Z',
    updated_at: '2026-06-12T00:00:00.000Z',
  }
}

function profile(): RefereeSportProfile {
  return {
    user_id: 'ref-1',
    activity_type: 'basketball',
    level: 2,
    trust_tier: 'community',
    rating: 4.61,
    trust_score: 300,
    completed_matches: 8,
    referee_verified_matches: 8,
    clean_matches: 7,
    corrected_matches: 1,
    disputed_matches: 0,
    latest_match_id: 'match-old',
    latest_settled_at: '2026-06-11T00:00:00.000Z',
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-11T00:00:00.000Z',
  }
}
