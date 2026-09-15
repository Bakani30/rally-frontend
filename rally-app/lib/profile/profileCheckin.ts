import type { DailyCheckinResult } from './profileRepository'

type CheckinProfileProjection = {
  current_streak: number
  last_checkin_date: string | null
  leaderboard_score: number
  spendable_points: number
}

export function applyDailyCheckinResultToProfile<T extends CheckinProfileProjection>(
  current: T | undefined,
  result: DailyCheckinResult,
  today: string,
): T | undefined {
  if (!current) return current
  return {
    ...current,
    current_streak: result.streak,
    last_checkin_date: today,
    leaderboard_score: result.score_after ?? current.leaderboard_score + (result.score_earned ?? result.points_earned),
    spendable_points: result.spendable_after ?? current.spendable_points + result.points_earned,
  }
}
