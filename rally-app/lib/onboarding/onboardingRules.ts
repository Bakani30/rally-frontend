import type {
  OnboardingActivity,
  OnboardingDraft,
  OnboardingExperienceLevel,
  OnboardingGender,
} from './onboardingTypes'

/**
 * Pure registry + validation rules for the post-signup onboarding wizard.
 * Vocabulary (play styles, positions) mirrors the server registry in
 * supabase/functions/complete-onboarding/schema.ts — keep in sync.
 */

export const MIN_AGE_YEARS = 13
export const MAX_AGE_YEARS = 100

export type OnboardingStepKey = 'welcome' | 'about_you' | 'sports' | 'experience' | 'done'

export const ONBOARDING_STEP_ORDER: OnboardingStepKey[] = [
  'welcome',
  'about_you',
  'sports',
  'experience',
  'done',
]

export const GENDER_OPTIONS: Array<{ value: OnboardingGender }> = [
  { value: 'male' },
  { value: 'female' },
  { value: 'other' },
  { value: 'prefer_not_to_say' },
]

export type OnboardingSportInfo = {
  activity: OnboardingActivity
  label: string
  /** MaterialCommunityIcons glyph name — font icons, not emoji (emoji tofu
   * on some simulator runtimes; this lib stays UI-free so it's a string). */
  icon: string
  /** true = แข่งใน Rally ได้แล้ววันนี้ (match modes exist); false = interest-only. */
  available: boolean
}

/** Available-in-app sports lead the list; labels are the canonical Thai names. */
export const ONBOARDING_SPORTS: OnboardingSportInfo[] = [
  { activity: 'basketball', label: 'บาสเกตบอล', icon: 'basketball', available: true },
  { activity: 'running', label: 'วิ่ง', icon: 'run-fast', available: true },
  { activity: 'badminton', label: 'แบดมินตัน', icon: 'badminton', available: true },
  { activity: 'football', label: 'ฟุตบอล', icon: 'soccer', available: false },
  { activity: 'cycling', label: 'ปั่นจักรยาน', icon: 'bike', available: false },
  { activity: 'gym', label: 'ยิม / ฟิตเนส', icon: 'dumbbell', available: false },
  { activity: 'swimming', label: 'ว่ายน้ำ', icon: 'swim', available: false },
  { activity: 'tennis', label: 'เทนนิส', icon: 'tennis', available: false },
  { activity: 'boxing', label: 'มวย', icon: 'boxing-glove', available: false },
  { activity: 'pingpong', label: 'ปิงปอง', icon: 'table-tennis', available: false },
  { activity: 'volleyball', label: 'วอลเลย์บอล', icon: 'volleyball', available: false },
  { activity: 'golf', label: 'กอล์ฟ', icon: 'golf', available: false },
]

export const EXPERIENCE_LEVEL_OPTIONS: Array<{
  value: OnboardingExperienceLevel
}> = [
  { value: 'beginner' },
  { value: 'casual' },
  { value: 'competitive' },
  { value: 'pro' },
]

export type PlayStyleOption = { value: string }

/** Sports without an entry collect interest + level only (no สาย yet). */
export const PLAY_STYLE_OPTIONS: Partial<Record<OnboardingActivity, PlayStyleOption[]>> = {
  running: [
    { value: 'marathon' },
    { value: 'trail' },
    { value: 'track' },
    { value: 'fun_run' },
    { value: 'race' },
  ],
  basketball: [
    { value: 'shooter' },
    { value: 'slasher' },
    { value: 'playmaker' },
    { value: 'defense' },
    { value: 'streetball' },
  ],
  // badminton play styles removed entirely — badminton now has positions instead.
}

export const MAX_PLAY_STYLES = 3

export const POSITION_OPTIONS: Partial<Record<OnboardingActivity, PlayStyleOption[]>> = {
  basketball: [
    { value: 'pg' },
    { value: 'sg' },
    { value: 'sf' },
    { value: 'pf' },
    { value: 'c' },
  ],
  badminton: [
    { value: 'front' },
    { value: 'rear' },
    { value: 'defense' },
    { value: 'rotation' },
  ],
}

/** Experience step needs a detail page when sport has styles or positions. */
export function hasExperienceDetailPage(activity: OnboardingActivity): boolean {
  return !!PLAY_STYLE_OPTIONS[activity] || !!POSITION_OPTIONS[activity]
}

/**
 * Whole years old at `now` from month/year only (day not collected — the
 * birthday is treated as the 1st of the month), or null when incomplete.
 */
export function calculateAge(
  birth: { year: number | null; month: number | null },
  now: Date,
): number | null {
  if (birth.year == null || birth.month == null) return null
  if (birth.month < 1 || birth.month > 12) return null
  let age = now.getFullYear() - birth.year
  if (now.getMonth() + 1 < birth.month) age -= 1
  return age
}

/** 'YYYY-MM-01' for the edge function (day fixed to 01), or null when incomplete. */
export function buildBirthDateString(
  birth: { year: number | null; month: number | null },
): string | null {
  if (birth.year == null || birth.month == null) return null
  if (birth.month < 1 || birth.month > 12) return null
  const mm = String(birth.month).padStart(2, '0')
  return `${birth.year}-${mm}-01`
}

/** Draft birth fields in the {year, month} shape the date helpers use. */
export function draftBirthParts(draft: OnboardingDraft): {
  year: number | null
  month: number | null
} {
  return { year: draft.birthYear, month: draft.birthMonth }
}

/** First blocking error for the about-you step, or null when passable. */
export function validateAboutYouStep(draft: OnboardingDraft, now: Date): string | null {
  const birthDate = buildBirthDateString(draftBirthParts(draft))
  if (!birthDate) return 'กรอกวันเกิดให้ครบก่อนนะ'
  const age = calculateAge(draftBirthParts(draft), now)
  if (age == null || age < MIN_AGE_YEARS) return `Rally รองรับผู้เล่นอายุ ${MIN_AGE_YEARS} ปีขึ้นไป`
  if (age > MAX_AGE_YEARS) return 'ตรวจสอบปีเกิดอีกครั้ง'
  if (!draft.gender) return 'เลือกเพศ หรือเลือก "ไม่ระบุ" ก็ได้'

  const heightError = validateOptionalNumberField(draft.heightCm, 'ส่วนสูง', 80, 250)
  if (heightError) return heightError
  const weightError = validateOptionalNumberField(draft.weightKg, 'น้ำหนัก', 25, 300)
  if (weightError) return weightError
  return null
}

/** Blank is allowed (skippable field); non-blank must be a number in range. */
export function validateOptionalNumberField(
  rawValue: string,
  label: string,
  min: number,
  max: number,
): string | null {
  const trimmed = rawValue.trim()
  if (trimmed.length === 0) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return `${label}ต้องเป็นตัวเลข`
  if (parsed < min || parsed > max) return `${label}ต้องอยู่ระหว่าง ${min}–${max}`
  return null
}

export function parseOptionalNumberField(rawValue: string): number | null {
  const trimmed = rawValue.trim()
  if (trimmed.length === 0) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function validateSportsStep(draft: OnboardingDraft): string | null {
  if (draft.selectedSports.length === 0) return 'เลือกกีฬาที่สนใจอย่างน้อย 1 อย่าง'
  return null
}

/** Selected sports that Rally can match today — the only ones with an experience step. */
export function playableSelectedSports(draft: OnboardingDraft): OnboardingActivity[] {
  return draft.selectedSports.filter((sport) =>
    ONBOARDING_SPORTS.find((s) => s.activity === sport)?.available === true,
  )
}

/** Playable selected sports need an experience level; interest-only ones are never asked. */
export function validateExperienceStep(draft: OnboardingDraft): string | null {
  for (const sport of playableSelectedSports(draft)) {
    if (!draft.sportAnswers[sport]?.experienceLevel) {
      const label = ONBOARDING_SPORTS.find((s) => s.activity === sport)?.label ?? sport
      return `เลือกระดับประสบการณ์ของ${label}ก่อนนะ`
    }
  }
  return null
}
