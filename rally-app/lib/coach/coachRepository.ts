import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type {
  CoachActivityContextInput,
  CoachSensorSummaryInput,
  GetCoachActivityInsightsResult,
  SyncBasketballCoachSensorsResult,
  UpdateCoachActivityContextResult,
} from './coachTypes'

export async function fetchCoachActivityInsights(
  activitySessionId: string,
): Promise<GetCoachActivityInsightsResult> {
  const { data, error } = await invokeAuthenticatedFunction<GetCoachActivityInsightsResult>(
    'get-coach-activity-insights',
    { body: { activitySessionId } },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load coach insights')
  if (!data) throw new Error('get-coach-activity-insights returned no data')
  return data
}

export async function saveCoachActivityContext(
  input: CoachActivityContextInput,
): Promise<UpdateCoachActivityContextResult> {
  const { data, error } = await invokeAuthenticatedFunction<UpdateCoachActivityContextResult>(
    'get-coach-activity-insights',
    { body: { action: 'update-context', input } },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to save coach context')
  if (!data) throw new Error('update-coach-activity-context returned no data')
  return data
}

export async function syncBasketballCoachSensors(
  input: CoachSensorSummaryInput,
): Promise<SyncBasketballCoachSensorsResult> {
  const { data, error } = await invokeAuthenticatedFunction<SyncBasketballCoachSensorsResult>(
    'get-coach-activity-insights',
    { body: { action: 'sync-sensors', input } },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to sync watch data')
  if (!data) throw new Error('sync-basketball-coach-sensors returned no data')
  return data
}
