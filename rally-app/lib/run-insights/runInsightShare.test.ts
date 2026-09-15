import { describe, expect, it } from 'vitest'

import { buildRunInsightSummary } from './runInsightEngine'
import {
  getDefaultRunShareMetricIds,
  resolveRunShareMetrics,
  toggleRunShareMetricId,
} from './runInsightShare'

describe('run insight share helpers', () => {
  it('excludes points-earned from default selected ids but keeps it selectable', () => {
    const summary = buildRunInsightSummary({
      source: 'gps_live',
      distanceMeters: 5000,
      movingTimeSeconds: 1500,
      paceSecondsPerKm: 300,
      pathPointCount: 320,
      pointDelta: 12,
    })

    const defaultIds = getDefaultRunShareMetricIds(summary)

    // (a) points-earned is NOT in the default set
    expect(defaultIds).not.toContain('points-earned')

    // (b) it IS present as a candidate (selectable)
    expect(summary.shareCandidates.map((c) => c.id)).toContain('points-earned')

    // (c) when explicitly added it resolves correctly
    const withPoints = resolveRunShareMetrics(
      summary,
      [...defaultIds, 'points-earned'],
      false,
    )
    expect(withPoints.map((m) => m.id)).toContain('points-earned')
  })

  it('excludes sensitive metrics from default share candidates', () => {
    const summary = buildRunInsightSummary({
      source: 'gps_live',
      distanceMeters: 5000,
      movingTimeSeconds: 1500,
      paceSecondsPerKm: 300,
      pathPointCount: 320,
      avgHeartRate: 152,
    })

    const defaultIds = getDefaultRunShareMetricIds(summary)
    const metrics = resolveRunShareMetrics(summary, defaultIds, false)

    expect(defaultIds).toContain('distance')
    expect(defaultIds).not.toContain('avg-heart-rate')
    expect(metrics.map((metric) => metric.label)).toEqual([
      'Distance',
      'Moving time',
      'Avg pace',
      'Source',
    ])
  })

  it('resolves selected public and sensitive metric labels only after explicit opt-in', () => {
    const summary = buildRunInsightSummary({
      source: 'health_connect',
      distanceMeters: 10_000,
      movingTimeSeconds: 3600,
      paceSecondsPerKm: 360,
      avgHeartRate: 144,
      maxHeartRate: 178,
    })

    const selectedIds = toggleRunShareMetricId(
      getDefaultRunShareMetricIds(summary),
      'avg-heart-rate',
    )

    expect(resolveRunShareMetrics(summary, selectedIds, false).map((metric) => metric.id))
      .not.toContain('avg-heart-rate')
    expect(resolveRunShareMetrics(summary, selectedIds, true).map((metric) => metric.label))
      .toContain('Avg heart rate')
  })
})
