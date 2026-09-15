import { describe, expect, it } from 'vitest'
import { applyDailyCheckinResultToProfile } from './profileCheckin'
import type { UserProfile } from './profileRepository'

const baseProfile: UserProfile = {
  display_name: 'Rally Runner',
  handle: 'runner',
  avatar_url: null,
  jersey_number: 9,
  leaderboard_score: 100,
  spendable_points: 120,
  current_streak: 6,
  last_checkin_date: '2026-05-11',
  show_credits_publicly: false,
  username_set_at: null,
  username_changes_used: 0,
  onboarding_completed_at: null,
}

describe('daily check-in profile projection', () => {
  it('projects the returned streak, check-in date, and earned points into cached profile data', () => {
    expect(
      applyDailyCheckinResultToProfile(
        baseProfile,
        { streak: 7, points_earned: 60 },
        '2026-05-12',
      ),
    ).toMatchObject({
      current_streak: 7,
      last_checkin_date: '2026-05-12',
      leaderboard_score: 160,
      spendable_points: 180,
    })
  })

  it('prefers server after-values when the API returns them', () => {
    expect(
      applyDailyCheckinResultToProfile(
        baseProfile,
        { streak: 7, points_earned: 60, score_earned: 60, score_after: 175, spendable_after: 190 },
        '2026-05-12',
      ),
    ).toMatchObject({
      leaderboard_score: 175,
      spendable_points: 190,
    })
  })

  it('leaves an empty cache entry empty', () => {
    expect(
      applyDailyCheckinResultToProfile(
        undefined,
        { streak: 1, points_earned: 10, score_earned: 10, score_after: null, spendable_after: null },
        '2026-05-12',
      ),
    ).toBeUndefined()
  })
})
