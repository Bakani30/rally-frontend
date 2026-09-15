import { describe, expect, it } from 'vitest'
import { degradedWalkerSampleAt, parseMockScenario } from './mockRunScenario'

describe('parseMockScenario', () => {
  it('accepts degraded_walker (case/space tolerant)', () => {
    expect(parseMockScenario('degraded_walker')).toBe('degraded_walker')
    expect(parseMockScenario(' Degraded_Walker ')).toBe('degraded_walker')
  })

  it('returns null for anything else', () => {
    expect(parseMockScenario(undefined)).toBeNull()
    expect(parseMockScenario(null)).toBeNull()
    expect(parseMockScenario('')).toBeNull()
    expect(parseMockScenario('clean')).toBeNull()
  })
})

describe('degradedWalkerSampleAt', () => {
  it('advances distance at walk pace during the opening clear phase', () => {
    const at10s = degradedWalkerSampleAt(10_000)
    const at30s = degradedWalkerSampleAt(30_000)
    expect(at10s.movedMeters).toBeCloseTo(12, 5)
    expect(at30s.movedMeters).toBeCloseTo(36, 5)
    expect(at10s.accuracyM).toBeGreaterThanOrEqual(15)
    expect(at10s.accuracyM).toBeLessThanOrEqual(22)
  })

  it('freezes distance during the standstill phase (60s–80s)', () => {
    const start = degradedWalkerSampleAt(60_000)
    const end = degradedWalkerSampleAt(79_000)
    expect(end.movedMeters).toBeCloseTo(start.movedMeters, 5)
  })

  it('reports 26–34m accuracy in the building-shadow phase (80s–120s)', () => {
    for (const sec of [81, 95, 110, 119]) {
      const s = degradedWalkerSampleAt(sec * 1_000)
      expect(s.accuracyM).toBeGreaterThanOrEqual(26)
      expect(s.accuracyM).toBeLessThanOrEqual(34)
    }
  })

  it('never reports an OS speed (distance-filtered fixes omit it)', () => {
    for (const sec of [5, 70, 100, 150]) {
      expect(degradedWalkerSampleAt(sec * 1_000).speedMps).toBeNull()
    }
  })

  it('loops: distance keeps growing across cycle boundaries', () => {
    // One cycle = 200s, 216m. Two cycles in should be exactly double.
    const oneCycle = degradedWalkerSampleAt(200_000)
    const twoCycles = degradedWalkerSampleAt(400_000)
    expect(oneCycle.movedMeters).toBeCloseTo(216, 5)
    expect(twoCycles.movedMeters).toBeCloseTo(432, 5)
  })
})
