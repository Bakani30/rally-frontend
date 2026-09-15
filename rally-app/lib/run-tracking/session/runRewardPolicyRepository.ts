import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type { RunRewardPolicy } from './runSessionRewards'

export async function getRunRewardPolicy(
  matchId?: string | null,
): Promise<RunRewardPolicy> {
  const body = matchId ? { matchId } : {}
  const { data, error } = await invokeAuthenticatedFunction<RunRewardPolicy>(
    'get-run-reward-policy',
    { body },
  )

  if (error) throw await extractEdgeFunctionError(error, 'Failed to load run reward policy')
  if (!data?.policyVersion) {
    throw new Error('get-run-reward-policy returned no policyVersion')
  }
  return data
}
