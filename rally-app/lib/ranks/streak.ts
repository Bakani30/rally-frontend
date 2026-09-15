// Per-activity current streak, computed client-side from recent match results
// (founder decision: no server streak source; derive from the last N=20 rows
// that already power "RP ล่าสุด").
//
// Rules:
// - Rows are newest-first (as returned by list_my_recent_rating_history).
// - Ties/void are NOT decisive: they are SKIPPED without breaking the run, so
//   a W-W-tie-W streak reads as W3 (the tie neither extends nor resets it).
//   Rationale: a streak is a run of decisive outcomes; a draw is a non-event
//   for win/loss momentum, matching how players intuit "on a 3-win streak".
// - The streak is the consecutive run of the SAME decisive result starting
//   from the most recent decisive result.
// - Cap at 20 → 'W20+' / 'L20+' (matches the N=20 fetch window).
// - Returns null when there is no decisive result (cell shows "—").

export const STREAK_CAP = 20

export type StreakResult = 'win' | 'loss' | 'tie'

/**
 * Computes a streak label like "W4" / "L2" / "W20+" from newest-first results.
 * Ties are skipped (do not extend or break the run). Null when no decisive row.
 */
export function computeStreak(results: StreakResult[]): string | null {
  let kind: 'win' | 'loss' | null = null
  let count = 0

  for (const r of results) {
    if (r === 'tie') continue // non-decisive: skip without breaking the run
    if (kind === null) {
      kind = r
      count = 1
    } else if (r === kind) {
      count += 1
    } else {
      break // opposite decisive result ends the current streak
    }
  }

  if (kind === null) return null
  const prefix = kind === 'win' ? 'W' : 'L'
  return count >= STREAK_CAP ? `${prefix}${STREAK_CAP}+` : `${prefix}${count}`
}
