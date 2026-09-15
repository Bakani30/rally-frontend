import type { ScoreLogPeriod, Side } from '@/types/match'

// A referee marks quarter boundaries during a live basketball game. Per-player
// points are cumulative for the whole game, so a "boundary" snapshots the
// cumulative side totals AND the elapsed game time at the moment the referee
// ended that quarter. Per-quarter points and duration are the deltas between
// consecutive boundaries; the current (in-progress) quarter runs from the last
// boundary to the live totals / live clock.
export type QuarterBoundary = { side0: number; side1: number; elapsedMs: number }

export type QuarterLine = {
  period: number
  label: string
  side0: number
  side1: number
  durationMs: number
  isCurrent: boolean
}

function clampDelta(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
}

// Build the per-quarter breakdown for display, always including the live
// in-progress quarter as the last (current) row. `currentElapsedMs` is the live
// elapsed game time so the current quarter's duration ticks.
export function buildQuarterLines(
  boundaries: QuarterBoundary[],
  current: Record<Side, number>,
  currentElapsedMs: number,
): QuarterLine[] {
  const lines: QuarterLine[] = []
  let prevSide0 = 0
  let prevSide1 = 0
  let prevElapsed = 0

  boundaries.forEach((boundary, index) => {
    lines.push({
      period: index + 1,
      label: `Q${index + 1}`,
      side0: clampDelta(boundary.side0 - prevSide0),
      side1: clampDelta(boundary.side1 - prevSide1),
      durationMs: clampDelta(boundary.elapsedMs - prevElapsed),
      isCurrent: false,
    })
    prevSide0 = boundary.side0
    prevSide1 = boundary.side1
    prevElapsed = boundary.elapsedMs
  })

  lines.push({
    period: boundaries.length + 1,
    label: `Q${boundaries.length + 1}`,
    side0: clampDelta((current[0] ?? 0) - prevSide0),
    side1: clampDelta((current[1] ?? 0) - prevSide1),
    durationMs: clampDelta(currentElapsedMs - prevElapsed),
    isCurrent: true,
  })

  return lines
}

// The score_log persisted on submit closes the current quarter into the period
// list (points only) so the recap can render the per-quarter breakdown.
export function buildScoreLogFromQuarters(
  boundaries: QuarterBoundary[],
  current: Record<Side, number>,
): ScoreLogPeriod[] {
  return buildQuarterLines(boundaries, current, 0).map((line) => ({
    period: line.period,
    side_0: line.side0,
    side_1: line.side1,
    label: line.label,
  }))
}

// Server rows arrive as untyped jsonb — clamp every field and drop anything
// that isn't an object so a malformed draft can never crash the live sheet.
export function normalizeQuarterBoundaries(input: unknown): QuarterBoundary[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .slice(0, 19)
    .map((item) => ({
      side0: clampDelta(Number(item.side0)),
      side1: clampDelta(Number(item.side1)),
      elapsedMs: clampDelta(Number(item.elapsedMs)),
    }))
}

// Snapshot the live cumulative totals + elapsed game time as the boundary for
// the quarter the referee just ended.
export function quarterBoundaryFromScores(
  scores: Record<Side, number>,
  elapsedMs: number,
): QuarterBoundary {
  return {
    side0: clampDelta(scores[0] ?? 0),
    side1: clampDelta(scores[1] ?? 0),
    elapsedMs: clampDelta(elapsedMs),
  }
}

export function formatQuarterDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
