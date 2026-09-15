import { describe, expect, it, vi } from 'vitest'

// mapAnalysisProfileToBodyProfile/mapCompetitionCategoryToSex are pure, but
// the hook module also pulls in useAnalytics/useAnalysisProfile, which reach
// `@/lib/supabase` transitively. Stub it so import doesn't need real env vars
// — same pattern as lib/auth/appleAuth.test.ts, lib/match/proofUploadService.test.ts.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import { mapAnalysisProfileToBodyProfile, mapCompetitionCategoryToSex } from './useRunBodyMetrics'
import type { AnalysisProfile } from '@/lib/profile/analysisProfileTypes'

const BASE_PROFILE: AnalysisProfile = {
  userId: 'u1',
  birthYear: 1995,
  birthDate: '1995-06-15',
  competitionCategory: 'men',
  heightCm: 180,
  weightKg: 75,
  runningLevel: 'casual',
  primaryGoal: 'general_fitness',
  preferredUnits: 'metric',
  createdAt: null,
  updatedAt: null,
}

describe('mapCompetitionCategoryToSex', () => {
  it('inverts the wizard map exactly: women/men → female/male', () => {
    expect(mapCompetitionCategoryToSex('women')).toBe('female')
    expect(mapCompetitionCategoryToSex('men')).toBe('male')
  })

  it('inverts self_describe → other and prefer_not_to_say → prefer_not_to_say', () => {
    expect(mapCompetitionCategoryToSex('self_describe')).toBe('other')
    expect(mapCompetitionCategoryToSex('prefer_not_to_say')).toBe('prefer_not_to_say')
  })

  it('non-wizard categories carry no sex signal', () => {
    expect(mapCompetitionCategoryToSex('open')).toBeNull()
    expect(mapCompetitionCategoryToSex('non_binary')).toBeNull()
    expect(mapCompetitionCategoryToSex(null)).toBeNull()
  })
})

describe('mapAnalysisProfileToBodyProfile', () => {
  it('uses the real birthDate and passes height/weight through', () => {
    expect(mapAnalysisProfileToBodyProfile(BASE_PROFILE)).toEqual({
      birthDate: '1995-06-15',
      gender: 'male',
      weightKg: 75,
      heightCm: 180,
    })
  })

  it('falls back to Jan-1 of birthYear for pre-wizard profiles without birthDate', () => {
    expect(mapAnalysisProfileToBodyProfile({ ...BASE_PROFILE, birthDate: null })).toEqual({
      birthDate: '1995-01-01',
      gender: 'male',
      weightKg: 75,
      heightCm: 180,
    })
  })

  it('leaves birthDate null when both birthDate and birthYear are unset', () => {
    expect(
      mapAnalysisProfileToBodyProfile({ ...BASE_PROFILE, birthDate: null, birthYear: null }),
    ).toEqual({
      birthDate: null,
      gender: 'male',
      weightKg: 75,
      heightCm: 180,
    })
  })

  it('returns an all-null profile when there is no profile yet', () => {
    expect(mapAnalysisProfileToBodyProfile(null)).toEqual({
      birthDate: null,
      gender: null,
      weightKg: null,
      heightCm: null,
    })
    expect(mapAnalysisProfileToBodyProfile(undefined)).toEqual({
      birthDate: null,
      gender: null,
      weightKg: null,
      heightCm: null,
    })
  })
})
