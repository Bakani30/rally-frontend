import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import {
  fetchCoachActivityInsights,
  saveCoachActivityContext,
  syncBasketballCoachSensors,
} from './coachRepository'

vi.mock('@/lib/supabase/invokeFunction', () => ({ invokeAuthenticatedFunction: vi.fn() }))
vi.mock('@/lib/supabase/edgeError', () => ({ extractEdgeFunctionError: vi.fn() }))

describe('coachRepository', () => {
  beforeEach(() => vi.mocked(invokeAuthenticatedFunction).mockReset())

  it('routes coach reads, context updates, and sensor sync through one endpoint', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({ data: {}, error: null } as never)
    const activitySessionId = 'activity-1'
    const context = {
      activitySessionId,
      role: 'handler' as const,
      resultTags: [],
      detailTags: [],
      focusTag: null,
      rpe: 7,
      basketballStats: { points: 10 },
    }
    const sensors = {
      activitySessionId,
      playStartedAt: '2026-08-01T01:00:00.000Z',
      playEndedAt: '2026-08-01T01:30:00.000Z',
      source: 'healthkit' as const,
      steps: 1000,
      activeCalories: 200,
      avgHeartRate: 140,
      maxHeartRate: 170,
      restingHeartRate: 60,
      heartRateCoverageSeconds: 1200,
      cadenceHighSeconds: 300,
      cadenceMax: 160,
    }

    await fetchCoachActivityInsights(activitySessionId)
    await saveCoachActivityContext(context)
    await syncBasketballCoachSensors(sensors)

    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(
      1,
      'get-coach-activity-insights',
      { body: { activitySessionId } },
    )
    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(
      2,
      'get-coach-activity-insights',
      { body: { action: 'update-context', input: context } },
    )
    expect(invokeAuthenticatedFunction).toHaveBeenNthCalledWith(
      3,
      'get-coach-activity-insights',
      { body: { action: 'sync-sensors', input: sensors } },
    )
  })
})
