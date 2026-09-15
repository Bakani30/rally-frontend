import { describe, expect, it, vi } from 'vitest'

import { submitActivity } from './submissionService'

vi.mock('./submissionRepository', () => ({
  submitActivityRecord: vi.fn(async () => ({
    activitySessionId: null,
    submissionId: null,
    winnerUserId: null,
    isTie: false,
  })),
}))

describe('submitActivity', () => {
  it('requires at least one team sport contribution row', () => {
    expect(() =>
      submitActivity({
        matchId: 'match-1',
        activityType: 'basketball',
        data: { side_index: 0, team_score: 0 },
        contributions: [],
      }),
    ).toThrow('Player contributions are required for team scores')
  })

  it('requires team sport contributions to equal the submitted team score', () => {
    expect(() =>
      submitActivity({
        matchId: 'match-1',
        activityType: 'basketball',
        data: { side_index: 0, team_score: 10 },
        contributions: [
          { user_id: 'user-1', points: 6 },
          { user_id: 'user-2', points: 3 },
        ],
      }),
    ).toThrow('Player contributions (9) must equal your team score (10)')
  })

  it('accepts a team sport submission when contributions match the team score', async () => {
    await expect(
      submitActivity({
        matchId: 'match-1',
        activityType: 'badminton',
        data: { side_index: 1, team_score: 21 },
        contributions: [
          { user_id: 'user-3', points: 11 },
          { user_id: 'user-4', points: 10 },
        ],
      }),
    ).resolves.toMatchObject({
      isTie: false,
      winnerUserId: null,
    })
  })

  it('keeps zero-point teammates in a valid team sport submission', async () => {
    await expect(
      submitActivity({
        matchId: 'match-1',
        activityType: 'basketball',
        data: { side_index: 0, team_score: 10 },
        contributions: [
          { user_id: 'user-1', points: 10 },
          { user_id: 'user-2', points: 0 },
        ],
      }),
    ).resolves.toMatchObject({
      isTie: false,
      winnerUserId: null,
    })
  })
})
