import { describe, expect, it } from 'vitest'
import { mapBodyMetricsForSubmit } from './runBodyMetricsSubmitMapper'
import type { BodyMetricsViewModel } from '../recap/bodyMetrics'

function bodyMetrics(overrides: Partial<BodyMetricsViewModel> = {}): BodyMetricsViewModel {
  return {
    caloriesKcal: 320,
    avgBpm: 144.4,
    maxBpm: 171.6,
    zoneSeconds: [30, 60, 90, 45, 15],
    dominantZoneIndex: 2,
    intensityScore: 61.8,
    intensityLevel: 'หนักกำลังดี',
    cadenceSpm: 167.9,
    strideMeters: 1.1,
    ...overrides,
  }
}

describe('mapBodyMetricsForSubmit', () => {
  it('maps and rounds a fully populated view model', () => {
    expect(mapBodyMetricsForSubmit(bodyMetrics())).toEqual({
      avgHeartRate: 144,
      maxHeartRate: 172,
      zoneSeconds: [30, 60, 90, 45, 15],
      intensityScore: 62,
      cadenceSpm: 168,
    })
  })

  it('maps a null cadenceSpm through as null', () => {
    const mapped = mapBodyMetricsForSubmit(bodyMetrics({ cadenceSpm: null }))
    expect(mapped?.cadenceSpm).toBeNull()
  })

  it('returns undefined when body is null or undefined', () => {
    expect(mapBodyMetricsForSubmit(null)).toBeUndefined()
    expect(mapBodyMetricsForSubmit(undefined)).toBeUndefined()
  })

  it('returns undefined when HR data is missing (no zones/intensity)', () => {
    expect(mapBodyMetricsForSubmit(bodyMetrics({ avgBpm: null, maxBpm: null }))).toBeUndefined()
    expect(mapBodyMetricsForSubmit(bodyMetrics({ zoneSeconds: null }))).toBeUndefined()
    expect(mapBodyMetricsForSubmit(bodyMetrics({ intensityScore: null }))).toBeUndefined()
  })
})
