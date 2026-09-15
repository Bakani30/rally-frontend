import type { RunInsightSummary, RunShareCandidate } from './runInsightTypes'

const NON_DEFAULT_SHARE_METRIC_IDS = new Set(['points-earned'])

export function getDefaultRunShareMetricIds(summary: RunInsightSummary): string[] {
  return summary.shareCandidates
    .map((candidate) => candidate.id)
    .filter((id) => !NON_DEFAULT_SHARE_METRIC_IDS.has(id))
}

export function resolveRunShareMetrics(
  summary: RunInsightSummary,
  selectedMetricIds: readonly string[],
  includeSensitiveMetrics: boolean,
): RunShareCandidate[] {
  const selected = new Set(selectedMetricIds)
  const available = includeSensitiveMetrics
    ? [...summary.shareCandidates, ...summary.sensitiveMetrics]
    : summary.shareCandidates

  return available.filter((candidate) => selected.has(candidate.id))
}

export function toggleRunShareMetricId(
  selectedMetricIds: readonly string[],
  metricId: string,
): string[] {
  if (selectedMetricIds.includes(metricId)) {
    return selectedMetricIds.filter((id) => id !== metricId)
  }
  return [...selectedMetricIds, metricId]
}
