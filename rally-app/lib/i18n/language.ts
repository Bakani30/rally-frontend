export type AppLanguage = 'en' | 'th'

export const APP_LANGUAGE_OPTIONS: { value: AppLanguage; label: string; shortLabel: string }[] = [
  { value: 'th', label: 'ไทย', shortLabel: 'TH' },
  { value: 'en', label: 'English', shortLabel: 'EN' },
]

export function normalizeAppLanguage(value: string | null | undefined): AppLanguage {
  return value === 'th' || value === 'en' ? value : 'th'
}
