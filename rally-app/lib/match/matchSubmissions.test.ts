import { describe, expect, it } from 'vitest'

import type { MatchSubmission } from '../../types/match'
import { getCurrentMatchSubmission } from './matchSubmissions'

function submission(id: string, createdAt: string): MatchSubmission {
  return {
    id,
    submitted_by: `user-${id}`,
    winner_user_id: `winner-${id}`,
    created_at: createdAt,
    activity_session_id: null,
    activity_sessions: null,
  }
}

describe('getCurrentMatchSubmission', () => {
  it('returns null when a match has no submissions', () => {
    expect(getCurrentMatchSubmission({ match_submissions: [] })).toBeNull()
    expect(getCurrentMatchSubmission({ match_submissions: null })).toBeNull()
  })

  it('selects the latest submission by created_at instead of array position', () => {
    const oldest = submission('oldest', '2026-05-11T10:00:00.000Z')
    const latest = submission('latest', '2026-05-11T12:00:00.000Z')
    const middle = submission('middle', '2026-05-11T11:00:00.000Z')

    expect(getCurrentMatchSubmission({ match_submissions: [oldest, latest, middle] })).toBe(latest)
  })
})
