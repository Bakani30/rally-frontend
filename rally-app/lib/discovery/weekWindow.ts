/**
 * Week-boundary helpers for weekly event discovery.
 *
 * "This week" is the ISO week (Monday 00:00 → next Monday 00:00, exclusive)
 * in the product timezone. The fallback timezone is Asia/Bangkok; callers pass
 * the device timezone when available so date logic never lives in UI files.
 */

export const DISCOVERY_FALLBACK_TIMEZONE = 'Asia/Bangkok'

export type WeekWindow = {
  /** Inclusive start of the week (Monday 00:00 local) in epoch ms. */
  startMs: number
  /** Exclusive end of the week (next Monday 00:00 local) in epoch ms. */
  endMs: number
  timeZone: string
}

const DAY_MS = 24 * 60 * 60 * 1000

type LocalDateParts = {
  year: number
  month: number
  day: number
  /** ISO weekday: 1 = Monday … 7 = Sunday. */
  isoWeekday: number
}

const WEEKDAY_TO_ISO: Record<string, number> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
}

function localDateParts(ms: number, timeZone: string): LocalDateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })
  const parts = formatter.formatToParts(new Date(ms))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    isoWeekday: WEEKDAY_TO_ISO[get('weekday')] ?? 1,
  }
}

/** Offset of `timeZone` from UTC at instant `ms` (positive east of UTC). */
function timeZoneOffsetMs(ms: number, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(new Date(ms))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0')
  const asUtc = Date.UTC(
    get('year'), get('month') - 1, get('day'),
    get('hour') % 24, get('minute'), get('second'),
  )
  return asUtc - Math.floor(ms / 1000) * 1000
}

/** Epoch ms of local midnight for the given calendar date in `timeZone`. */
function localMidnightMs(year: number, month: number, day: number, timeZone: string): number {
  const guess = Date.UTC(year, month - 1, day)
  // Refine once: offset can differ across a DST boundary near midnight.
  const offset = timeZoneOffsetMs(guess, timeZone)
  const candidate = guess - offset
  return candidate - (timeZoneOffsetMs(candidate, timeZone) - offset)
}

/** The ISO week window (Mon 00:00 → next Mon 00:00) containing `nowMs`. */
export function getWeekWindow(
  nowMs: number,
  timeZone: string = DISCOVERY_FALLBACK_TIMEZONE,
): WeekWindow {
  const today = localDateParts(nowMs, timeZone)
  const todayMidnight = localMidnightMs(today.year, today.month, today.day, timeZone)
  const mondayApprox = todayMidnight - (today.isoWeekday - 1) * DAY_MS
  const monday = localDateParts(mondayApprox + DAY_MS / 2, timeZone)
  const startMs = localMidnightMs(monday.year, monday.month, monday.day, timeZone)
  const nextMonday = localDateParts(startMs + 7 * DAY_MS + DAY_MS / 2, timeZone)
  const endMs = localMidnightMs(nextMonday.year, nextMonday.month, nextMonday.day, timeZone)
  return { startMs, endMs, timeZone }
}

/** True when [startAtMs, endAtMs] overlaps the (start-inclusive, end-exclusive) week. */
export function overlapsWeek(startAtMs: number, endAtMs: number, week: WeekWindow): boolean {
  if (!Number.isFinite(startAtMs) || !Number.isFinite(endAtMs)) return false
  return startAtMs < week.endMs && endAtMs >= week.startMs
}
