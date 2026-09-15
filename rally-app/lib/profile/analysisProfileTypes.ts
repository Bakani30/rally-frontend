export type CompetitionCategory =
  | 'women'
  | 'men'
  | 'open'
  | 'non_binary'
  | 'self_describe'
  | 'prefer_not_to_say'

export type RunningLevel =
  | 'beginner'
  | 'casual'
  | 'competitive'
  | 'race_focused'
  | 'prefer_not_to_say'

export type PrimaryGoal =
  | 'first_5k'
  | 'faster_5k'
  | 'first_10k'
  | 'half_marathon'
  | 'marathon'
  | 'race_pr'
  | 'social_guild'
  | 'general_fitness'
  | 'prefer_not_to_say'

export type PreferredUnits = 'metric' | 'imperial'

export type AnalysisProfile = {
  userId: string
  birthYear: number | null
  birthDate: string | null // 'YYYY-MM-DD'; server returns it (get-analysis-profile schema), wizard-era profiles have it
  competitionCategory: CompetitionCategory | null
  heightCm: number | null
  weightKg: number | null
  runningLevel: RunningLevel | null
  primaryGoal: PrimaryGoal | null
  preferredUnits: PreferredUnits
  createdAt: string | null
  updatedAt: string | null
  /** Added for the new editable onboarding flow; optional for old cached responses. */
  sports?: UserSportProfile[]
  sportPositions?: Record<string, string>
}

export type UserSportProfile = {
  activityType: string
  experienceLevel: string | null
  playStyles: string[]
}

export type UpdateAnalysisProfileInput = Partial<{
  birthYear: number | null
  birthDate: string | null // 'YYYY-MM-01'; personal-info screen writes this, not birthYear
  competitionCategory: CompetitionCategory | null
  heightCm: number | null
  weightKg: number | null
  runningLevel: RunningLevel | null
  primaryGoal: PrimaryGoal | null
  preferredUnits: PreferredUnits
}>
