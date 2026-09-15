import { describe, expect, it } from 'vitest'

import type { BasketballLiveStatLine } from './basketballLiveScoring'
import {
  addPoints,
  addThreePointer,
  BASKETBALL_STAT_SHEET_POINT_STEPS,
  clearStat,
  longRangePointValueForTeamSize,
  removePoints,
  removeThreePointer,
} from './basketballStatSheetControls'

describe('basketball stat sheet controls', () => {
  it('supports PTS +1 and +2 only', () => {
    expect(BASKETBALL_STAT_SHEET_POINT_STEPS).toEqual([1, 2])
    expect(BASKETBALL_STAT_SHEET_POINT_STEPS).not.toContain(3)
  })

  it('adds and removes PTS without changing 3PM', () => {
    const base = stat({ points: 4, threePointersMade: 1 })

    expect(addPoints(base, 2)).toMatchObject({
      points: 6,
      threePointersMade: 1,
    })
    expect(removePoints(base, 1)).toMatchObject({
      points: 3,
      threePointersMade: 1,
    })
  })

  it('does not remove PTS below the 3PM floor', () => {
    expect(removePoints(stat({ points: 6, threePointersMade: 2 }), 2)).toMatchObject({
      points: 6,
      threePointersMade: 2,
    })
  })

  it('adds and removes 3PM together with three points', () => {
    const withThree = addThreePointer(stat({ points: 2, threePointersMade: 0 }))

    expect(withThree).toMatchObject({
      points: 5,
      threePointersMade: 1,
    })
    expect(removeThreePointer(withThree)).toMatchObject({
      points: 2,
      threePointersMade: 0,
    })
  })

  it('clears 3PM by subtracting three points per made three', () => {
    expect(clearStat(stat({ points: 10, threePointersMade: 2 }), 'threePointersMade')).toMatchObject({
      points: 4,
      threePointersMade: 0,
    })
  })

  it('clears PTS and resets 3PM to keep the stat line valid', () => {
    expect(clearStat(stat({ points: 9, threePointersMade: 2 }), 'points')).toMatchObject({
      points: 0,
      threePointersMade: 0,
    })
  })

  it('treats half-court formats as a 2-point long-range shot, full-court as 3', () => {
    expect(longRangePointValueForTeamSize(1)).toBe(2)
    expect(longRangePointValueForTeamSize(2)).toBe(2)
    expect(longRangePointValueForTeamSize(3)).toBe(2)
    expect(longRangePointValueForTeamSize(5)).toBe(3)
  })

  it('adds and removes a long-range shot as two points in half-court formats', () => {
    const withTwo = addThreePointer(stat({ points: 1, threePointersMade: 0 }), 2)

    expect(withTwo).toMatchObject({
      points: 3,
      threePointersMade: 1,
    })
    expect(removeThreePointer(withTwo, 2)).toMatchObject({
      points: 1,
      threePointersMade: 0,
    })
  })

  it('keeps PTS at or above the 2-point long-range floor in half-court formats', () => {
    expect(removePoints(stat({ points: 4, threePointersMade: 2 }), 2, 2)).toMatchObject({
      points: 4,
      threePointersMade: 2,
    })
    expect(clearStat(stat({ points: 7, threePointersMade: 2 }), 'threePointersMade', 2)).toMatchObject({
      points: 3,
      threePointersMade: 0,
    })
  })
})

function stat(overrides: Partial<BasketballLiveStatLine> = {}): BasketballLiveStatLine {
  return {
    points: 0,
    rebounds: 0,
    assists: 0,
    blocks: 0,
    threePointersMade: 0,
    ...overrides,
  }
}
