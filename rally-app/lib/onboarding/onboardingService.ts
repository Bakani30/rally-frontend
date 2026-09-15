import { buildCompleteOnboardingPayload } from './onboardingPayload'
import { completeOnboardingRequest } from './onboardingRepository'
import type { CompleteOnboardingResult, OnboardingDraft } from './onboardingTypes'

export async function submitOnboarding(
  draft: OnboardingDraft,
): Promise<CompleteOnboardingResult> {
  return completeOnboardingRequest(buildCompleteOnboardingPayload(draft))
}
