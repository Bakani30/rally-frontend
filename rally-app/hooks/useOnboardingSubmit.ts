import { Alert } from 'react-native'

import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useCompleteOnboarding } from '@/hooks/useCompleteOnboarding'
import { useProfile } from '@/hooks/useProfile'
import { parseOptionalNumberField } from '@/lib/onboarding/onboardingRules'
import type { OnboardingDraft } from '@/lib/onboarding/onboardingTypes'

/**
 * Shared "submit the finished draft" flow — used by both the experience
 * step (last playable sport answered) and the sports step (no playable
 * sports selected, so experience is skipped entirely). Wraps
 * `useCompleteOnboarding` with the error alert + `onboarding_completed`
 * analytics event so neither screen duplicates that logic; navigation to
 * `/onboarding/done` stays in the calling screen (screens own routing).
 */
export function useOnboardingSubmit() {
  const { track } = useAnalytics()
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const completeMutation = useCompleteOnboarding(user?.id)

  async function submit(draft: OnboardingDraft): Promise<boolean> {
    try {
      await completeMutation.mutateAsync(draft)
    } catch (error) {
      Alert.alert(
        'บันทึกไม่สำเร็จ',
        error instanceof Error ? error.message : 'เช็คอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง',
      )
      return false
    }
    track({
      name: 'onboarding_completed',
      properties: {
        sports: [...draft.selectedSports],
        has_avatar: !!profile?.avatar_url,
        provided_height: parseOptionalNumberField(draft.heightCm) != null,
        provided_weight: parseOptionalNumberField(draft.weightKg) != null,
      },
    })
    return true
  }

  return { submit, isPending: completeMutation.isPending }
}
