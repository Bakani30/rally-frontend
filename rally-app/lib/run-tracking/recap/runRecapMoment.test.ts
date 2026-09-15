import { describe, expect, it } from 'vitest'
import { buildSoloRunRecapMoment, type RunRecapInput, type RunPrSample } from './runRecapMoment'

function base(overrides: Partial<RunRecapInput> = {}): RunRecapInput {
  return {
    distanceMeters: 5000,
    movingTimeSeconds: 1800,
    paceSecondsPerKm: 360,
    pointDelta: 0,
    splits: [],
    priorRuns: [],
    ...overrides,
  }
}

const prior = (s: Partial<RunPrSample>): RunPrSample => ({
  distanceMeters: null,
  movingTimeSeconds: null,
  paceSecondsPerKm: null,
  ...s,
})

describe('buildSoloRunRecapMoment tone', () => {
  it('first run ever with points → reward, not record', () => {
    const vm = buildSoloRunRecapMoment(base({ pointDelta: 50, priorRuns: [] }))
    expect(vm.tone).toBe('reward')
    expect(vm.prs).toEqual([])
  })

  it('first run ever with no points → logged', () => {
    const vm = buildSoloRunRecapMoment(base({ pointDelta: 0, priorRuns: [] }))
    expect(vm.tone).toBe('logged')
  })

  it('farther than every prior → record with distance pr', () => {
    const vm = buildSoloRunRecapMoment(base({
      distanceMeters: 8000,
      priorRuns: [prior({ distanceMeters: 5000 }), prior({ distanceMeters: 6000 })],
    }))
    expect(vm.tone).toBe('record')
    expect(vm.prs).toContain('distance')
  })

  it('faster but under 1km → no pace pr', () => {
    const vm = buildSoloRunRecapMoment(base({
      distanceMeters: 800,
      paceSecondsPerKm: 200,
      priorRuns: [prior({ distanceMeters: 5000, paceSecondsPerKm: 360 })],
    }))
    expect(vm.prs).not.toContain('pace')
  })

  it('faster pace over 1km vs comparable prior → record with pace pr', () => {
    const vm = buildSoloRunRecapMoment(base({
      distanceMeters: 5000,
      paceSecondsPerKm: 300,
      priorRuns: [prior({ distanceMeters: 5000, paceSecondsPerKm: 360 })],
    }))
    expect(vm.tone).toBe('record')
    expect(vm.prs).toContain('pace')
  })

  it('points but no pr → reward', () => {
    const vm = buildSoloRunRecapMoment(base({
      pointDelta: 70,
      distanceMeters: 5000,
      priorRuns: [prior({ distanceMeters: 9000, movingTimeSeconds: 4000, paceSecondsPerKm: 300 })],
    }))
    expect(vm.tone).toBe('reward')
  })

  it('no points no pr → logged', () => {
    const vm = buildSoloRunRecapMoment(base({
      pointDelta: 0,
      distanceMeters: 5000,
      priorRuns: [prior({ distanceMeters: 9000, movingTimeSeconds: 4000, paceSecondsPerKm: 300 })],
    }))
    expect(vm.tone).toBe('logged')
  })

  it('distance and duration pr together', () => {
    const vm = buildSoloRunRecapMoment(base({
      distanceMeters: 9000,
      movingTimeSeconds: 5000,
      priorRuns: [prior({ distanceMeters: 5000, movingTimeSeconds: 1800 })],
    }))
    expect(vm.prs).toEqual(expect.arrayContaining(['distance', 'duration']))
    expect(vm.tone).toBe('record')
  })

  it('null distance does not crash and yields no distance pr', () => {
    const vm = buildSoloRunRecapMoment(base({
      distanceMeters: null,
      priorRuns: [prior({ distanceMeters: 5000 })],
    }))
    expect(vm.prs).not.toContain('distance')
    expect(vm.distanceMeters).toBeNull()
  })
})

describe('buildSoloRunRecapMoment sparkline', () => {
  it('fewer than 2 splits → empty sparkline', () => {
    const vm = buildSoloRunRecapMoment(base({ splits: [{ km: 1, timeSeconds: 360, paceSecondsPerKm: 360 }] }))
    expect(vm.splitPaces).toEqual([])
    expect(vm.fastestSplitIndex).toBeNull()
  })

  it('highlights the fastest (lowest pace) split index', () => {
    const vm = buildSoloRunRecapMoment(base({
      splits: [
        { km: 1, timeSeconds: 360, paceSecondsPerKm: 360 },
        { km: 2, timeSeconds: 300, paceSecondsPerKm: 300 },
        { km: 3, timeSeconds: 330, paceSecondsPerKm: 330 },
      ],
    }))
    expect(vm.splitPaces).toEqual([360, 300, 330])
    expect(vm.fastestSplitIndex).toBe(1)
  })
})
