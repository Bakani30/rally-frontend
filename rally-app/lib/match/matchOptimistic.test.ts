import { describe, expect, it } from 'vitest'
import { buildOptimisticMatch } from './matchOptimistic'
import type { CreateMatchInput, CreateMatchResult } from './matchService'
import type { ParticipantUser } from '@/types/match'

const baseInput: CreateMatchInput = {
  activity: 'basketball',
  teamSize: 3,
  minStake: 10,
  creatorStake: 10,
  joinMode: 'code',
  entryCode: 'AB12',
  deadline: new Date('2026-06-23T10:00:00.000Z'),
  creatorUserId: 'user-1',
}

const result: CreateMatchResult = { matchId: 'match-1', joinCode: 'UTXGJEK' }
const creator: ParticipantUser = { id: 'user-1', email: 'cto@example.com', display_name: 'CTO' }
const now = '2026-06-23T09:00:00.000Z'

describe('buildOptimisticMatch', () => {
  it('renders the new room instantly as a pending lobby owned by the creator', () => {
    const match = buildOptimisticMatch(baseInput, result, creator, now)
    expect(match.id).toBe('match-1')
    expect(match.status).toBe('pending')
    expect(match.created_by).toBe('user-1')
    expect(match.activity_type).toBe('basketball')
    expect(match.team_size_per_side).toBe(3)
    expect(match.join_mode).toBe('code')
    expect(match.join_code).toBe('UTXGJEK')
    expect(match.entry_code).toBe('AB12')
    expect(match.deadline).toBe('2026-06-23T10:00:00.000Z')
  })

  it('seeds exactly the creator as a not-yet-accepted side-0 participant', () => {
    const match = buildOptimisticMatch(baseInput, result, creator, now)
    expect(match.match_participants).toHaveLength(1)
    const me = match.match_participants[0]
    expect(me.user_id).toBe('user-1')
    expect(me.side).toBe(0)
    expect(me.stake_contribution).toBe(10)
    // accepted_at stays null: server inserts the host with accepted_at NULL —
    // they must tap "accept stake" separately. Painting a timestamp would flip
    // the Start-button gating before the server records acceptance.
    expect(me.accepted_at).toBeNull()
    expect(me.is_active).toBe(true)
    expect(me.users).toEqual(creator)
  })

  it('starts with empty server-derived relations so realtime can fill them', () => {
    const match = buildOptimisticMatch(baseInput, result, creator, now)
    expect(match.match_submissions).toEqual([])
    expect(match.match_invites).toEqual([])
    expect(match.winner_user_id).toBeNull()
    expect(match.accepted_at).toBeNull()
    expect(match.started_at).toBeNull()
    expect(match.is_tie).toBe(false)
  })

  it('defaults stake currency to leaderboard points (the only public stake currency)', () => {
    const match = buildOptimisticMatch(baseInput, result, creator, now)
    expect(match.stake_currency).toBe('leaderboard_point')
  })
})
