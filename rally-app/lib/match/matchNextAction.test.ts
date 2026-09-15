import { describe, expect, it } from 'vitest'

import type { MatchDetailState } from './matchRules'
import { getNextAction } from './matchNextAction'
import type { MatchWithRelations } from '@/types/match'

describe('getNextAction', () => {
  it('hides the old pending invite response surface', () => {
    const match = {
      status: 'pending',
    } as unknown as MatchWithRelations
    const derived = {
      myParticipant: null,
      mySide: 1,
      myPendingInvite: { id: 'invite-1', invitee_user_id: 'user-a', side: 1 },
      participants: [],
    } as unknown as MatchDetailState

    expect(getNextAction(match, derived, 'user-a')).toEqual({
      kind: 'accepting_invite',
    })
  })

  it('does not show a separate stake action card for pending participants', () => {
    const match = {
      status: 'pending',
    } as unknown as MatchWithRelations
    const derived = {
      myParticipant: { user_id: 'user-a', side: 0, accepted_at: null },
      mySide: 0,
      myPendingInvite: null,
      participants: [{ user_id: 'user-a', side: 0, accepted_at: null }],
    } as unknown as MatchDetailState

    expect(getNextAction(match, derived, 'user-a')).toEqual({
      kind: 'waiting_start',
    })
  })

  it('waits once a pending participant has accepted their stake', () => {
    const match = {
      status: 'pending',
    } as unknown as MatchWithRelations
    const derived = {
      myParticipant: { user_id: 'user-a', side: 0, accepted_at: '2026-05-16T16:00:00.000Z' },
      mySide: 0,
      myPendingInvite: null,
      participants: [{ user_id: 'user-a', side: 0, accepted_at: '2026-05-16T16:00:00.000Z' }],
    } as unknown as MatchDetailState

    expect(getNextAction(match, derived, 'user-a')).toEqual({
      kind: 'waiting_start',
    })
  })

  it('asks an active basketball participant to submit their score', () => {
    const match = {
      status: 'in_progress',
      activity_type: 'basketball',
      match_team_result_submissions: [],
    } as unknown as MatchWithRelations
    const derived = {
      myParticipant: { user_id: 'user-a', side: 0 },
      mySide: 0,
      myPendingInvite: null,
      participants: [{ user_id: 'user-a', side: 0 }],
    } as MatchDetailState

    expect(getNextAction(match, derived, 'user-a')).toEqual({
      kind: 'submit_result',
    })
  })

  it('waits for the opponent team result after my team submits its side score', () => {
    const match = {
      status: 'in_progress',
      activity_type: 'basketball',
      match_team_result_submissions: [
        {
          id: 'side-0',
          side_index: 0,
          submitted_by: 'user-a',
          team_score: 12,
          notes: null,
          proof_urls: [],
          created_at: '2026-05-12T00:00:00.000Z',
          updated_at: '2026-05-12T00:00:00.000Z',
        },
      ],
    } as unknown as MatchWithRelations
    const derived = {
      myParticipant: { user_id: 'user-a', side: 0 },
      mySide: 0,
      myPendingInvite: null,
      participants: [{ user_id: 'user-a', side: 0 }],
    } as MatchDetailState

    expect(getNextAction(match, derived, 'user-a')).toEqual({
      kind: 'waiting_opponent_team_result',
    })
  })
})
