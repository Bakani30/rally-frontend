import { describe, expect, it } from 'vitest'

import {
  buildBirthDateString,
  calculateAge,
  EXPERIENCE_LEVEL_OPTIONS,
  GENDER_OPTIONS,
  hasExperienceDetailPage,
  PLAY_STYLE_OPTIONS,
  POSITION_OPTIONS,
  validateAboutYouStep,
  validateExperienceStep,
  validateOptionalNumberField,
  validateSportsStep,
} from './onboardingRules'
import { EMPTY_ONBOARDING_DRAFT, type OnboardingDraft } from './onboardingTypes'

const NOW = new Date(2026, 6, 11) // 2026-07-11 local time

function draftWith(overrides: Partial<OnboardingDraft>): OnboardingDraft {
  return { ...EMPTY_ONBOARDING_DRAFT, ...overrides }
}

const validAboutYou: Partial<OnboardingDraft> = {
  birthYear: 2000,
  birthMonth: 2,
  gender: 'male',
  heightCm: '180',
  weightKg: '70',
}

describe('calculateAge (month/year only, birthday = 1st of month)', () => {
  it('counts a birth month that already passed this year', () => {
    expect(calculateAge({ year: 2000, month: 2 }, NOW)).toBe(26)
  })

  it('does not count a birth month still ahead this year', () => {
    expect(calculateAge({ year: 2000, month: 12 }, NOW)).toBe(25)
  })

  it('counts the current month as already had the birthday', () => {
    expect(calculateAge({ year: 2000, month: 7 }, NOW)).toBe(26)
  })

  it('returns null for incomplete or impossible parts', () => {
    expect(calculateAge({ year: 2000, month: null }, NOW)).toBeNull()
    expect(calculateAge({ year: null, month: 5 }, NOW)).toBeNull()
    expect(calculateAge({ year: 2000, month: 13 }, NOW)).toBeNull()
  })
})

describe('buildBirthDateString', () => {
  it('zero-pads the month and fixes the day to 01', () => {
    expect(buildBirthDateString({ year: 2000, month: 2 })).toBe('2000-02-01')
    expect(buildBirthDateString({ year: 1995, month: 11 })).toBe('1995-11-01')
  })

  it('returns null when incomplete or out of range', () => {
    expect(buildBirthDateString({ year: 2000, month: null })).toBeNull()
    expect(buildBirthDateString({ year: 2000, month: 0 })).toBeNull()
  })
})

describe('validateAboutYouStep', () => {
  it('passes a complete valid draft', () => {
    expect(validateAboutYouStep(draftWith(validAboutYou), NOW)).toBeNull()
  })

  it('allows blank height and weight (skippable)', () => {
    expect(
      validateAboutYouStep(draftWith({ ...validAboutYou, heightCm: '', weightKg: '' }), NOW),
    ).toBeNull()
  })

  it('blocks under-13 players', () => {
    expect(
      validateAboutYouStep(
        draftWith({ ...validAboutYou, birthYear: 2020, birthMonth: 1 }),
        NOW,
      ),
    ).toContain('13')
  })

  it('blocks missing gender and out-of-range weight', () => {
    expect(validateAboutYouStep(draftWith({ ...validAboutYou, gender: null }), NOW)).not.toBeNull()
    expect(
      validateAboutYouStep(draftWith({ ...validAboutYou, weightKg: '500' }), NOW),
    ).not.toBeNull()
  })
})

describe('validateOptionalNumberField', () => {
  it('accepts blank, rejects junk and out-of-range', () => {
    expect(validateOptionalNumberField('', 'น้ำหนัก', 25, 300)).toBeNull()
    expect(validateOptionalNumberField('70.5', 'น้ำหนัก', 25, 300)).toBeNull()
    expect(validateOptionalNumberField('abc', 'น้ำหนัก', 25, 300)).not.toBeNull()
    expect(validateOptionalNumberField('10', 'น้ำหนัก', 25, 300)).not.toBeNull()
  })
})

describe('validateSportsStep / validateExperienceStep', () => {
  it('requires at least one sport', () => {
    expect(validateSportsStep(draftWith({}))).not.toBeNull()
    expect(validateSportsStep(draftWith({ selectedSports: ['running'] }))).toBeNull()
  })

  it('requires an experience level per selected sport', () => {
    const missing = draftWith({
      selectedSports: ['running', 'basketball'],
      sportAnswers: {
        running: { experienceLevel: 'casual', playStyles: [], positionKey: null },
      },
    })
    expect(validateExperienceStep(missing)).not.toBeNull()

    const complete = draftWith({
      selectedSports: ['running', 'basketball'],
      sportAnswers: {
        running: { experienceLevel: 'casual', playStyles: ['marathon'], positionKey: null },
        basketball: { experienceLevel: 'pro', playStyles: ['shooter'], positionKey: 'pg' },
      },
    })
    expect(validateExperienceStep(complete)).toBeNull()
  })
})

describe('option sets (new taxonomy, value-only)', () => {
  it('GENDER_OPTIONS and EXPERIENCE_LEVEL_OPTIONS are value-only entries', () => {
    expect(GENDER_OPTIONS.map((o) => o.value)).toEqual(['male', 'female', 'other', 'prefer_not_to_say'])
    expect('label' in GENDER_OPTIONS[0]).toBe(false)

    expect(EXPERIENCE_LEVEL_OPTIONS.map((o) => o.value)).toEqual([
      'beginner',
      'casual',
      'competitive',
      'pro',
    ])
    expect('label' in EXPERIENCE_LEVEL_OPTIONS[0]).toBe(false)
    expect('helper' in EXPERIENCE_LEVEL_OPTIONS[0]).toBe(false)
  })

  it('POSITION_OPTIONS.basketball is exactly pg/sg/sf/pf/c (no guard/wing/big)', () => {
    const values = POSITION_OPTIONS.basketball?.map((o) => o.value)
    expect(values).toEqual(['pg', 'sg', 'sf', 'pf', 'c'])
    expect(values).not.toContain('guard')
    expect(values).not.toContain('wing')
    expect(values).not.toContain('big')
  })

  it('POSITION_OPTIONS.badminton is exactly front/rear/defense/rotation', () => {
    expect(POSITION_OPTIONS.badminton?.map((o) => o.value)).toEqual([
      'front',
      'rear',
      'defense',
      'rotation',
    ])
  })

  it('shows detail page for badminton even without play styles', () => {
    expect(hasExperienceDetailPage('badminton')).toBe(true)
    expect(hasExperienceDetailPage('running')).toBe(true)
  })

  it('PLAY_STYLE_OPTIONS.running includes marathon and fun_run, not road or social', () => {
    const values = PLAY_STYLE_OPTIONS.running?.map((o) => o.value)
    expect(values).toContain('marathon')
    expect(values).toContain('fun_run')
    expect(values).not.toContain('road')
    expect(values).not.toContain('social')
  })

  it('PLAY_STYLE_OPTIONS.basketball is unchanged', () => {
    expect(PLAY_STYLE_OPTIONS.basketball?.map((o) => o.value)).toEqual([
      'shooter',
      'slasher',
      'playmaker',
      'defense',
      'streetball',
    ])
  })

  it('PLAY_STYLE_OPTIONS.badminton is removed', () => {
    expect(PLAY_STYLE_OPTIONS.badminton).toBeUndefined()
  })
})
