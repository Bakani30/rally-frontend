import { describe, expect, it } from 'vitest'

import { getRunRecapProfileGate } from './runRecapGate'

describe('getRunRecapProfileGate', () => {
  it('keeps coach recap available while listing private fields that improve it', () => {
    const gate = getRunRecapProfileGate(null)

    expect(gate.status).toBe('ready')
    expect(gate.completedCount).toBe(0)
    expect(gate.requiredCount).toBe(4)
    expect(gate.missingFields.map((field) => field.id)).toEqual([
      'runningLevel',
      'primaryGoal',
      'competitionCategory',
      'birthYear',
    ])
  })

  it('treats skip and prefer-not answers as missing for recap quality', () => {
    const gate = getRunRecapProfileGate({
      runningLevel: 'prefer_not_to_say',
      primaryGoal: 'prefer_not_to_say',
      preferredUnits: 'metric',
      competitionCategory: 'prefer_not_to_say',
      birthYear: null,
    })

    expect(gate.status).toBe('ready')
    expect(gate.completedCount).toBe(0)
    expect(gate.missingFields).toHaveLength(4)
  })

  it('unlocks coach recap when useful running context is present', () => {
    const gate = getRunRecapProfileGate({
      runningLevel: 'casual',
      primaryGoal: 'faster_5k',
      preferredUnits: 'metric',
      competitionCategory: 'open',
      birthYear: 1994,
    })

    expect(gate.status).toBe('ready')
    expect(gate.completedCount).toBe(4)
    expect(gate.missingFields).toEqual([])
  })
})
