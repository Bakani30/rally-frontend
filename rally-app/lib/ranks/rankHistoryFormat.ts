import type { Tier } from '../leaderboard/tierRules'

// Thai abbreviated months. Intl('th-TH') data isn't guaranteed on Hermes, so
// format explicitly (pure + testable).
const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

/** "2 ก.ค." from an ISO timestamp. Empty string on unparseable input. */
export function formatThaiShortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`
}

const TIER_LABEL: Record<Tier, string> = {
  bronze: 'BRONZE',
  silver: 'SILVER',
  gold: 'GOLD',
  platinum: 'PLATINUM',
  diamond: 'DIAMOND',
  immortal: 'IMMORTAL',
  challenger: 'CHALLENGER',
}

export function tierDisplayLabel(tier: Tier): string {
  return TIER_LABEL[tier] ?? tier.toUpperCase()
}
