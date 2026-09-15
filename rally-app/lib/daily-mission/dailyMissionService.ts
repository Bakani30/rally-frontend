import { readDeviceDailyHealthMetrics } from '@/lib/health/dailyHealthSource'
import { analyzeDailyMissionHealth } from './dailyMissionInsight'
import { syncDailyMission } from './dailyMissionRepository'
import type { DailyMissionSyncResult } from './dailyMissionTypes'

export async function syncDailyMissionFromDevice(): Promise<DailyMissionSyncResult> {
  const metrics = await readDeviceDailyHealthMetrics()
  const insight = analyzeDailyMissionHealth(metrics.distanceMeters, metrics.steps)
  const sync = await syncDailyMission(metrics)
  return { metrics, insight, sync }
}
