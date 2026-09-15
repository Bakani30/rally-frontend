import type { BasketballLiveStatLine } from './basketballLiveScoring'

export type BasketballStatKey = keyof BasketballLiveStatLine
export const BASKETBALL_STAT_SHEET_POINT_STEPS = [1, 2] as const

/**
 * Half-court basketball (1v1/2v2/3v3, FIBA 3x3 rules) scores a behind-the-arc
 * shot as 2 points; full-court 5v5 keeps the traditional 3-pointer.
 */
export function longRangePointValueForTeamSize(teamSize: number): 2 | 3 {
  return teamSize >= 5 ? 3 : 2
}

export function addPoints(stats: BasketballLiveStatLine, points: 1 | 2): BasketballLiveStatLine {
  return normalizeStatLine({
    ...stats,
    points: stats.points + points,
  })
}

export function removePoints(
  stats: BasketballLiveStatLine,
  points: 1 | 2,
  longRangePointValue = 3,
): BasketballLiveStatLine {
  return normalizeStatLine({
    ...stats,
    points: Math.max(stats.threePointersMade * longRangePointValue, stats.points - points),
  }, longRangePointValue)
}

export function addThreePointer(
  stats: BasketballLiveStatLine,
  longRangePointValue = 3,
): BasketballLiveStatLine {
  return normalizeStatLine({
    ...stats,
    points: stats.points + longRangePointValue,
    threePointersMade: stats.threePointersMade + 1,
  }, longRangePointValue)
}

export function removeThreePointer(
  stats: BasketballLiveStatLine,
  longRangePointValue = 3,
): BasketballLiveStatLine {
  if (stats.threePointersMade <= 0) return normalizeStatLine(stats, longRangePointValue)
  return normalizeStatLine({
    ...stats,
    points: Math.max(0, stats.points - longRangePointValue),
    threePointersMade: stats.threePointersMade - 1,
  }, longRangePointValue)
}

export function clearStat(
  stats: BasketballLiveStatLine,
  key: BasketballStatKey,
  longRangePointValue = 3,
): BasketballLiveStatLine {
  if (key === 'points') {
    return normalizeStatLine({
      ...stats,
      points: 0,
      threePointersMade: 0,
    }, longRangePointValue)
  }
  if (key === 'threePointersMade') {
    return normalizeStatLine({
      ...stats,
      points: Math.max(0, stats.points - stats.threePointersMade * longRangePointValue),
      threePointersMade: 0,
    }, longRangePointValue)
  }
  return normalizeStatLine({
    ...stats,
    [key]: 0,
  }, longRangePointValue)
}

export function normalizeStatLine(
  input: BasketballLiveStatLine,
  longRangePointValue = 3,
): BasketballLiveStatLine {
  const threePointersMade = clampStat(input.threePointersMade)
  return {
    points: Math.max(clampStat(input.points), threePointersMade * longRangePointValue),
    rebounds: clampStat(input.rebounds),
    assists: clampStat(input.assists),
    blocks: clampStat(input.blocks),
    threePointersMade,
  }
}

export function clampStat(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(199, Math.trunc(numeric)))
}
