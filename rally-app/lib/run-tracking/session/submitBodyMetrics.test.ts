import { describe, expect, it, vi } from 'vitest'
import { buildSubmitBodyMetrics } from './submitBodyMetrics'
import type { AnalysisProfile } from '@/lib/profile/analysisProfileTypes'
import type { HrSample } from '@/lib/health/profileMetrics'

const START = new Date('2026-07-12T10:00:00.000Z')
const END = new Date('2026-07-12T10:30:00.000Z')
const NOW = () => new Date('2026-07-12T10:31:00.000Z')

const PROFILE: AnalysisProfile = {
  userId: 'user-1',
  birthYear: 1996,
  birthDate: '1996-03-15',
  competitionCategory: 'men',
  heightCm: 175,
  weightKg: 70,
  runningLevel: 'casual',
  primaryGoal: 'faster_5k',
  preferredUnits: 'metric',
  createdAt: null,
  updatedAt: null,
}

// 10 minutes of 150bpm samples every 30s → age 30, maxHr 187, 150/187 ≈ 0.80
// lands zone index 3 (0.8..0.9). Two-sample gaps cap at 30s each.
function hrSamplesAt(bpm: number, count = 21): HrSample[] {
  return Array.from({ length: count }, (_, i) => ({
    timestampMs: START.getTime() + i * 30_000,
    bpm,
  }))
}

function baseParams() {
  return {
    startedAt: START,
    endedAt: END,
    distanceMeters: 5000,
    pausedDurationSeconds: 120,
    fallbackSteps: 4800,
    deviceCalories: null,
  }
}

describe('buildSubmitBodyMetrics', () => {
  it('computes a submit payload from device samples + profile', async () => {
    const result = await buildSubmitBodyMetrics(baseParams(), {
      readBodySamples: vi.fn().mockResolvedValue({ hrSamples: hrSamplesAt(150), steps: 5000 }),
      getProfile: vi.fn().mockResolvedValue(PROFILE),
      now: NOW,
    })

    expect(result).toBeDefined()
    expect(result?.avgHeartRate).toBe(150)
    expect(result?.maxHeartRate).toBe(150)
    // 20 gaps × 30s all in zone 4 (index 3): 150 / (208 - 0.7*30) ≈ 0.80
    expect(result?.zoneSeconds).toEqual([0, 0, 0, 600, 0])
    // all-in-one-zone weighted score: zone index 3 → (4/5)*100 = 80
    expect(result?.intensityScore).toBe(80)
    // moving = 1800 - 120 = 1680s → 28min; device steps win over fallback:
    // 5000 / 28 ≈ 179 spm
    expect(result?.cadenceSpm).toBe(179)
  })

  it('passes the run window to the device reader', async () => {
    const readBodySamples = vi.fn().mockResolvedValue({ hrSamples: [], steps: null })
    await buildSubmitBodyMetrics(baseParams(), {
      readBodySamples,
      getProfile: vi.fn().mockResolvedValue(PROFILE),
      now: NOW,
    })
    expect(readBodySamples).toHaveBeenCalledWith({ start: START, end: END })
  })

  it('falls back to session steps when the device read has none', async () => {
    const result = await buildSubmitBodyMetrics(baseParams(), {
      readBodySamples: vi.fn().mockResolvedValue({ hrSamples: hrSamplesAt(150), steps: null }),
      getProfile: vi.fn().mockResolvedValue(PROFILE),
      now: NOW,
    })
    // 4800 fallback steps / 28min ≈ 171 spm
    expect(result?.cadenceSpm).toBe(171)
  })

  it('returns undefined when there is no HR data (mapper drops it)', async () => {
    const result = await buildSubmitBodyMetrics(baseParams(), {
      readBodySamples: vi.fn().mockResolvedValue({ hrSamples: [], steps: 5000 }),
      getProfile: vi.fn().mockResolvedValue(PROFILE),
      now: NOW,
    })
    expect(result).toBeUndefined()
  })

  it('returns undefined when the device read throws', async () => {
    const result = await buildSubmitBodyMetrics(baseParams(), {
      readBodySamples: vi.fn().mockRejectedValue(new Error('healthkit unavailable')),
      getProfile: vi.fn().mockResolvedValue(PROFILE),
      now: NOW,
    })
    expect(result).toBeUndefined()
  })

  it('returns undefined when the profile fetch throws', async () => {
    const result = await buildSubmitBodyMetrics(baseParams(), {
      readBodySamples: vi.fn().mockResolvedValue({ hrSamples: hrSamplesAt(150), steps: 5000 }),
      getProfile: vi.fn().mockRejectedValue(new Error('network down')),
      now: NOW,
    })
    expect(result).toBeUndefined()
  })

  it('returns undefined when the device read exceeds the timeout cap', async () => {
    const neverResolves = new Promise<never>(() => {})
    const result = await buildSubmitBodyMetrics(baseParams(), {
      readBodySamples: vi.fn().mockReturnValue(neverResolves),
      getProfile: vi.fn().mockResolvedValue(PROFILE),
      now: NOW,
      computeTimeoutMs: 20,
    })
    expect(result).toBeUndefined()
  })

  it('returns undefined when the profile fetch exceeds the timeout cap', async () => {
    const neverResolves = new Promise<never>(() => {})
    const result = await buildSubmitBodyMetrics(baseParams(), {
      readBodySamples: vi.fn().mockResolvedValue({ hrSamples: hrSamplesAt(150), steps: 5000 }),
      getProfile: vi.fn().mockReturnValue(neverResolves),
      now: NOW,
      computeTimeoutMs: 20,
    })
    expect(result).toBeUndefined()
  })
})
