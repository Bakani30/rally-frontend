import type { CoachStatTrend, CoachStatTrendBucket } from '@/lib/coach/coachTypes'

export type StatTrendPeriod = 'weekly' | 'monthly'

export type StatTrendRow = {
  key: string
  label: string
  matches: number
  points: string
  rebounds: string
  assists: string
  steals: string
  blocks: string
  pointsDelta: number | null
}

// Explicit month tables instead of Intl — Intl('th-TH') locale data isn't
// guaranteed on Hermes, so keep this pure + testable (same pattern as
// lib/ranks/rankHistoryFormat.ts).
const EN_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const TH_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

/** "W28" ISO-8601 week label from a bucketStart date. Empty string on unparseable input. */
function isoWeekLabel(bucketStart: string): string {
  const parsed = new Date(bucketStart)
  if (Number.isNaN(parsed.getTime())) return ''
  const date = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()))
  const isoDayOfWeek = date.getUTCDay() || 7 // Monday=1 .. Sunday=7
  date.setUTCDate(date.getUTCDate() + 4 - isoDayOfWeek)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNumber = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `W${weekNumber}`
}

/** Short month label ("Jul" / "ก.ค.") from a bucketStart date. Empty string on unparseable input. */
function monthShortLabel(bucketStart: string, language: 'th' | 'en'): string {
  const date = new Date(bucketStart)
  if (Number.isNaN(date.getTime())) return ''
  return language === 'th' ? TH_MONTHS_SHORT[date.getUTCMonth()] : EN_MONTHS_SHORT[date.getUTCMonth()]
}

function formatStatValue(value: number | null): string {
  return value == null ? '—' : value.toFixed(1)
}

function bucketLabel(bucket: CoachStatTrendBucket, period: StatTrendPeriod, language: 'th' | 'en'): string {
  return period === 'weekly'
    ? isoWeekLabel(bucket.bucketStart)
    : monthShortLabel(bucket.bucketStart, language)
}

/**
 * Builds display-ready rows from a stat trend, oldest-to-newest (same order
 * as the input buckets). Numeric averages format to 1 decimal, or '—' when
 * not available. pointsDelta compares against the previous bucket's points
 * average and is null when either side is unavailable (including the first
 * bucket, which has no previous).
 */
export function buildStatTrendRows(
  trend: CoachStatTrend,
  period: StatTrendPeriod,
  language: 'th' | 'en',
): StatTrendRow[] {
  const buckets = period === 'weekly' ? trend.weekly : trend.monthly

  return buckets.map((bucket, index) => {
    const previousPoints = index > 0 ? buckets[index - 1].averages.points : null
    const pointsDelta =
      bucket.averages.points != null && previousPoints != null
        ? bucket.averages.points - previousPoints
        : null

    return {
      key: bucket.bucketStart,
      label: bucketLabel(bucket, period, language),
      matches: bucket.matches,
      points: formatStatValue(bucket.averages.points),
      rebounds: formatStatValue(bucket.averages.rebounds),
      assists: formatStatValue(bucket.averages.assists),
      steals: formatStatValue(bucket.averages.steals),
      blocks: formatStatValue(bucket.averages.blocks),
      pointsDelta,
    }
  })
}
