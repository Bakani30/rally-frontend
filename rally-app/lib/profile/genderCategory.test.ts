import { describe, expect, it } from 'vitest'

import { competitionCategoryToGender, GENDER_TO_COMPETITION_CATEGORY } from './genderCategory'

describe('GENDER_TO_COMPETITION_CATEGORY', () => {
  it('maps all 4 onboarding genders', () => {
    expect(GENDER_TO_COMPETITION_CATEGORY.male).toBe('men')
    expect(GENDER_TO_COMPETITION_CATEGORY.female).toBe('women')
    expect(GENDER_TO_COMPETITION_CATEGORY.other).toBe('self_describe')
    expect(GENDER_TO_COMPETITION_CATEGORY.prefer_not_to_say).toBe('prefer_not_to_say')
  })
})

describe('competitionCategoryToGender', () => {
  it('maps men -> male', () => {
    expect(competitionCategoryToGender('men')).toBe('male')
  })
  it('maps women -> female', () => {
    expect(competitionCategoryToGender('women')).toBe('female')
  })
  it('maps self_describe -> other', () => {
    expect(competitionCategoryToGender('self_describe')).toBe('other')
  })
  it('maps prefer_not_to_say -> prefer_not_to_say', () => {
    expect(competitionCategoryToGender('prefer_not_to_say')).toBe('prefer_not_to_say')
  })
  it('maps open -> null (no onboarding-gender twin)', () => {
    expect(competitionCategoryToGender('open')).toBeNull()
  })
  it('maps non_binary -> null (no onboarding-gender twin)', () => {
    expect(competitionCategoryToGender('non_binary')).toBeNull()
  })
  it('maps null -> null', () => {
    expect(competitionCategoryToGender(null)).toBeNull()
  })
})

describe('round trip', () => {
  it.each(['male', 'female', 'other', 'prefer_not_to_say'] as const)(
    'round-trips %s through the category mapping',
    (gender) => {
      const category = GENDER_TO_COMPETITION_CATEGORY[gender]
      expect(competitionCategoryToGender(category)).toBe(gender)
    },
  )
})
