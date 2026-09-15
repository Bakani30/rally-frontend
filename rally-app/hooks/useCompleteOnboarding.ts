import { useMutation, useQueryClient } from '@tanstack/react-query'

import { submitOnboarding } from '@/lib/onboarding/onboardingService'
import type { OnboardingDraft } from '@/lib/onboarding/onboardingTypes'
import { analysisProfileQueryKeys } from '@/lib/profile/analysisProfileQueryKeys'
import { profileQueryKeys } from '@/lib/profile/profileQueryKeys'
import type { UserProfile } from '@/lib/profile/profileRepository'
import { useOnboardingStore } from '@/stores/onboardingStore'

export function useCompleteOnboarding(userId: string | undefined) {
  const queryClient = useQueryClient()
  const resetDraft = useOnboardingStore((state) => state.reset)

  return useMutation({
    mutationFn: (draft: OnboardingDraft) => submitOnboarding(draft),
    onSuccess: async (result) => {
      if (userId) {
        // setQueryData (not just invalidate) so the AuthGate's needsOnboarding
        // flag flips synchronously — a refetch race here would bounce the user
        // back into the wizard from the celebration screen.
        queryClient.setQueryData<UserProfile | undefined>(
          profileQueryKeys.detail(userId),
          (current) =>
            current ? { ...current, onboarding_completed_at: result.completedAt } : current,
        )
        // Wait for the authoritative profile before the caller navigates to
        // the celebration screen. Without this, AuthGate can still observe
        // onboarding_completed_at = null and bounce back into the wizard.
        await queryClient.invalidateQueries({ queryKey: profileQueryKeys.detail(userId) })
        await queryClient.invalidateQueries({ queryKey: analysisProfileQueryKeys.detail(userId) })
      }
      await resetDraft()
    },
  })
}
