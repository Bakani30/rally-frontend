import {
  ageFromBirthDate, hrZoneSeconds, intensityLevel, intensityScore,
  keytelCaloriesKcal, metCaloriesKcal, strideMeters, tanakaMaxHr,
  type BiologicalSex, type HrSample, type HrZoneSeconds, type IntensityLevel,
} from '@/lib/health/profileMetrics'
import type { AnalysisProfile, CompetitionCategory } from '@/lib/profile/analysisProfileTypes'

export type BodyProfile = {
  birthDate: string | null
  gender: BiologicalSex | null
  weightKg: number | null
  heightCm: number | null
}

/**
 * Exact inverse of the onboarding wizard's gender→competition_category map
 * (supabase/functions/complete-onboarding/service.ts): male→'men',
 * female→'women', other→'self_describe', prefer_not_to_say→same. Categories
 * that don't come from the wizard's gender step ('open', 'non_binary') map
 * to null — no sex signal.
 */
export function mapCompetitionCategoryToSex(
  category: CompetitionCategory | null,
): BodyProfile['gender'] {
  switch (category) {
    case 'women':
      return 'female'
    case 'men':
      return 'male'
    case 'self_describe':
      return 'other'
    case 'prefer_not_to_say':
      return 'prefer_not_to_say'
    default:
      return null
  }
}

/**
 * Wizard-era profiles carry a full `birthDate` (server returns it); older
 * profiles only have `birthYear`, for which Jan 1 is the fallback.
 */
export function mapAnalysisProfileToBodyProfile(
  profile: AnalysisProfile | null | undefined,
): BodyProfile {
  if (!profile) return { birthDate: null, gender: null, weightKg: null, heightCm: null }
  return {
    birthDate:
      profile.birthDate ?? (profile.birthYear != null ? `${profile.birthYear}-01-01` : null),
    gender: mapCompetitionCategoryToSex(profile.competitionCategory),
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
  }
}

export type BodyMetricsInput = {
  movingTimeSeconds: number | null
  distanceMeters: number | null
  paceSecondsPerKm: number | null
  steps: number | null
  hrSamples: HrSample[]
  deviceCalories: number | null
  profile: BodyProfile
  now: Date
}

export type BodyMetricsViewModel = {
  caloriesKcal: number | null
  avgBpm: number | null
  maxBpm: number | null
  zoneSeconds: HrZoneSeconds | null
  dominantZoneIndex: number | null
  intensityScore: number | null
  intensityLevel: IntensityLevel | null
  cadenceSpm: number | null
  strideMeters: number | null
}

export function buildBodyMetrics(input: BodyMetricsInput): BodyMetricsViewModel {
  const { profile } = input
  const hasHr = input.hrSamples.length >= 2
  const avgBpm = hasHr
    ? Math.round(input.hrSamples.reduce((a, s) => a + s.bpm, 0) / input.hrSamples.length)
    : null
  const maxBpm = hasHr ? Math.round(Math.max(...input.hrSamples.map((s) => s.bpm))) : null

  const age = ageFromBirthDate(profile.birthDate, input.now)
  const maxHr = age != null ? tanakaMaxHr(age) : null
  const rawZones = hasHr && maxHr != null ? hrZoneSeconds(input.hrSamples, maxHr) : null
  const zoneTotal = rawZones ? rawZones.reduce((a, b) => a + b, 0) : 0
  const zones = zoneTotal > 0 ? rawZones : null
  const score = zones ? intensityScore(zones) : null
  const dominantZoneIndex = zones ? zones.indexOf(Math.max(...zones)) : null

  const minutes = input.movingTimeSeconds != null ? input.movingTimeSeconds / 60 : null
  let caloriesKcal: number | null = null
  if (input.deviceCalories != null) {
    caloriesKcal = Math.round(input.deviceCalories)
  } else if (profile.weightKg != null && minutes != null && minutes > 0) {
    caloriesKcal =
      avgBpm != null && age != null
        ? keytelCaloriesKcal({
            sex: profile.gender ?? 'prefer_not_to_say',
            ageYears: age,
            weightKg: profile.weightKg,
            avgBpm,
            durationMinutes: minutes,
          })
        : input.paceSecondsPerKm != null
          ? metCaloriesKcal({
              paceSecondsPerKm: input.paceSecondsPerKm,
              weightKg: profile.weightKg,
              movingHours: minutes / 60,
            })
          : null
  }

  const cadenceSpm =
    input.steps != null && minutes != null && minutes > 0
      ? Math.round(input.steps / minutes)
      : null

  return {
    caloriesKcal,
    avgBpm,
    maxBpm,
    zoneSeconds: zones,
    dominantZoneIndex,
    intensityScore: score,
    intensityLevel: score != null ? intensityLevel(score) : null,
    cadenceSpm,
    strideMeters: strideMeters(input.distanceMeters, input.steps),
  }
}
