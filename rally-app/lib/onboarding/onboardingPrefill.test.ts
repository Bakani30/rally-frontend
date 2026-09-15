import { describe, expect, it } from 'vitest'

import { onboardingDraftFromAnalysisProfile } from './onboardingPrefill'
import type { AnalysisProfile } from '@/lib/profile/analysisProfileTypes'

const baseProfile: AnalysisProfile = {
  userId: 'user-1',
  birthYear: 1990,
  birthDate: '1990-04-01',
  competitionCategory: 'men',
  heightCm: 180,
  weightKg: 75,
  runningLevel: 'casual',
  primaryGoal: null,
  preferredUnits: 'metric',
  createdAt: null,
  updatedAt: null,
}

describe('onboardingDraftFromAnalysisProfile', () => {
  it('prefills the new onboarding fields from an existing player profile', () => {
    const draft = onboardingDraftFromAnalysisProfile({
      ...baseProfile,
      sports: [
        { activityType: 'basketball', experienceLevel: 'competitive', playStyles: ['shooter'] },
        { activityType: 'badminton', experienceLevel: 'beginner', playStyles: ['removed-value'] },
      ],
      sportPositions: { basketball: 'sg', badminton: 'rear' },
    })

    expect(draft.birthYear).toBe(1990)
    expect(draft.gender).toBe('male')
    expect(draft.selectedSports).toEqual(['basketball', 'badminton', 'running'])
    expect(draft.sportAnswers.basketball).toEqual({
      experienceLevel: 'competitive',
      playStyles: ['shooter'],
      positionKey: 'sg',
    })
    expect(draft.sportAnswers.badminton).toEqual({
      experienceLevel: 'beginner',
      playStyles: [],
      positionKey: 'rear',
    })
  })

  it('recovers legacy running level when the sport row is missing', () => {
    const draft = onboardingDraftFromAnalysisProfile(baseProfile)

    expect(draft.selectedSports).toEqual(['running'])
    expect(draft.sportAnswers.running?.experienceLevel).toBe('casual')
  })
})
