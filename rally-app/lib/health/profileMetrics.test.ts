import { describe, expect, it } from 'vitest'
import {
  ageFromBirthDate, tanakaMaxHr, hrZoneIndex, hrZoneSeconds,
  intensityScore, intensityLevel, keytelCaloriesKcal, metCaloriesKcal, strideMeters,
} from './profileMetrics'

const NOW = new Date('2026-07-11T12:00:00Z')

describe('ageFromBirthDate', () => {
  it('computes full years', () => {
    expect(ageFromBirthDate('1999-07-01', NOW)).toBe(27)
    expect(ageFromBirthDate('1999-08-01', NOW)).toBe(26) // birthday not reached
  })
  it('returns null for missing/invalid', () => {
    expect(ageFromBirthDate(null, NOW)).toBeNull()
    expect(ageFromBirthDate('not-a-date', NOW)).toBeNull()
  })
})

describe('tanakaMaxHr', () => {
  it('208 - 0.7*age', () => expect(tanakaMaxHr(27)).toBeCloseTo(189.1, 1))
})

describe('hr zones', () => {
  const maxHr = 190
  it('zone boundaries at 60/70/80/90 %max', () => {
    expect(hrZoneIndex(0.59 * maxHr, maxHr)).toBe(0)
    expect(hrZoneIndex(0.60 * maxHr, maxHr)).toBe(1)
    expect(hrZoneIndex(0.70 * maxHr, maxHr)).toBe(2)
    expect(hrZoneIndex(0.80 * maxHr, maxHr)).toBe(3)
    expect(hrZoneIndex(0.90 * maxHr, maxHr)).toBe(4)
  })
  it('accumulates seconds per zone from sample gaps (caps gap at 30s)', () => {
    const samples = [
      { timestampMs: 0, bpm: 0.65 * maxHr },        // Z2 for 10s
      { timestampMs: 10_000, bpm: 0.75 * maxHr },   // Z3 for 10s
      { timestampMs: 20_000, bpm: 0.75 * maxHr },   // Z3 tail sample
    ]
    expect(hrZoneSeconds(samples, maxHr)).toEqual([0, 10, 10, 0, 0])
  })
  it('empty input → all zeros', () => {
    expect(hrZoneSeconds([], maxHr)).toEqual([0, 0, 0, 0, 0])
  })
})

describe('intensity', () => {
  it('all Z5 → 100, all Z1 → 20', () => {
    expect(intensityScore([0, 0, 0, 0, 600])).toBe(100)
    expect(intensityScore([600, 0, 0, 0, 0])).toBe(20)
  })
  it('zero time → 0', () => expect(intensityScore([0, 0, 0, 0, 0])).toBe(0))
  it('levels per spec', () => {
    expect(intensityLevel(20)).toBe('เบา')
    expect(intensityLevel(40)).toBe('กำลังดี')
    expect(intensityLevel(71)).toBe('หนักกำลังดี')
    expect(intensityLevel(90)).toBe('หนักมาก')
  })
})

describe('calories', () => {
  it('keytel male 30m/156bpm/70kg/27y is in a sane band', () => {
    const kcal = keytelCaloriesKcal({ sex: 'male', ageYears: 27, weightKg: 70, avgBpm: 156, durationMinutes: 30 })
    expect(kcal).toBeGreaterThan(250)
    expect(kcal).toBeLessThan(550)
  })
  it('female formula differs from male', () => {
    const m = keytelCaloriesKcal({ sex: 'male', ageYears: 27, weightKg: 60, avgBpm: 150, durationMinutes: 30 })
    const f = keytelCaloriesKcal({ sex: 'female', ageYears: 27, weightKg: 60, avgBpm: 150, durationMinutes: 30 })
    expect(f).not.toBe(m)
  })
  it('unspecified sex uses the male/female average', () => {
    const m = keytelCaloriesKcal({ sex: 'male', ageYears: 27, weightKg: 60, avgBpm: 150, durationMinutes: 30 })
    const f = keytelCaloriesKcal({ sex: 'female', ageYears: 27, weightKg: 60, avgBpm: 150, durationMinutes: 30 })
    const o = keytelCaloriesKcal({ sex: 'prefer_not_to_say', ageYears: 27, weightKg: 60, avgBpm: 150, durationMinutes: 30 })
    expect(Math.abs(o - Math.round((m + f) / 2))).toBeLessThanOrEqual(1)
  })
  it('never negative', () => {
    expect(keytelCaloriesKcal({ sex: 'female', ageYears: 13, weightKg: 30, avgBpm: 70, durationMinutes: 5 })).toBeGreaterThanOrEqual(0)
  })
  it('MET fallback scales with weight and time', () => {
    const a = metCaloriesKcal({ paceSecondsPerKm: 330, weightKg: 70, movingHours: 0.5 })
    expect(a).toBeGreaterThan(200)
    expect(metCaloriesKcal({ paceSecondsPerKm: 330, weightKg: 70, movingHours: 1 })).toBeGreaterThan(a)
  })
  it('MET resolves to the same nearest server band', () => {
    // pace 330 s/km → 6.78 mph → nearest server band 6.7 mph = 10.5 MET
    expect(metCaloriesKcal({ paceSecondsPerKm: 330, weightKg: 70, movingHours: 1 })).toBe(Math.round(10.5 * 70))
    // fast run: pace 200 s/km → 11.18 mph → nearest server band 11.0 mph = 16.8 MET
    expect(metCaloriesKcal({ paceSecondsPerKm: 200, weightKg: 70, movingHours: 1 })).toBe(Math.round(16.8 * 70))
  })
})

describe('strideMeters', () => {
  it('distance / steps', () => expect(strideMeters(5210, 4960)).toBeCloseTo(1.05, 2))
  it('null when steps missing or zero', () => {
    expect(strideMeters(5210, null)).toBeNull()
    expect(strideMeters(5210, 0)).toBeNull()
  })
})
