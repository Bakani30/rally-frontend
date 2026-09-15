// Pure presentation helpers for per-activity ranking stats.

/**
 * Win rate as a whole-number percentage over decisive matches
 * (wins + losses). Ties are excluded — they count toward total
 * matches but not toward win rate. Returns null when there are no
 * decisive matches yet, so the UI can show a placeholder.
 */
export function winRatePercent(wins: number, losses: number): number | null {
  const decided = wins + losses
  if (decided <= 0) return null
  return Math.round((wins / decided) * 100)
}
