import { describe, expect, it } from 'vitest'

import { buildCompleteOnboardingPayload } from './onboardingPayload'
import { EMPTY_ONBOARDING_DRAFT, type OnboardingDraft } from './onboardingTypes'

const NOW = new Date(2026, 6, 11)

const completeDraft: OnboardingDraft = {
  ...EMPTY_ONBOARDING_DRAFT,
  birthYear: 2000,
  birthMonth: 2,
  gender: 'female',
  heightCm: ' 165 ',
  weightKg: '',
  selectedSports: ['running', 'basketball'],
  sportAnswers: {
    running: { experienceLevel: 'casual', playStyles: ['marathon', 'fun_run'], positionKey: null },
    basketball: { experienceLevel: 'pro', playStyles: ['shooter'], positionKey: 'pg' },
  },
}

describe('buildCompleteOnboardingPayload', () => {
  it('sends interest-only sports without level/styles/position and never blocks on them', () => {
    const draft: OnboardingDraft = {
      ...completeDraft,
      selectedSports: ['basketball', 'cycling', 'golf'],
      sportAnswers: {
        basketball: { experienceLevel: 'pro', playStyles: ['shooter'], positionKey: 'pg' },
      },
    }
    expect(buildCompleteOnboardingPayload(draft, NOW).sports).toEqual([
      { activityType: 'basketball', experienceLevel: 'pro', playStyles: ['shooter'], positionKey: 'pg' },
      { activityType: 'cycling', playStyles: [] },
      { activityType: 'golf', playStyles: [] },
    ])
  })

  it('submits interest-only-only selections without any experience answers', () => {
    const draft: OnboardingDraft = {
      ...completeDraft,
      selectedSports: ['cycling'],
      sportAnswers: {},
    }
    expect(buildCompleteOnboardingPayload(draft, NOW).sports).toEqual([
      { activityType: 'cycling', playStyles: [] },
    ])
  })

  it('assembles the edge-function payload from a complete draft', () => {
    expect(buildCompleteOnboardingPayload(completeDraft, NOW)).toEqual({
      birthDate: '2000-02-01',
      gender: 'female',
      heightCm: 165,
      weightKg: null,
      sports: [
        { activityType: 'running', experienceLevel: 'casual', playStyles: ['marathon', 'fun_run'] },
        {
          activityType: 'basketball',
          experienceLevel: 'pro',
          playStyles: ['shooter'],
          positionKey: 'pg',
        },
      ],
    })
  })

  it('omits positionKey when the sport has none', () => {
    const payload = buildCompleteOnboardingPayload(completeDraft, NOW)
    expect('positionKey' in payload.sports[0]).toBe(false)
  })

  it('keeps badminton level and position in the submitted payload', () => {
    const draft: OnboardingDraft = {
      ...completeDraft,
      selectedSports: ['badminton'],
      sportAnswers: {
        badminton: { experienceLevel: 'competitive', playStyles: [], positionKey: 'rear' },
      },
    }

    expect(buildCompleteOnboardingPayload(draft, NOW).sports).toEqual([
      {
        activityType: 'badminton',
        experienceLevel: 'competitive',
        playStyles: [],
        positionKey: 'rear',
      },
    ])
  })

  it('throws the step error for an unsubmittable draft', () => {
    expect(() => buildCompleteOnboardingPayload(EMPTY_ONBOARDING_DRAFT, NOW)).toThrow()
    expect(() =>
      buildCompleteOnboardingPayload({ ...completeDraft, selectedSports: [] }, NOW),
    ).toThrow()
  })
})
