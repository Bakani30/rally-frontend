import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/health/basketballCourtHealthSource', () => ({
  readDeviceBasketballCourtMetrics: vi.fn(),
}))

import { syncBasketballCourtModeFromMetrics } from './courtModeService'
import { claimBasketballCourtMode } from './courtModeRepository'
import type { BasketballCourtModeClaimResult } from './courtModeRepository'
import type { BasketballCourtModeMetrics } from './courtModeTypes'

vi.mock('./courtModeRepository', () => ({
  claimBasketballCourtMode: vi.fn(),
}))

const baseMetrics: BasketballCourtModeMetrics = {
  startedAt: '2026-05-18T10:00:00.000Z',
  endedAt: '2026-05-18T10:15:00.000Z',
  source: 'healthkit',
  basketballWorkoutSeconds: 0,
  steps: 0,
  distanceMeters: 0,
  activeCalories: null,
  avgHeartRate: null,
  maxHeartRate: null,
  restingHeartRate: null,
  heartRateCoverageSeconds: 0,
  cadenceHighSeconds: null,
  cadenceMax: null,
}

const rewardGranted: BasketballCourtModeClaimResult = {
  eligible: true,
  alreadyClaimed: false,
  rewardGranted: true,
  pointsAwarded: 20,
  balanceAfter: 960,
  activitySessionId: 'session-1',
  passedBy: 'footwork',
  verificationBadge: 'Watch Verified',
}

function metrics(overrides: Partial<BasketballCourtModeMetrics>): BasketballCourtModeMetrics {
  return { ...baseMetrics, ...overrides }
}

describe('syncBasketballCourtModeFromMetrics', () => {
  beforeEach(() => {
    vi.mocked(claimBasketballCourtMode).mockReset()
  })

  it('claims the backend reward when metrics pass a Court Mode signal', async () => {
    vi.mocked(claimBasketballCourtMode).mockResolvedValue(rewardGranted)

    const result = await syncBasketballCourtModeFromMetrics(
      metrics({ steps: 710 }),
      { sessionKey: 'court-session-1', claimReward: true },
    )

    expect(result.evaluation.passed).toBe(true)
    expect(result.claim).toEqual(rewardGranted)
    expect(claimBasketballCourtMode).toHaveBeenCalledWith({
      sessionKey: 'court-session-1',
      metrics: metrics({ steps: 710 }),
    })
  })

  it('does not call the backend when local metrics do not pass', async () => {
    const result = await syncBasketballCourtModeFromMetrics(
      metrics({ steps: 100 }),
      { sessionKey: 'court-session-2', claimReward: true },
    )

    expect(result.evaluation.passed).toBe(false)
    expect(result.claim).toBeNull()
    expect(claimBasketballCourtMode).not.toHaveBeenCalled()
  })

  it('maps an already-claimed backend result without awarding points again', async () => {
    vi.mocked(claimBasketballCourtMode).mockResolvedValue({
      ...rewardGranted,
      alreadyClaimed: true,
      rewardGranted: false,
      pointsAwarded: 0,
      balanceAfter: 940,
    })

    const result = await syncBasketballCourtModeFromMetrics(
      metrics({ basketballWorkoutSeconds: 720 }),
      { sessionKey: 'court-session-3', claimReward: true },
    )

    expect(result.evaluation.passedBy).toBe('workout')
    expect(result.claim).toMatchObject({
      alreadyClaimed: true,
      rewardGranted: false,
      pointsAwarded: 0,
      balanceAfter: 940,
    })
  })
})
