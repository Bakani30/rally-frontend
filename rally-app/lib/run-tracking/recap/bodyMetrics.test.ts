import { describe, expect, it } from 'vitest'
import { buildBodyMetrics } from './bodyMetrics'

const NOW = new Date('2026-07-11T12:00:00Z')
const PROFILE = { birthDate: '1999-01-01', gender: 'male' as const, weightKg: 70, heightCm: 175 }
const mkSamples = (bpm: number, seconds: number) =>
  Array.from({ length: seconds / 10 + 1 }, (_, i) => ({ timestampMs: i * 10_000, bpm }))

describe('buildBodyMetrics', () => {
  it('full data → HR calories, zones, intensity, cadence, stride', () => {
    const vm = buildBodyMetrics({
      movingTimeSeconds: 1724, distanceMeters: 5210, paceSecondsPerKm: 331,
      steps: 4960, hrSamples: mkSamples(156, 1720), deviceCalories: null,
      profile: PROFILE, now: NOW,
    })
    expect(vm.caloriesKcal).toBeGreaterThan(250)
    expect(vm.avgBpm).toBe(156)
    expect(vm.zoneSeconds?.reduce((a, b) => a + b, 0)).toBeGreaterThan(1500)
    expect(vm.intensityLevel).toBeTruthy()
    expect(vm.cadenceSpm).toBe(Math.round(4960 / (1724 / 60)))
    expect(vm.strideMeters).toBeCloseTo(1.05, 2)
  })

  it('device calories win over formulas', () => {
    const vm = buildBodyMetrics({
      movingTimeSeconds: 1724, distanceMeters: 5210, paceSecondsPerKm: 331,
      steps: null, hrSamples: mkSamples(156, 600), deviceCalories: 399,
      profile: PROFILE, now: NOW,
    })
    expect(vm.caloriesKcal).toBe(399)
  })

  it('no HR → MET calories, no zones/intensity', () => {
    const vm = buildBodyMetrics({
      movingTimeSeconds: 1724, distanceMeters: 5210, paceSecondsPerKm: 331,
      steps: 4960, hrSamples: [], deviceCalories: null, profile: PROFILE, now: NOW,
    })
    expect(vm.caloriesKcal).toBeGreaterThan(0)
    expect(vm.zoneSeconds).toBeNull()
    expect(vm.intensityScore).toBeNull()
  })

  it('no weight → no calories (spec §4, matches #81)', () => {
    const vm = buildBodyMetrics({
      movingTimeSeconds: 1724, distanceMeters: 5210, paceSecondsPerKm: 331,
      steps: null, hrSamples: mkSamples(156, 600), deviceCalories: null,
      profile: { ...PROFILE, weightKg: null }, now: NOW,
    })
    expect(vm.caloriesKcal).toBeNull()
  })

  it('all-zero zone data (identical timestamps) → zones/intensity absent, bpm kept', () => {
    const vm = buildBodyMetrics({
      movingTimeSeconds: 1724, distanceMeters: 5210, paceSecondsPerKm: 331,
      steps: null, hrSamples: [
        { timestampMs: 0, bpm: 150 },
        { timestampMs: 0, bpm: 150 },
        { timestampMs: 0, bpm: 150 },
      ], deviceCalories: null,
      profile: PROFILE, now: NOW,
    })
    expect(vm.avgBpm).toBe(150)
    expect(vm.zoneSeconds).toBeNull()
    expect(vm.dominantZoneIndex).toBeNull()
    expect(vm.intensityScore).toBeNull()
    expect(vm.intensityLevel).toBeNull()
  })

  it('no birthDate → raw bpm only, no zones/intensity', () => {
    const vm = buildBodyMetrics({
      movingTimeSeconds: 1724, distanceMeters: 5210, paceSecondsPerKm: 331,
      steps: null, hrSamples: mkSamples(156, 600), deviceCalories: null,
      profile: { ...PROFILE, birthDate: null }, now: NOW,
    })
    expect(vm.avgBpm).toBe(156)
    expect(vm.zoneSeconds).toBeNull()
    expect(vm.intensityLevel).toBeNull()
  })
})
