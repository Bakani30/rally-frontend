import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type { SyncDailyMissionInput, SyncDailyMissionResult } from './dailyMissionTypes'

export async function syncDailyMission(
  input: SyncDailyMissionInput,
): Promise<SyncDailyMissionResult> {
  const { data, error } = await invokeAuthenticatedFunction<SyncDailyMissionResult>(
    'sync-daily-mission',
    {
      body: {
        missionDate: input.missionDate,
        distanceMeters: input.distanceMeters,
        steps: input.steps,
        source: input.source,
      },
    },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to sync daily mission')
  if (!data) throw new Error('sync-daily-mission returned no data')
  return data
}
