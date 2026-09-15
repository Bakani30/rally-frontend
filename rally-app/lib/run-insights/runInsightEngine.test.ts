import { describe, expect, it } from 'vitest'

import { buildRunInsightSummary } from './runInsightEngine'

describe('buildRunInsightSummary', () => {
  it('marks clean phone GPS runs as credible and shareable without sensitive defaults', () => {
    const summary = buildRunInsightSummary({
      source: 'gps_live',
      distanceMeters: 5000,
      movingTimeSeconds: 1500,
      paceSecondsPerKm: 300,
      pathPointCount: 300,
      integrityFlags: [],
      splits: [
        { km: 1, timeSeconds: 310, paceSecondsPerKm: 310 },
        { km: 2, timeSeconds: 615, paceSecondsPerKm: 305 },
        { km: 3, timeSeconds: 915, paceSecondsPerKm: 300 },
        { km: 4, timeSeconds: 1210, paceSecondsPerKm: 295 },
        { km: 5, timeSeconds: 1500, paceSecondsPerKm: 290 },
      ],
      avgHeartRate: 154,
    })

    expect(summary.credibilityCards.some((card) => card.id === 'clean-gps')).toBe(true)
    expect(summary.storyCards.some((card) => card.id === 'negative-split')).toBe(true)
    expect(summary.shareCandidates.map((item) => item.id)).toContain('distance')
    expect(summary.shareCandidates.some((item) => item.id === 'avg-heart-rate')).toBe(false)
    expect(summary.sensitiveMetrics.map((item) => item.id)).toContain('avg-heart-rate')
  })

  it('keeps good route quality silent without adding extra route cards', () => {
    const summary = buildRunInsightSummary({
      source: 'gps_live',
      distanceMeters: 5000,
      movingTimeSeconds: 1500,
      paceSecondsPerKm: 300,
      pathPointCount: 300,
      integrityFlags: [],
      routeQuality: {
        status: 'good',
        issues: [],
        diagnostics: {
          activePointCount: 300,
          avgSampleGapSeconds: 5,
          maxSampleGapSeconds: 5,
          avgSpacingMeters: 18,
          maxSegmentMeters: 22,
          maxDerivedSpeedMps: 4.4,
          poorAccuracyRatio: 0,
        },
        message: null,
      },
    })

    expect(summary.credibilityCards.map((card) => card.id)).toContain('clean-gps')
    expect(summary.credibilityCards.some((card) => card.id.startsWith('route-quality'))).toBe(false)
  })

  it('adds one compact note when route quality needs review', () => {
    const summary = buildRunInsightSummary({
      source: 'gps_live',
      distanceMeters: 5000,
      movingTimeSeconds: 1500,
      paceSecondsPerKm: 300,
      pathPointCount: 300,
      routeQuality: {
        status: 'review',
        issues: ['gps_gap'],
        diagnostics: {
          activePointCount: 300,
          avgSampleGapSeconds: 6,
          maxSampleGapSeconds: 35,
          avgSpacingMeters: 20,
          maxSegmentMeters: 90,
          maxDerivedSpeedMps: 5,
          poorAccuracyRatio: 0,
        },
        message: 'GPS had a gap, so route-level details may be less precise.',
      },
    })

    expect(summary.credibilityCards.map((card) => card.id)).toEqual(['route-quality-review'])
    expect(summary.credibilityCards[0]).toMatchObject({
      title: 'Route quality note',
      severity: 'neutral',
    })
    expect(summary.statBoard.find((stat) => stat.id === 'trust-code')).toMatchObject({
      value: 'review',
      detail: 'GPS had a gap, so route-level details may be less precise.',
    })
  })

  it('adds sprint caution copy as an estimate, not official timing', () => {
    const summary = buildRunInsightSummary({
      source: 'gps_live',
      distanceMeters: 100,
      movingTimeSeconds: 14,
      paceSecondsPerKm: 140,
      pathPointCount: 12,
      routeQuality: {
        status: 'review',
        issues: ['sprint_gps_caution'],
        diagnostics: {
          activePointCount: 12,
          avgSampleGapSeconds: 1,
          maxSampleGapSeconds: 1,
          avgSpacingMeters: 9,
          maxSegmentMeters: 10,
          maxDerivedSpeedMps: 9,
          poorAccuracyRatio: 0,
        },
        message: 'Very short runs use phone GPS timing as an estimate.',
      },
    })

    const routeNote = summary.credibilityCards.find((card) => card.id === 'route-quality-review')
    expect(routeNote?.body).toContain('estimate')
    expect(routeNote?.body.toLowerCase()).not.toContain('official')
  })

  it('downgrades limited route quality to a compact warning', () => {
    const summary = buildRunInsightSummary({
      source: 'gps_live',
      distanceMeters: 500,
      movingTimeSeconds: 150,
      paceSecondsPerKm: 300,
      pathPointCount: 8,
      routeQuality: {
        status: 'limited',
        issues: ['sparse_points'],
        diagnostics: {
          activePointCount: 8,
          avgSampleGapSeconds: 5,
          maxSampleGapSeconds: 5,
          avgSpacingMeters: 20,
          maxSegmentMeters: 25,
          maxDerivedSpeedMps: 5,
          poorAccuracyRatio: 0,
        },
        message: 'GPS route is sparse, so route-level details may be limited.',
      },
    })

    expect(summary.credibilityCards).toEqual([
      {
        id: 'route-quality-limited',
        title: 'Route detail limited',
        body: 'GPS route is sparse, so route-level details may be limited.',
        severity: 'warning',
      },
    ])
    expect(summary.statBoard.find((stat) => stat.id === 'trust-code')).toMatchObject({
      value: 'limited',
      severity: 'warning',
    })
  })

  it('keeps summary-only Health imports valid but notes missing route detail', () => {
    const summary = buildRunInsightSummary({
      source: 'healthkit',
      distanceMeters: 8040,
      movingTimeSeconds: 2880,
      paceSecondsPerKm: 358,
      pathPointCount: 0,
      integrityFlags: ['external_health_source'],
      splits: [],
    })

    expect(summary.credibilityCards.map((card) => card.id)).toContain('summary-only')
    expect(summary.storyCards.map((card) => card.id)).toContain('solid-summary')
    expect(summary.shareCandidates.find((item) => item.id === 'source')?.value).toBe('HealthKit')
  })

  it('gives a pacing tip when the second half fades', () => {
    const summary = buildRunInsightSummary({
      source: 'gps_live',
      distanceMeters: 6000,
      movingTimeSeconds: 2100,
      paceSecondsPerKm: 350,
      pathPointCount: 240,
      splits: [
        { km: 1, timeSeconds: 320, paceSecondsPerKm: 320 },
        { km: 2, timeSeconds: 645, paceSecondsPerKm: 325 },
        { km: 3, timeSeconds: 985, paceSecondsPerKm: 340 },
        { km: 4, timeSeconds: 1360, paceSecondsPerKm: 375 },
        { km: 5, timeSeconds: 1750, paceSecondsPerKm: 390 },
        { km: 6, timeSeconds: 2150, paceSecondsPerKm: 400 },
      ],
    })

    expect(summary.storyCards.map((card) => card.id)).toContain('positive-split')
    expect(summary.trainingTips.map((card) => card.id)).toContain('tip-start-slower')
  })

  it('treats recovery context as sensitive and private-tip material', () => {
    const summary = buildRunInsightSummary({
      source: 'health_connect',
      distanceMeters: 5000,
      movingTimeSeconds: 1800,
      paceSecondsPerKm: 360,
      recovery: { sleepMinutes: 300 },
    })

    expect(summary.trainingTips.map((card) => card.id)).toContain('tip-low-sleep')
    expect(summary.sensitiveMetrics.map((item) => item.id)).toContain('sleep-context')
  })

  it('keeps fallback tips focused on what to do next instead of point thresholds', () => {
    const summary = buildRunInsightSummary({
      source: 'gps_live',
      distanceMeters: 750,
      movingTimeSeconds: 338,
      paceSecondsPerKm: 322,
      pathPointCount: 67,
      splits: [],
    })

    expect(summary.trainingTips[0]).toMatchObject({
      id: 'tip-basic-recap',
      title: 'Next run',
    })
    expect(summary.trainingTips[0].body).not.toContain('pts')
  })

  it('keeps match-context runs on generic next-run guidance', () => {
    const summary = buildRunInsightSummary({
      source: 'gps_live',
      distanceMeters: 1_050,
      movingTimeSeconds: 338,
      paceSecondsPerKm: 322,
      pathPointCount: 67,
      rewardPolicy: 'match_pending',
      splits: [],
    })

    expect(summary.trainingTips[0].id).toBe('tip-add-context')
    expect(summary.trainingTips[0].body).not.toContain('pts')
  })

  it('shows that run history is being collected before trend analysis is trusted', () => {
    const summary = buildRunInsightSummary({
      source: 'gps_live',
      distanceMeters: 3_000,
      movingTimeSeconds: 1_080,
      paceSecondsPerKm: 360,
      pathPointCount: 80,
      history: [
        {
          source: 'gps_live',
          distanceMeters: 2_400,
          movingTimeSeconds: 900,
          paceSecondsPerKm: 375,
          pathPointCount: 60,
        },
      ],
    })

    expect(summary.historyCards.map((card) => card.id)).toContain('history-baseline-needed')
    expect(summary.statBoard.find((stat) => stat.id === 'history')?.value).toBe('1/3')
    expect(summary.trainingTips.map((card) => card.id)).toContain('tip-build-history')
  })

  it('compares the current run against recent running history for code stats', () => {
    const summary = buildRunInsightSummary({
      source: 'gps_live',
      distanceMeters: 5_200,
      movingTimeSeconds: 1_560,
      paceSecondsPerKm: 300,
      pathPointCount: 220,
      splits: [
        { km: 1, timeSeconds: 305, paceSecondsPerKm: 305 },
        { km: 2, timeSeconds: 605, paceSecondsPerKm: 300 },
        { km: 3, timeSeconds: 905, paceSecondsPerKm: 300 },
        { km: 4, timeSeconds: 1205, paceSecondsPerKm: 300 },
        { km: 5, timeSeconds: 1505, paceSecondsPerKm: 300 },
      ],
      history: [
        { source: 'gps_live', distanceMeters: 5_000, movingTimeSeconds: 1_650, paceSecondsPerKm: 330, pathPointCount: 200 },
        { source: 'healthkit', distanceMeters: 4_900, movingTimeSeconds: 1_617, paceSecondsPerKm: 330, pathPointCount: 0 },
        { source: 'gps_live', distanceMeters: 5_300, movingTimeSeconds: 1_749, paceSecondsPerKm: 330, pathPointCount: 210 },
      ],
    })

    expect(summary.historyCards.map((card) => card.id)).toContain('pace-trending-up')
    expect(summary.statBoard.find((stat) => stat.id === 'pace-code')?.value).toBe('-0:30/km')
    expect(summary.statBoard.find((stat) => stat.id === 'control-code')?.value).toBe('steady')
  })

  it('puts the runner recent base before external benchmark context', () => {
    const summary = buildRunInsightSummary({
      startedAt: '2026-05-14T00:00:00.000Z',
      source: 'gps_live',
      distanceMeters: 5_000,
      movingTimeSeconds: 1_500,
      paceSecondsPerKm: 300,
      pathPointCount: 220,
      profile: {
        birthYear: 1994,
        competitionCategory: 'men',
        runningLevel: 'competitive',
        primaryGoal: 'faster_5k',
        preferredUnits: 'metric',
      },
      history: [
        { source: 'gps_live', distanceMeters: 4_900, movingTimeSeconds: 1_617, paceSecondsPerKm: 330 },
        { source: 'healthkit', distanceMeters: 5_100, movingTimeSeconds: 1_734, paceSecondsPerKm: 340 },
        { source: 'gps_live', distanceMeters: 5_000, movingTimeSeconds: 1_675, paceSecondsPerKm: 335 },
      ],
    })

    expect(summary.benchmarkComparisons.slice(0, 3).map((comparison) => comparison.id)).toEqual([
      'self-recent-base',
      'age-grade-5k',
      'running-effort-met',
    ])
    expect(summary.benchmarkComparisons.some((comparison) => comparison.level === 'source_note')).toBe(false)
    expect(summary.benchmarkComparisons[0]).toMatchObject({
      level: 'self_recent',
      title: 'Your recent base',
      status: 'ready',
    })
  })

  it('does not show an age-grade verdict when profile fields are missing', () => {
    const summary = buildRunInsightSummary({
      startedAt: '2026-05-14T00:00:00.000Z',
      source: 'gps_live',
      distanceMeters: 5_000,
      movingTimeSeconds: 1_500,
      paceSecondsPerKm: 300,
      pathPointCount: 220,
      profile: {
        runningLevel: 'casual',
        primaryGoal: 'faster_5k',
        preferredUnits: 'metric',
      },
    })

    expect(summary.benchmarkComparisons.map((comparison) => comparison.id)).not.toContain('age-grade-5k')
    expect(summary.benchmarkComparisons.map((comparison) => comparison.id)).not.toContain('age-grade-profile-needed')
  })

  it('calculates 5K age-grade context when the run and profile are complete', () => {
    const summary = buildRunInsightSummary({
      startedAt: '2026-05-14T00:00:00.000Z',
      source: 'gps_live',
      distanceMeters: 5_000,
      movingTimeSeconds: 1_500,
      paceSecondsPerKm: 300,
      pathPointCount: 220,
      profile: {
        birthYear: 1994,
        competitionCategory: 'men',
        runningLevel: 'competitive',
        primaryGoal: 'faster_5k',
        preferredUnits: 'metric',
      },
    })

    expect(summary.benchmarkComparisons.find((comparison) => comparison.id === 'age-grade-5k')).toMatchObject({
      level: 'web_age_grade',
      valueLabel: '51.4%',
      referenceLabel: '2025 5K road table',
      status: 'ready',
      contextOnly: true,
    })
  })

  it('adds effort MET as context only and not medical advice', () => {
    const summary = buildRunInsightSummary({
      source: 'gps_live',
      distanceMeters: 5_000,
      movingTimeSeconds: 1_500,
      paceSecondsPerKm: 300,
      pathPointCount: 220,
    })

    const effort = summary.benchmarkComparisons.find((comparison) => comparison.id === 'running-effort-met')

    expect(effort).toMatchObject({
      level: 'web_effort',
      valueLabel: '~11.8 MET',
      contextOnly: true,
    })
    expect(effort?.body).toContain('context only')
    expect(effort?.body).toContain('not medical advice')
  })

  it('includes a points-earned share candidate when pointDelta > 0', () => {
    const summary = buildRunInsightSummary({
      source: 'gps_live',
      distanceMeters: 5_000,
      movingTimeSeconds: 1_500,
      paceSecondsPerKm: 300,
      pathPointCount: 220,
      pointDelta: 92,
    })
    const points = summary.shareCandidates.find((c) => c.id === 'points-earned')
    expect(points).toBeDefined()
    expect(points?.value).toBe('+92')
  })

  it('omits points-earned when pointDelta is null or zero', () => {
    expect(
      buildRunInsightSummary({
        source: 'gps_live',
        distanceMeters: 5_000,
        movingTimeSeconds: 1_500,
        paceSecondsPerKm: 300,
        pathPointCount: 220,
        pointDelta: 0,
      }).shareCandidates.find((c) => c.id === 'points-earned'),
    ).toBeUndefined()
    expect(
      buildRunInsightSummary({
        source: 'gps_live',
        distanceMeters: 5_000,
        movingTimeSeconds: 1_500,
        paceSecondsPerKm: 300,
        pathPointCount: 220,
        pointDelta: null,
      }).shareCandidates.find((c) => c.id === 'points-earned'),
    ).toBeUndefined()
  })
})
