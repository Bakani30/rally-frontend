import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'

import type { CompleteOnboardingPayload, CompleteOnboardingResult } from './onboardingTypes'

export async function completeOnboardingRequest(
  payload: CompleteOnboardingPayload,
): Promise<CompleteOnboardingResult> {
  const { data, error } = await invokeAuthenticatedFunction<CompleteOnboardingResult>(
    'complete-onboarding',
    { body: payload },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to complete onboarding')
  if (!data) throw new Error('Onboarding returned no data')
  return data
}
