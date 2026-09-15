import { describe, expect, it } from 'vitest'
import { refereeDictionary } from '@/lib/i18n/dictionaries/referee'
import { translate } from '@/lib/i18n/translate'
import {
  refereePassAccessConditions,
  refereePassActivityLabel,
  refereePassStatusBody,
} from './refereePassPresentation'
import type { AlphaRefereeEligibility } from './alphaRefereeRepository'

const th = (key: keyof typeof refereeDictionary, params?: Record<string, string | number>) =>
  translate(refereeDictionary, key, 'th', params)
const en = (key: keyof typeof refereeDictionary, params?: Record<string, string | number>) =>
  translate(refereeDictionary, key, 'en', params)

function eligibility(partial: Partial<AlphaRefereeEligibility>): AlphaRefereeEligibility {
  return {
    activityType: 'basketball',
    appliedAt: null,
    eligible: false,
    settledMatchCount: 0,
    requiredSettledMatches: 1,
    accessSource: null,
    appointedLevel: null,
    appointmentValidUntil: null,
    ...partial,
  }
}

describe('referee pass presentation', () => {
  it('uses only the active language', () => {
    expect(refereePassActivityLabel('basketball', th)).toBe('บาสเกตบอล')
    expect(refereePassActivityLabel('basketball', en)).toBe('Basketball')
  })

  it('treats an appointment as normal ready access without replaying unlocked gates', () => {
    const appointed = eligibility({
      eligible: true,
      accessSource: 'appointment',
      appointedLevel: 3,
    })
    expect(refereePassStatusBody('basketball', appointed, th)).toBe('พร้อมรับงานบาสเกตบอล')
    expect(refereePassAccessConditions('basketball', appointed, 'บาสเกตบอล', th)).toEqual([
      { icon: 'whistle-outline', text: 'นับคะแนนสดและบันทึกสถิติผู้เล่น', done: true },
      { icon: 'shield-half-full', text: 'ตัดสินแมตช์ที่ตัวเองเล่นไม่ได้', done: false },
    ])
  })

  it('shows only unfinished application gates before access is granted', () => {
    const conditions = refereePassAccessConditions(
      'badminton',
      eligibility({ activityType: 'badminton' }),
      'แบดมินตัน',
      th,
    )
    expect(conditions.map((item) => item.icon)).toEqual([
      'account-check-outline',
      'progress-clock',
      'whistle-outline',
      'shield-half-full',
    ])
    expect(conditions[1]?.text).toBe('เล่นจบ 0/1 แมตช์ · ขาดอีก 1 แมตช์')
  })
})
