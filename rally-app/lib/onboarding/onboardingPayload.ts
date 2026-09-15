import {
  buildBirthDateString,
  draftBirthParts,
  parseOptionalNumberField,
  playableSelectedSports,
  validateAboutYouStep,
  validateExperienceStep,
  validateSportsStep,
} from './onboardingRules'
import type {
  CompleteOnboardingPayload,
  CompleteOnboardingSportPayload,
  OnboardingDraft,
} from './onboardingTypes'

/**
 * Assembles the wizard draft into the complete-onboarding payload (pure —
 * unit-tested without the network layer). Throws a Thai-facing Error when
 * the draft is not submittable; screens should have blocked earlier via the
 * per-step validators, so a throw here is a safety net, not the primary UX.
 */
export function buildCompleteOnboardingPayload(
  draft: OnboardingDraft,
  now: Date = new Date(),
): CompleteOnboardingPayload {
  const stepError = validateAboutYouStep(draft, now)
    ?? validateSportsStep(draft)
    ?? validateExperienceStep(draft)
  if (stepError) throw new Error(stepError)

  const birthDate = buildBirthDateString(draftBirthParts(draft))
  if (!birthDate || !draft.gender) throw new Error('ข้อมูลยังไม่ครบ ลองตรวจอีกครั้ง')

  const playable = new Set(playableSelectedSports(draft))
  const sports: CompleteOnboardingSportPayload[] = draft.selectedSports.map((activity) => {
    // Interest-only sports carry no level/styles/position — the wizard never
    // asks, and the server rejects them if sent.
    if (!playable.has(activity)) return { activityType: activity, playStyles: [] }
    const answer = draft.sportAnswers[activity]
    if (!answer?.experienceLevel) throw new Error('เลือกระดับประสบการณ์ให้ครบก่อนนะ')
    return {
      activityType: activity,
      experienceLevel: answer.experienceLevel,
      playStyles: answer.playStyles,
      ...(answer.positionKey ? { positionKey: answer.positionKey } : {}),
    }
  })

  return {
    birthDate,
    gender: draft.gender,
    heightCm: parseOptionalNumberField(draft.heightCm),
    weightKg: parseOptionalNumberField(draft.weightKg),
    sports,
  }
}
