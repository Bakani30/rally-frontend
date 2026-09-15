import { describe, expect, it } from 'vitest'

import type { GetCoachActivityInsightsResult } from '@/lib/coach/coachTypes'
import { buildStatHexagon } from './basketballStatHexagon'

function insights(over: Partial<GetCoachActivityInsightsResult> = {}): GetCoachActivityInsightsResult {
  return {
    entitlement: { hasPro: true, source: 'pro_subscription' },
    sportPack: 'basketball',
    previewCards: [],
    cards: [],
    lockedCardCount: 0,
    missingInputs: [],
    currentContext: {
      role: 'handler',
      resultTags: [],
      focusTag: null,
      rpe: 8,
      basketballStats: { points: 14, assists: 3, rebounds: 6, steals: 1, blocks: 1, threePointersMade: 1 },
    },
    statBaseline: {
      sampleSize: 12,
      minimumSample: 3,
      scope: 'role',
      averages: { points: 10, assists: 3, rebounds: 6, steals: 1, blocks: 1, threePointersMade: 2 },
      previousStatline: null,
      matchesNeeded: 0,
    },
    reportSignals: [],
    sensorState: { status: 'available' },
    analyticsMemory: {} as GetCoachActivityInsightsResult['analyticsMemory'],
    ...over,
  }
}

describe('buildStatHexagon', () => {
  it('maps 6 RPG axes in order with stat sub-labels', () => {
    const hex = buildStatHexagon(insights(), '5v5')
    expect(hex.axes.map((a) => a.key)).toEqual(['power', 'vision', 'grit', 'guard', 'range', 'motor'])
    expect(hex.axes[0]).toMatchObject({ rpgLabel: 'POWER', statLabel: 'PTS', value: 14 })
    expect(hex.axes[3]).toMatchObject({ key: 'guard', statLabel: 'STL+BLK', value: 2 })
  })

  it('scores this-match vs your-average and signs the delta', () => {
    const power = buildStatHexagon(insights(), '5v5').axes[0]
    expect(power.value).toBe(14)
    expect(power.delta).toBe(4) // 14 - avg 10
    expect(power.score).toBeGreaterThan(power.comparisonScore as number)
  })

  it('motor uses rpe, has no comparison', () => {
    const motor = buildStatHexagon(insights(), '5v5').axes[5]
    expect(motor).toMatchObject({ key: 'motor', statLabel: 'EFFORT', value: 8, comparisonScore: null, delta: null, state: 'ready' })
  })

  it('marks missing rpe motor as missing', () => {
    const motor = buildStatHexagon(insights({
      currentContext: { role: 'handler', resultTags: [], focusTag: null, rpe: null, basketballStats: { points: 14 } },
    }), '5v5').axes[5]
    expect(motor.state).toBe('missing')
    expect(motor.value).toBeNull()
  })

  it('picks strongest and weakest vs average (motor excluded)', () => {
    const hex = buildStatHexagon(insights(), '5v5')
    expect(hex.strongest).toBe('power') // +4 over avg
    expect(hex.weakest).toBe('range')   // 1 vs avg 2
  })

  it('uses twoPointersMade for RANGE in 3x3', () => {
    const hex = buildStatHexagon(insights({
      currentContext: { role: 'handler', resultTags: [], focusTag: null, rpe: 8, basketballStats: { points: 14, twoPointersMade: 5 } },
    }), '3x3')
    expect(hex.axes[4]).toMatchObject({ key: 'range', statLabel: '2PT', value: 5 })
  })

  it('compares against opponent stats when comparison is opponent', () => {
    const hex = buildStatHexagon(insights(), '5v5', 'opponent', { points: 20, assists: 1 })
    expect(hex.axes[0]).toMatchObject({ key: 'power', value: 14, delta: -6 }) // 14 - opp 20
    expect(hex.axes[1]).toMatchObject({ key: 'vision', value: 3, delta: 2 }) // 3 - opp 1
  })

  it('has no opponent reference when opponent stats are missing', () => {
    const power = buildStatHexagon(insights(), '5v5', 'opponent', null).axes[0]
    expect(power.delta).toBeNull()
    expect(power.comparisonScore).toBeNull()
  })
})
