import { describe, expect, it, vi } from 'vitest'
import type { MatchWithRelations } from '@/types/match'

vi.mock('@/lib/storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}))

vi.mock('@/lib/users/userLookupService', () => ({
  normalizeHandle: (raw: string) => raw.trim().replace(/^@+/, '').toLowerCase(),
  validateHandleFormat: () => null,
}))

import { isMatchLockNavigationSurface, shouldLockMatchForUser } from './activeMatchLock'

function match(overrides: Partial<MatchWithRelations> = {}): MatchWithRelations {
  return {
    id: 'match-1',
    status: 'in_progress',
    activity_type: 'basketball',
    match_participants: [
      { user_id: 'user-a', side: 0, stake_contribution: 50, accepted_at: null, rating_before: null, rating_after: null, users: null },
      { user_id: 'user-b', side: 1, stake_contribution: 50, accepted_at: null, rating_before: null, rating_after: null, users: null },
    ],
    match_team_result_submissions: [],
    match_cancel_requests: [],
    match_abuse_reports: [],
    ...overrides,
  } as MatchWithRelations
}

describe('shouldLockMatchForUser', () => {
  it('does not lock a team-sport participant after their side submits', () => {
    expect(shouldLockMatchForUser(match({
      match_team_result_submissions: [
        { id: 'side-a', side_index: 0, submitted_by: 'user-a', team_score: 10, notes: null, proof_urls: [], accepted_by: null, accepted_at: null, created_at: '2026-05-13T00:00:00.000Z', updated_at: '2026-05-13T00:00:00.000Z' },
      ],
    }), 'user-a')).toBe(false)
  })

  it('keeps the other side locked until their side submits', () => {
    expect(shouldLockMatchForUser(match({
      match_team_result_submissions: [
        { id: 'side-a', side_index: 0, submitted_by: 'user-a', team_score: 10, notes: null, proof_urls: [], accepted_by: null, accepted_at: null, created_at: '2026-05-13T00:00:00.000Z', updated_at: '2026-05-13T00:00:00.000Z' },
      ],
    }), 'user-b')).toBe(true)
  })

  it('does not lock a participant after a co-op soft leave', () => {
    expect(shouldLockMatchForUser(match({
      activity_type: 'running',
      match_participants: [
        { user_id: 'user-a', side: 0, stake_contribution: 0, accepted_at: '2026-05-13T00:00:00.000Z', is_active: false, rating_before: null, rating_after: null, users: null },
        { user_id: 'user-b', side: 0, stake_contribution: 0, accepted_at: '2026-05-13T00:00:00.000Z', is_active: true, rating_before: null, rating_after: null, users: null },
      ],
    }), 'user-a')).toBe(false)
  })
})

describe('isMatchLockNavigationSurface', () => {
  it('allows match and run surfaces while a match lock is active', () => {
    expect(isMatchLockNavigationSurface(['match', '[id]'], { id: 'match-1' }, 'match-1')).toBe(true)
    expect(isMatchLockNavigationSurface(['run', 'active'], { matchId: 'match-1' }, 'match-1')).toBe(true)
  })

  it('does not treat other match surfaces as the active lock target', () => {
    expect(isMatchLockNavigationSurface(['match', '[id]'], { id: 'match-2' }, 'match-1')).toBe(false)
    expect(isMatchLockNavigationSurface(['match', 'new'], undefined, 'match-1')).toBe(false)
    expect(isMatchLockNavigationSurface(['run', 'active'], undefined, 'match-1')).toBe(false)
  })

  it('allows locked profile peeks for the same match', () => {
    expect(isMatchLockNavigationSurface(
      ['user', '[id]'],
      { fromMatchId: 'match-1', lockedProfile: '1' },
      'match-1',
    )).toBe(true)
  })

  it('blocks regular profile navigation while a match lock is active', () => {
    expect(isMatchLockNavigationSurface(['user', '[id]'], undefined, 'match-1')).toBe(false)
    expect(isMatchLockNavigationSurface(
      ['user', '[id]'],
      { fromMatchId: 'match-2', lockedProfile: '1' },
      'match-1',
    )).toBe(false)
  })

  it('allows a referee profile peek opened from the same match', () => {
    expect(isMatchLockNavigationSurface(
      ['referee', 'profile'],
      { fromMatchId: 'match-1' },
      'match-1',
    )).toBe(true)
  })

  it('blocks a referee profile that is not tied to the locked match', () => {
    expect(isMatchLockNavigationSurface(['referee', 'profile'], undefined, 'match-1')).toBe(false)
    expect(isMatchLockNavigationSurface(
      ['referee', 'profile'],
      { fromMatchId: 'match-2' },
      'match-1',
    )).toBe(false)
  })
})
