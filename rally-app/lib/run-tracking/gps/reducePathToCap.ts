import { simplifyDouglasPeucker } from '../../maps/displayRoutePath'
import type { GpsPoint } from './gpsTypes'

/**
 * Reduce a finalized GPS path to at most `cap` points so it clears the
 * server's `path` array cap (submit-run-session rejects `path.length > 1500`).
 *
 * Why this exists: a continuous run beyond ~2h05m at the 5s upload cadence
 * exceeds 1500 points, and nothing enforced the cap client-side — so the
 * payload was permanently unsubmittable (and now dead-letters as a validation
 * failure). This is the single client-side enforcement of the cap constant.
 *
 * Strategy (geometry-preserving):
 *   1. Split the path into contiguous runs bounded by BOTH (a) every `isPaused`
 *      transition and (b) a max sample-time span per run (see
 *      MAX_SEGMENT_GAP_SECONDS). Transition boundaries are load-bearing for the
 *      server's paused-segment distance logic. The time-span boundaries stop DP
 *      from ever merging a long, straight, low-jitter ACTIVE stretch into a
 *      single kept chord whose dt would trip the server's gap-exclusion rule
 *      (see below) — DP has no time-based keep rule of its own.
 *   2. Douglas-Peucker each run (reusing the display simplifier — one DP impl),
 *      iteratively relaxing the tolerance until the total is at or under `cap`.
 *      DP keeps each run's endpoints and preserves order, so the whole path's
 *      first/last points and monotonic timestamps survive.
 *
 * Why the time-span split (T4↔T5 seam): the server's `deriveGapExcludedDistance`
 * (supabase/functions/_shared/pathIntegrity.ts) EXCLUDES any segment whose dt
 * exceeds GAP_MAX_DT_SECONDS (300s) — it can't tell a real GPS gap from a chord
 * DP fabricated by dropping every intermediate point of a continuous run. If
 * such fabricated chords exceed 10% of total distance, the server rejects the
 * submission as `distance_path_mismatch` and it dead-letters permanently. By
 * capping each pre-DP run at MAX_SEGMENT_GAP_SECONDS (< 300s) and because DP
 * always keeps a run's endpoints, every retained adjacent pair stays comfortably
 * under the 300s exclusion threshold, so the server counts every active chord.
 *
 * Convergence: at a large enough tolerance each run collapses to its two
 * endpoints, so the floor is ~2× the number of runs. Runs come from pause spans
 * (a handful — the pause ledger merges them, budget-capped at 15 min) plus one
 * time cut per MAX_SEGMENT_GAP_SECONDS of elapsed session (~45 for a 3h run →
 * ~90 mandatory endpoints), still far below the cap, so the loop always
 * converges. We deliberately do not handle the physically impossible case of
 * >cap/2 mandatory boundaries.
 *
 * Pure. No React, no expo-*, node-testable.
 */

const INITIAL_TOLERANCE_M = 2
const RELAX_FACTOR = 1.7
const MAX_RELAX_ITERATIONS = 48

/**
 * Max sample-time span (s) a single pre-DP run may cover. Kept comfortably under
 * pathIntegrity.ts's GAP_MAX_DT_SECONDS (300s): the server excludes any segment
 * whose dt exceeds 300s from its derived distance, so no retained adjacent pair
 * may span that long. 240s leaves a 60s margin for the boundary-inclusive split
 * (a run may reach — never exceed — this span before it is cut).
 */
const MAX_SEGMENT_GAP_SECONDS = 240
const MAX_SEGMENT_GAP_MS = MAX_SEGMENT_GAP_SECONDS * 1000

export function reducePathToCap(path: readonly GpsPoint[], cap: number): GpsPoint[] {
  // Already within budget — hand back a fresh array so callers can treat the
  // result as owned/mutable regardless of the over/under-cap branch.
  if (path.length <= cap) return [...path]

  const segments = splitAtPauseAndTimeGaps(path)

  let tolerance = INITIAL_TOLERANCE_M
  let reduced = simplifySegments(segments, tolerance)
  for (let i = 0; i < MAX_RELAX_ITERATIONS && reduced.length > cap; i++) {
    tolerance *= RELAX_FACTOR
    reduced = simplifySegments(segments, tolerance)
  }
  return reduced
}

/**
 * Contiguous runs bounded by (a) `isPaused` transitions and (b) a max
 * sample-time span. Consecutive runs never share a point, so a boundary join
 * pairs two originally adjacent points (one sample apart). Within a run, DP may
 * drop every interior point, so the widest possible retained gap equals the
 * run's own span — capping each run at MAX_SEGMENT_GAP_MS therefore guarantees
 * every retained adjacent pair stays under that span. A pause-transition cut
 * always wins; the time cut only ever subdivides a same-`isPaused` stretch, so
 * it never fabricates a paused boundary or changes derived distance.
 */
function splitAtPauseAndTimeGaps(path: readonly GpsPoint[]): GpsPoint[][] {
  const segments: GpsPoint[][] = []
  let current: GpsPoint[] = [path[0]]
  for (let i = 1; i < path.length; i++) {
    const isTransition = path[i].isPaused !== path[i - 1].isPaused
    const spansTooLong = path[i].timestamp - current[0].timestamp > MAX_SEGMENT_GAP_MS
    if (isTransition || spansTooLong) {
      segments.push(current)
      current = [path[i]]
    } else {
      current.push(path[i])
    }
  }
  segments.push(current)
  return segments
}

function simplifySegments(segments: readonly GpsPoint[][], toleranceM: number): GpsPoint[] {
  const out: GpsPoint[] = []
  for (const segment of segments) {
    const simplified = simplifyDouglasPeucker(segment, toleranceM)
    for (const point of simplified) out.push(point)
  }
  return out
}
