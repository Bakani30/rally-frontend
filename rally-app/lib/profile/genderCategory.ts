import type { OnboardingGender } from '@/lib/onboarding/onboardingTypes'
import type { CompetitionCategory } from '@/lib/profile/analysisProfileTypes'

/**
 * Client-side mirror of `GENDER_TO_COMPETITION_CATEGORY` in
 * `supabase/functions/complete-onboarding/service.ts` — keep in sync. The
 * personal-info screen edits `competition_category` via the onboarding
 * gender vocabulary, so it needs the same forward mapping onboarding uses.
 */
export const GENDER_TO_COMPETITION_CATEGORY: Record<OnboardingGender, CompetitionCategory> = {
  male: 'men',
  female: 'women',
  other: 'self_describe',
  prefer_not_to_say: 'prefer_not_to_say',
}

/**
 * Reverse of `GENDER_TO_COMPETITION_CATEGORY`, used to hydrate the
 * personal-info screen's gender pill from a stored `competition_category`.
 * `open`/`non_binary` predate the onboarding gender vocabulary and have no
 * onboarding-gender twin, so they (and `null`) hydrate to `null` — the user
 * re-picks from the 4 onboarding options.
 */
export function competitionCategoryToGender(
  category: CompetitionCategory | null,
): OnboardingGender | null {
  switch (category) {
    case 'men':
      return 'male'
    case 'women':
      return 'female'
    case 'self_describe':
      return 'other'
    case 'prefer_not_to_say':
      return 'prefer_not_to_say'
    default:
      return null
  }
}
