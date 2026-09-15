import type { DailyHealthMetrics } from '@/lib/health/dailyHealthTypes'

export const DAILY_MISSION_DISTANCE_METERS = 7000

export type SyncDailyMissionInput = DailyHealthMetrics

export type SyncDailyMissionResult = {
  missionDate: string
  eligible: boolean
  alreadyClaimed: boolean
  rewardGranted: boolean
  pointsAwarded: number
  balanceAfter: number
}

export type DailyMissionInsight = {
  status: 'needs_movement' | 'near_goal' | 'goal_met' | 'high_load'
  title: string
  body: string
}

export type DailyMissionSyncResult = {
  metrics: DailyHealthMetrics
  insight: DailyMissionInsight
  sync: SyncDailyMissionResult
}
