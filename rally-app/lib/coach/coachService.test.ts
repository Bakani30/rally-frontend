import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/edgeError', () => ({
  extractEdgeFunctionError: vi.fn(async (err: unknown) => (err instanceof Error ? err : new Error('edge'))),
}))
vi.mock('@/lib/supabase/invokeFunction', () => ({
  invokeAuthenticatedFunction: vi.fn(),
}))

import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import { CoachActivityValidationError, saveContext, syncSensors } from './coachService'

const invokeMock = invokeAuthenticatedFunction as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  invokeMock.mockReset()
  invokeMock.mockResolvedValue({
    data: { activitySessionId: 's1', saved: true, regenerated: true, intensityScore: null },
    error: null,
  })
})

describe('saveContext validation', () => {
  it('rejects an empty context payload', async () => {
    await expect(
      saveContext({
        activitySessionId: 's1',
        role: null,
        resultTags: [],
        detailTags: [],
        focusTag: null,
        rpe: null,
        basketballStats: {},
      }),
    ).rejects.toBeInstanceOf(CoachActivityValidationError)
  })

  it('rejects out-of-range RPE', async () => {
    await expect(
      saveContext({
        activitySessionId: 's1',
        role: null,
        resultTags: [],
        detailTags: [],
        focusTag: null,
        rpe: 11,
        basketballStats: {},
      }),
    ).rejects.toBeInstanceOf(CoachActivityValidationError)
  })

  it('rejects stat above MAX_STAT_VALUE', async () => {
    await expect(
      saveContext({
        activitySessionId: 's1',
        role: null,
        resultTags: [],
        detailTags: [],
        focusTag: null,
        rpe: null,
        basketballStats: { points: 250 },
      }),
    ).rejects.toBeInstanceOf(CoachActivityValidationError)
  })

  it('accepts a valid payload', async () => {
    const result = await saveContext({
      activitySessionId: 's1',
      role: 'shooter',
      resultTags: ['shot_selection', 'clutch'],
      detailTags: ['screen'],
      focusTag: 'shooting',
      rpe: 7,
      basketballStats: { points: 18, assists: 4 },
    })
    expect(result.saved).toBe(true)
    expect(invokeMock).toHaveBeenCalledTimes(1)
  })

  it('strips unsupported tag and focus fields before sending context to the edge function', async () => {
    await saveContext({
      activitySessionId: 's1',
      role: 'handler',
      resultTags: ['turnovers', 'rebounds', 'defense', 'stamina'] as never,
      detailTags: ['screen', 'box_out', 'deflection', 'contest', 'screen'] as never,
      focusTag: 'ball_handling',
      rpe: 7,
      basketballStats: { points: 8, turnovers: 2 },
    })

    expect(invokeMock).toHaveBeenCalledWith(
      'get-coach-activity-insights',
      expect.objectContaining({
        body: expect.objectContaining({
          action: 'update-context',
          input: expect.objectContaining({
            resultTags: [],
            detailTags: [],
            focusTag: null,
            role: 'handler',
            rpe: 7,
            basketballStats: { points: 8 },
          }),
        }),
      }),
    )
  })
})

describe('syncSensors validation', () => {
  it('rejects inverted window', async () => {
    await expect(
      syncSensors({
        activitySessionId: 's1',
        playStartedAt: '2026-05-20T12:00:00Z',
        playEndedAt: '2026-05-20T11:00:00Z',
        source: 'healthkit',
        steps: null,
        activeCalories: null,
        avgHeartRate: null,
        maxHeartRate: null,
        restingHeartRate: null,
        heartRateCoverageSeconds: null,
        cadenceHighSeconds: null,
        cadenceMax: null,
      }),
    ).rejects.toBeInstanceOf(CoachActivityValidationError)
  })

  it('rejects window shorter than 5 minutes', async () => {
    await expect(
      syncSensors({
        activitySessionId: 's1',
        playStartedAt: '2026-05-20T12:00:00Z',
        playEndedAt: '2026-05-20T12:03:00Z',
        source: 'healthkit',
        steps: null,
        activeCalories: null,
        avgHeartRate: null,
        maxHeartRate: null,
        restingHeartRate: null,
        heartRateCoverageSeconds: null,
        cadenceHighSeconds: null,
        cadenceMax: null,
      }),
    ).rejects.toBeInstanceOf(CoachActivityValidationError)
  })

  it('rejects window longer than 4 hours', async () => {
    await expect(
      syncSensors({
        activitySessionId: 's1',
        playStartedAt: '2026-05-20T12:00:00Z',
        playEndedAt: '2026-05-20T16:30:00Z',
        source: 'healthkit',
        steps: null,
        activeCalories: null,
        avgHeartRate: null,
        maxHeartRate: null,
        restingHeartRate: null,
        heartRateCoverageSeconds: null,
        cadenceHighSeconds: null,
        cadenceMax: null,
      }),
    ).rejects.toBeInstanceOf(CoachActivityValidationError)
  })

  it('accepts a valid window', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { activitySessionId: 's1', saved: true, regenerated: true, intensityScore: 78 },
      error: null,
    })
    const r = await syncSensors({
      activitySessionId: 's1',
      playStartedAt: '2026-05-20T12:00:00Z',
      playEndedAt: '2026-05-20T13:00:00Z',
      source: 'healthkit',
      steps: 1200,
      activeCalories: 280,
      avgHeartRate: 150,
      maxHeartRate: 180,
      restingHeartRate: 60,
      heartRateCoverageSeconds: 3600,
      cadenceHighSeconds: 1800,
      cadenceMax: 140,
    })
    expect(r.intensityScore).toBe(78)
  })
})
