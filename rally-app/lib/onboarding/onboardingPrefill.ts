import { parseBirthDateParts } from '@/lib/profile/birthDate'
import { competitionCategoryToGender } from '@/lib/profile/genderCategory'
import type { AnalysisProfile } from '@/lib/profile/analysisProfileTypes'
import {
  EXPERIENCE_LEVEL_OPTIONS,
  ONBOARDING_SPORTS,
  PLAY_STYLE_OPTIONS,
  POSITION_OPTIONS,
} from './onboardingRules'
import {
  EMPTY_ONBOARDING_DRAFT,
  type OnboardingActivity,
  type OnboardingDraft,
  type OnboardingExperienceLevel,
} from './onboardingTypes'

const RUNNING_LEVEL_TO_EXPERIENCE: Record<string, OnboardingExperienceLevel> = {
  beginner: 'beginner',
  casual: 'casual',
  competitive: 'competitive',
  race_focused: 'pro',
}

export function onboardingDraftFromAnalysisProfile(profile: AnalysisProfile): OnboardingDraft {
  const birth = parseBirthDateParts(profile.birthDate, profile.birthYear)
  const sports = profile.sports ?? []
  const sportPositions = profile.sportPositions ?? {}
  const selectedSports = ONBOARDING_SPORTS
    .map((sport) => sport.activity)
    .filter((activity) => sports.some((sport) => sport.activityType === activity))

  // Pre-2026 profiles may only have running_level and no sport row yet.
  if (profile.runningLevel && !selectedSports.includes('running')) {
    selectedSports.push('running')
  }

  const sportAnswers = Object.fromEntries(
    sports
      .filter((sport) => ONBOARDING_SPORTS.some((item) => item.activity === sport.activityType))
      .map((sport) => {
        const activity = sport.activityType as OnboardingActivity
        const validLevels = new Set(EXPERIENCE_LEVEL_OPTIONS.map((option) => option.value))
        const experienceLevel = validLevels.has(sport.experienceLevel as OnboardingExperienceLevel)
          ? sport.experienceLevel as OnboardingExperienceLevel
          : activity === 'running' ? RUNNING_LEVEL_TO_EXPERIENCE[profile.runningLevel ?? ''] ?? null : null
        const validStyles = new Set((PLAY_STYLE_OPTIONS[activity] ?? []).map((option) => option.value))
        const playStyles = (sport.playStyles ?? []).filter((style) => validStyles.has(style))
        const position = sportPositions[activity]
        const validPositions = new Set((POSITION_OPTIONS[activity] ?? []).map((option) => option.value))
        return [activity, {
          experienceLevel,
          playStyles,
          positionKey: position && validPositions.has(position) ? position : null,
        }]
      }),
  ) as OnboardingDraft['sportAnswers']

  if (!sportAnswers.running && profile.runningLevel) {
    sportAnswers.running = {
      experienceLevel: RUNNING_LEVEL_TO_EXPERIENCE[profile.runningLevel] ?? null,
      playStyles: [],
      positionKey: null,
    }
  }

  return {
    ...EMPTY_ONBOARDING_DRAFT,
    birthYear: birth.year ? Number(birth.year) : null,
    birthMonth: birth.month ? Number(birth.month) : null,
    gender: competitionCategoryToGender(profile.competitionCategory),
    heightCm: profile.heightCm == null ? '' : String(profile.heightCm),
    weightKg: profile.weightKg == null ? '' : String(profile.weightKg),
    selectedSports,
    sportAnswers,
  }
}
