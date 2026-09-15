// Pure helpers for the "วันเกิด" (month + year only) field on the personal-info screen.
// Stored server-side as birth_date = YYYY-MM-01; always write birth_date (never birth_year)
// so the sync_analysis_profile_birth_fields trigger derives birth_year and does not null birth_date.

export function buildBirthDatePayload(yearRaw: string, monthRaw: string): string | null | undefined {
  const year = yearRaw.trim()
  const month = monthRaw.trim()
  if (year.length === 0 && month.length === 0) return null
  // Exactly one of month/year provided: leave the stored birthday unchanged (return undefined)
  // rather than blocking the whole save. Legacy profiles hydrate year-only (birth_year set,
  // birth_date null), and every other field must stay saveable without forcing a month.
  if (year.length === 0 || month.length === 0) return undefined
  const yearNum = Number(year)
  const monthNum = Number(month)
  const currentYear = new Date().getFullYear()
  if (!Number.isInteger(yearNum) || yearNum < 1900 || yearNum > currentYear) {
    throw new Error(`Birth year must be between 1900 and ${currentYear}.`)
  }
  if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    throw new Error('Birth month must be between 1 and 12.')
  }
  const mm = String(monthNum).padStart(2, '0')
  return `${yearNum}-${mm}-01`
}

export function parseBirthDateParts(
  birthDate: string | null,
  birthYear: number | null,
): { year: string; month: string } {
  if (birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return { year: birthDate.slice(0, 4), month: String(Number(birthDate.slice(5, 7))) }
  }
  return { year: birthYear == null ? '' : String(birthYear), month: '' }
}
