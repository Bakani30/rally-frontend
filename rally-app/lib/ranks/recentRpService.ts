import type { LeaderboardActivity } from '../leaderboard/leaderboardConfig'
import type { RatingHistoryRow } from './ratingHistoryRepository'
import { computeStreak, type StreakResult } from './streak'

// Max recent-RP rows to show per sport (mock shows ~4).
export const RECENT_RP_LIMIT = 6

export type RecentRpRow = {
  id: string
  /** Signed rating delta for this match (win positive, loss negative). */
  rpDelta: number
  result: 'win' | 'loss'
  /** Primary line, e.g. "vs alice" (1v1) or a mode label. */
  title: string
  /** Secondary context line (mode label when the title is an opponent). */
  subtitle: string | null
  date: string
}

// Human labels for the modes derive_running_mode emits (running only; team
// sports return null and fall back to a generic match label).
const MODE_LABELS: Record<string, string> = {
  race: '1v1',
  ffa: 'FFA',
  coop: 'ทีม',
}

function modeLabel(mode: string | null): string | null {
  if (!mode) return null
  return MODE_LABELS[mode] ?? null
}

/** Primary line: prefer the 1v1 opponent, else the mode label, else "แมตช์". */
function rowTitle(row: RatingHistoryRow): string {
  if (row.opponent_label) return `vs ${row.opponent_label}`
  return modeLabel(row.mode) ?? 'แมตช์'
}

/** Secondary line: mode label, but only when it isn't already the title. */
function rowSubtitle(row: RatingHistoryRow): string | null {
  if (!row.opponent_label) return null // mode is already the title
  return modeLabel(row.mode)
}

// Maps rating-history RPC rows (ALL sports) into signed-RP rows for the
// "RP ล่าสุด" list. Ties are non-decisive and have no win/loss rendering, so
// they are omitted here; they are still counted (skipped) by the streak via
// mapStreakResults below. Rows arrive newest-first from the RPC.
export function mapRecentRpRows(
  rows: RatingHistoryRow[] | undefined,
  activity: LeaderboardActivity,
  limit: number = RECENT_RP_LIMIT,
): RecentRpRow[] {
  if (!rows) return []

  const out: RecentRpRow[] = []
  for (const row of rows) {
    if (row.activity_type !== activity) continue
    if (row.result === 'tie') continue // no win/loss row for a draw

    out.push({
      id: row.match_id,
      rpDelta: row.rating_delta,
      result: row.result,
      title: rowTitle(row),
      subtitle: rowSubtitle(row),
      date: row.settled_at,
    })

    if (out.length >= limit) break
  }

  return out
}

/** Ordered (newest-first) decisive/tie sequence for one activity, for streak. */
export function mapStreakResults(
  rows: RatingHistoryRow[] | undefined,
  activity: LeaderboardActivity,
): StreakResult[] {
  if (!rows) return []
  return rows.filter((r) => r.activity_type === activity).map((r) => r.result)
}

/** Streak label ("W4"/"L2"/"W20+") for one activity, or null when none. */
export function streakLabelForActivity(
  rows: RatingHistoryRow[] | undefined,
  activity: LeaderboardActivity,
): string | null {
  return computeStreak(mapStreakResults(rows, activity))
}
