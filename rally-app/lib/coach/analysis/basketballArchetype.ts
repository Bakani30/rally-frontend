import type { BasketballRole, BasketballStatLine } from '@/lib/coach/coachTypes'

// Lanes we can score from a statline. Each lane maps to the BasketballRole it
// signals. 'all_around' is never a lane winner directly — it is the fallback
// when no lane dominates.
type ArchetypeLaneRole = Exclude<BasketballRole, 'all_around'>

type ArchetypeLane = {
  role: ArchetypeLaneRole
  score: number
}

// Fixed reference weights used to normalize a lane's raw stat when no
// baseline average is available for that stat. These approximate a
// competent recreational box-score line (roughly: 10 pts, 5 reb, 3 ast,
// 2 combined stl+blk per game) so a single strong stat still stands out.
const FALLBACK_REFERENCE = {
  points: 10,
  rebounds: 5,
  assists: 3,
  defense: 2,
}

// Minimum reference floor so a near-zero baseline average doesn't blow up
// the normalized score.
const BASELINE_EPSILON = 0.5

// The top lane must beat the runner-up by this multiple to declare a
// dominant role; otherwise the stats are read as balanced (all_around).
const DOMINANCE_RATIO = 1.25

function normalizedLaneScore(rawValue: number, baselineAverage: number | null, fallbackReference: number): number {
  const reference = baselineAverage != null && baselineAverage > 0
    ? Math.max(baselineAverage, BASELINE_EPSILON)
    : fallbackReference
  return rawValue / reference
}

/**
 * Derives a basketball archetype purely from a match's statline, normalized
 * against the player's own baseline averages when available. Returns null
 * when no numeric stats were logged at all (nothing to derive from).
 *
 * Stat lanes with no logged value are excluded rather than treated as 0 —
 * a points-only statline should read as a scoring role, not get diluted by
 * assumed zeroes in the other lanes.
 */
export function deriveBasketballArchetype(
  stats: BasketballStatLine,
  baselineAverages: BasketballStatLine | null | undefined,
): BasketballRole | null {
  const lanes: ArchetypeLane[] = []

  if (typeof stats.points === 'number') {
    lanes.push({
      role: 'shooter',
      score: normalizedLaneScore(stats.points, baselineAverages?.points ?? null, FALLBACK_REFERENCE.points),
    })
  }

  if (typeof stats.assists === 'number') {
    lanes.push({
      role: 'handler',
      score: normalizedLaneScore(stats.assists, baselineAverages?.assists ?? null, FALLBACK_REFERENCE.assists),
    })
  }

  if (typeof stats.rebounds === 'number') {
    lanes.push({
      role: 'big',
      score: normalizedLaneScore(stats.rebounds, baselineAverages?.rebounds ?? null, FALLBACK_REFERENCE.rebounds),
    })
  }

  const hasSteals = typeof stats.steals === 'number'
  const hasBlocks = typeof stats.blocks === 'number'
  if (hasSteals || hasBlocks) {
    const defenseValue = (stats.steals ?? 0) + (stats.blocks ?? 0)
    const baselineSteals = baselineAverages?.steals ?? null
    const baselineBlocks = baselineAverages?.blocks ?? null
    const baselineDefense = baselineSteals != null || baselineBlocks != null
      ? (baselineSteals ?? 0) + (baselineBlocks ?? 0)
      : null
    lanes.push({
      role: 'defender',
      score: normalizedLaneScore(defenseValue, baselineDefense, FALLBACK_REFERENCE.defense),
    })
  }

  if (lanes.length === 0) return null

  const sorted = [...lanes].sort((a, b) => b.score - a.score)
  const top = sorted[0]
  const runnerUp = sorted[1]

  if (!runnerUp || top.score >= runnerUp.score * DOMINANCE_RATIO) {
    return top.role
  }
  return 'all_around'
}

/**
 * Resolves the archetype to show for a match: an explicitly picked role
 * always wins (it is the player's own signal), then the derived archetype
 * from stats, and finally 'all_around' when nothing else is available.
 */
export function resolveArchetype(
  stats: BasketballStatLine,
  baselineAverages: BasketballStatLine | null | undefined,
  pickedRole: BasketballRole | null | undefined,
): BasketballRole {
  if (pickedRole != null) return pickedRole
  return deriveBasketballArchetype(stats, baselineAverages) ?? 'all_around'
}
