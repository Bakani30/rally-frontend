import { beforeEach, describe, expect, it, vi } from 'vitest'

import { syncDailyMission } from './dailyMissionRepository'
import { DAILY_HEALTH_SOURCES } from '@/lib/health/dailyHealthTypes'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'

vi.mock('@/lib/supabase/invokeFunction', () => ({
  invokeAuthenticatedFunction: vi.fn(),
}))

vi.mock('@/lib/supabase/edgeError', () => ({
  extractEdgeFunctionError: vi.fn(async (error: unknown) => error instanceof Error ? error : new Error('edge failed')),
}))

describe('syncDailyMission', () => {
  beforeEach(() => {
    vi.mocked(invokeAuthenticatedFunction).mockReset()
  })

  it('keeps the mobile source contract aligned with sync-daily-mission', () => {
    expect(DAILY_HEALTH_SOURCES).toEqual([
      'healthkit',
      'health_connect',
      'pedometer',
      'device_motion',
    ])
  })

  it('sends only the public daily mission claim metrics to the edge function', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      data: {
        missionDate: '2026-05-19',
        eligible: true,
        alreadyClaimed: false,
        rewardGranted: true,
        pointsAwarded: 50,
        balanceAfter: 1050,
      },
      error: null,
    })

    await syncDailyMission({
      missionDate: '2026-05-19',
      distanceMeters: 7200,
      steps: 9200,
      calories: 455,
      avgHeartRate: 142,
      source: 'healthkit',
    })

    expect(invokeAuthenticatedFunction).toHaveBeenCalledWith('sync-daily-mission', {
      body: {
        missionDate: '2026-05-19',
        distanceMeters: 7200,
        steps: 9200,
        source: 'healthkit',
      },
    })
    expect(JSON.stringify(vi.mocked(invokeAuthenticatedFunction).mock.calls[0])).not.toMatch(/calories|avgHeartRate/)
  })
})
