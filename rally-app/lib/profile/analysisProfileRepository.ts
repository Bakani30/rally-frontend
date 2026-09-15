import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'

import type { AnalysisProfile, UpdateAnalysisProfileInput } from './analysisProfileTypes'

export async function getAnalysisProfile(): Promise<AnalysisProfile> {
  const { data, error } = await invokeAuthenticatedFunction<AnalysisProfile>(
    'get-analysis-profile',
    { body: {} },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to load analysis profile')
  if (!data) throw new Error('Analysis profile returned no data')
  return data
}

export async function updateAnalysisProfile(
  input: UpdateAnalysisProfileInput,
): Promise<AnalysisProfile> {
  const { data, error } = await invokeAuthenticatedFunction<AnalysisProfile>(
    'get-analysis-profile',
    { body: { action: 'update', input } },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to update analysis profile')
  if (!data) throw new Error('Analysis profile update returned no data')
  return data
}
