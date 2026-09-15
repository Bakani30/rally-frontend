import type { LeaderboardActivity } from './leaderboardConfig'

export const DEFAULT_ACTIVITY_RANKING_REWARD = 50

export type ActivityRankingReward = {
  activity: LeaderboardActivity
  leaderboardPoints: number
  activityRankingPoints: number
}

export function buildWinReward(activity: LeaderboardActivity): ActivityRankingReward {
  return {
    activity,
    leaderboardPoints: DEFAULT_ACTIVITY_RANKING_REWARD,
    activityRankingPoints: DEFAULT_ACTIVITY_RANKING_REWARD,
  }
}
