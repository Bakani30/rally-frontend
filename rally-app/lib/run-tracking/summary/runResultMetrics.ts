/**
 * Date/time formatting helper shared by the run summary screen. The old
 * Apple-Fitness-style metric grid this file used to build (buildRunResultMetrics)
 * was removed with RunResultCard in the Summary Page v2 rebuild — only the
 * date formatter survives, reused by RunSummaryHeroCard.
 */

/** Thai locale line like "วันจันทร์ 11 พ.ค. 2026 · 17:38". Falls back gracefully on error. */
export function formatRunResultDateTime(startedAtIso: string): string {
  try {
    const date = new Date(startedAtIso)
    const datePart = new Intl.DateTimeFormat('th-TH', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date)
    const timePart = new Intl.DateTimeFormat('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
    return `${datePart} · ${timePart}`
  } catch {
    try {
      return new Date(startedAtIso).toLocaleString()
    } catch {
      return startedAtIso
    }
  }
}
