import { describe, expect, it } from 'vitest'

import {
  calculateSoloRunPointReward,
  getRunPointsSummaryDisplay,
  getRunRewardPreviewFromPolicy,
  getSoloRunPointRewardPreview,
  resolveLiveRunRewardPreviewDistance,
  type RunRewardPolicy,
} from './runSessionRewards'

const serverPolicy: RunRewardPolicy = {
  policyVersion: 'solo_run_v2',
  rewardPolicy: 'solo_run',
  soloRun: {
    minDistanceMeters: 5_000,
    basePoints: 50,
    stepDistanceMeters: 1_000,
    stepPoints: 20,
    earlyStepDistanceMeters: 1_000,
    earlyStepPoints: 10,
    thresholdUncertaintyMeters: 50,
    maxDistanceMeters: 100_000,
  },
  dailyCap: {
    capPoints: 300,
    earnedTodayPoints: 0,
    remainingPoints: 300,
    capReached: false,
    windowStart: '2026-05-25T00:00:00.000Z',
  },
  generatedAt: '2026-05-25T10:00:00.000Z',
}

describe('solo run point rewards', () => {
  it('awards 10 points per full km before 5 km', () => {
    expect(calculateSoloRunPointReward(999)).toBe(0)
    expect(calculateSoloRunPointReward(1_000)).toBe(10)
    expect(calculateSoloRunPointReward(1_999)).toBe(10)
    expect(calculateSoloRunPointReward(4_000)).toBe(40)
    expect(calculateSoloRunPointReward(4_999)).toBe(40)
  })

  it('keeps the original 5 km and post-5 km reward steps', () => {
    expect(calculateSoloRunPointReward(5_000)).toBe(50)
    expect(calculateSoloRunPointReward(5_999)).toBe(50)
    expect(calculateSoloRunPointReward(6_000)).toBe(70)
    expect(calculateSoloRunPointReward(7_250)).toBe(90)
  })

  it('previews the next reward threshold for the live HUD', () => {
    expect(getSoloRunPointRewardPreview(756)).toMatchObject({
      points: 0,
      nextRewardDistanceMeters: 1_000,
      nextRewardPoints: 10,
      metersUntilNextReward: 244,
    })

    expect(getSoloRunPointRewardPreview(1_250)).toMatchObject({
      points: 10,
      nextRewardDistanceMeters: 2_000,
      nextRewardPoints: 20,
      metersUntilNextReward: 750,
    })

    expect(getSoloRunPointRewardPreview(5_250)).toMatchObject({
      points: 50,
      nextRewardDistanceMeters: 6_000,
      nextRewardPoints: 70,
      metersUntilNextReward: 750,
    })
  })

  it('uses the server policy rule for live reward estimates', () => {
    const customPolicy: RunRewardPolicy = {
      ...serverPolicy,
      soloRun: {
        ...serverPolicy.soloRun,
        minDistanceMeters: 3_000,
        basePoints: 30,
        stepDistanceMeters: 500,
        stepPoints: 10,
        earlyStepDistanceMeters: 1_000,
        earlyStepPoints: 10,
      },
    }

    expect(getRunRewardPreviewFromPolicy(3_500, customPolicy)).toMatchObject({
      estimateAvailable: true,
      estimatedPoints: 40,
      nextRewardDistanceMeters: 4_000,
      nextRewardPoints: 50,
    })
  })

  it('falls back to the local default rule while the server policy is unavailable', () => {
    expect(getRunRewardPreviewFromPolicy(2_020, null)).toMatchObject({
      estimateAvailable: true,
      estimatedPoints: 20,
      rewardPolicy: 'unknown',
      nextRewardDistanceMeters: 3_000,
      nextRewardPoints: 30,
      dailyCapRemainingPoints: null,
      dailyCapMayBlockReward: false,
    })
  })

  it('uses the visible live distance for live HUD reward preview when the upload path lags', () => {
    const previewDistance = resolveLiveRunRewardPreviewDistance({
      distanceMeters: 1_010,
      submittedDistanceMeters: 0,
    })

    expect(getRunRewardPreviewFromPolicy(previewDistance, serverPolicy)).toMatchObject({
      estimatedPoints: 10,
      points: 10,
    })
  })

  it('marks runs near a reward threshold as server-confirmed at submit time', () => {
    expect(getRunRewardPreviewFromPolicy(990, serverPolicy)).toMatchObject({
      nearRewardThreshold: true,
      estimatedPoints: 0,
    })
    expect(getRunRewardPreviewFromPolicy(1_010, serverPolicy)).toMatchObject({
      nearRewardThreshold: true,
      estimatedPoints: 10,
    })
    expect(getRunRewardPreviewFromPolicy(4_990, serverPolicy)).toMatchObject({
      nearRewardThreshold: true,
      estimatedPoints: 40,
    })
    expect(getRunRewardPreviewFromPolicy(5_010, serverPolicy)).toMatchObject({
      nearRewardThreshold: true,
      estimatedPoints: 50,
    })
  })

  it('caps live reward estimates to the remaining daily earning room', () => {
    const cappedPolicy: RunRewardPolicy = {
      ...serverPolicy,
      dailyCap: {
        ...serverPolicy.dailyCap,
        earnedTodayPoints: 240,
        remainingPoints: 60,
      },
    }

    expect(getRunRewardPreviewFromPolicy(6_000, cappedPolicy)).toMatchObject({
      points: 70,
      estimatedPoints: 60,
      dailyCapMayBlockReward: false,
      dailyCapRemainingPoints: 60,
    })
  })

  it('suppresses solo preview for match-context runs', () => {
    expect(getRunRewardPreviewFromPolicy(6_000, {
      ...serverPolicy,
      rewardPolicy: 'match_pending',
    })).toMatchObject({
      rewardPolicy: 'match_pending',
      estimatedPoints: 0,
      soloRewardSuppressed: true,
    })
  })

  it('does not turn summary distance into awarded points without actual server reward data', () => {
    expect(getRunPointsSummaryDisplay({
      pointDelta: null,
      rewardReason: null,
      rewardPolicy: 'solo_run',
      distanceMeters: 6_000,
      isMatchRun: false,
      policy: serverPolicy,
    })).toMatchObject({
      value: '0 pts',
      tone: 'neutral',
    })
  })

  it('summarizes daily cap as the actual server result', () => {
    expect(getRunPointsSummaryDisplay({
      pointDelta: 0,
      rewardReason: 'daily_cap',
      rewardPolicy: 'solo_run',
      distanceMeters: 6_000,
      isMatchRun: false,
      policy: serverPolicy,
    })).toMatchObject({
      value: '0 pts',
      tone: 'warning',
    })
  })
})
