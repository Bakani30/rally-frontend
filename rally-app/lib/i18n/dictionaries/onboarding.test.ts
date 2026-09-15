import { describe, expect, it } from 'vitest'
import { translate } from '@/lib/i18n/translate'
import { onboardingDictionary } from './onboarding'

describe('onboardingDictionary', () => {
  it('has th + en for every key', () => {
    for (const [key, val] of Object.entries(onboardingDictionary)) {
      expect(val.th, `${key}.th`).toBeTruthy()
      expect(val.en, `${key}.en`).toBeTruthy()
    }
  })
  it('uses the locked wording', () => {
    expect(translate(onboardingDictionary, 'position_pg', 'th')).toBe('พอยต์การ์ด')
    expect(translate(onboardingDictionary, 'position_pg', 'en')).toBe('PG')
    expect(translate(onboardingDictionary, 'style_marathon', 'th')).toBe('สายมาราธอน')
    expect(translate(onboardingDictionary, 'bmpos_front', 'th')).toBe('หน้า')
    expect(translate(onboardingDictionary, 'bmpos_front', 'en')).toBe('Front Court')
    expect(translate(onboardingDictionary, 'title_welcome', 'en')).toBe('Welcome to RALLY')
  })
})
