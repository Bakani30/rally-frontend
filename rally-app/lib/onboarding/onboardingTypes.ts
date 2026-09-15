export type OnboardingActivity =
  | 'running' | 'basketball' | 'badminton' | 'football' | 'cycling' | 'gym'
  | 'swimming' | 'tennis' | 'boxing' | 'pingpong' | 'volleyball' | 'golf'

export type OnboardingExperienceLevel = 'beginner' | 'casual' | 'competitive' | 'pro'

export type OnboardingGender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

/** Per-sport answers collected on the experience step. */
export type OnboardingSportAnswer = {
  experienceLevel: OnboardingExperienceLevel | null
  playStyles: string[]
  positionKey: string | null
}

/**
 * Wizard draft held client-side (Zustand + secure storage) until the final
 * submit. Numeric inputs stay as raw strings until payload assembly so the
 * user can type freely; validation happens in onboardingService.
 */
export type OnboardingDraft = {
  // Birth month/year only (day is not collected; stored server-side as day 01).
  birthYear: number | null
  birthMonth: number | null
  gender: OnboardingGender | null
  heightCm: string
  weightKg: string
  selectedSports: OnboardingActivity[]
  sportAnswers: Partial<Record<OnboardingActivity, OnboardingSportAnswer>>
}

export type CompleteOnboardingSportPayload = {
  activityType: OnboardingActivity
  /** Present only for playable sports (running/basketball/badminton). */
  experienceLevel?: OnboardingExperienceLevel
  playStyles: string[]
  positionKey?: string
}

/** Body of the complete-onboarding edge function (see api-contracts.md). */
export type CompleteOnboardingPayload = {
  birthDate: string
  gender: OnboardingGender
  heightCm: number | null
  weightKg: number | null
  sports: CompleteOnboardingSportPayload[]
}

export type CompleteOnboardingResult = {
  completedAt: string
  alreadyCompleted: boolean
}

export const EMPTY_ONBOARDING_DRAFT: OnboardingDraft = {
  birthYear: null,
  birthMonth: null,
  gender: null,
  heightCm: '',
  weightKg: '',
  selectedSports: [],
  sportAnswers: {},
}
