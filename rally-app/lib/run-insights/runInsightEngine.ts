import type { Split } from '@/lib/run-tracking/gps/gpsTypes'

import {
  resolveAgeGradeBenchmark,
  resolveRunningEffortBenchmark,
} from './runBenchmarkRegistry'
import type {
  BuildRunInsightInput,
  RunBenchmarkComparison,
  RunInsightCard,
  RunInsightHistorySample,
  RunInsightStat,
  RunInsightSummary,
  RunShareCandidate,
} from './runInsightTypes'

export function buildRunInsightSummary(input: BuildRunInsightInput): RunInsightSummary {
  const splits = input.splits ?? []
  const history = buildHistoryContext(input.history)
  const credibilityCards = buildCredibilityCards(input)
  const storyCards = buildStoryCards(input, splits)
  const historyCards = buildHistoryCards(input, history)
  const statBoard = buildStatBoard(input, splits, history)
  const benchmarkComparisons = buildBenchmarkComparisons(input, history)
  const trainingTips = buildTrainingTips(input, storyCards, history)
  const { shareCandidates, sensitiveMetrics } = buildShareCandidates(input, storyCards, splits)

  return {
    credibilityCards,
    storyCards,
    historyCards,
    statBoard,
    benchmarkComparisons,
    trainingTips,
    shareCandidates,
    sensitiveMetrics,
  }
}

type RunHistoryContext = {
  provided: boolean
  samples: RunInsightHistorySample[]
  usableSamples: RunInsightHistorySample[]
  sampleSize: number
  averagePaceSecondsPerKm: number | null
  averageDistanceMeters: number | null
  bestDistanceMeters: number | null
}

function buildCredibilityCards(input: BuildRunInsightInput): RunInsightCard[] {
  const flags = normalizeFlags(input.integrityFlags)
  const hasRoute = (input.pathPointCount ?? 0) >= 10
  const sourceLabel = sourceLabelFor(input.source)
  const routeQuality = input.routeQuality ?? null

  const cards: RunInsightCard[] = []
  if (
    input.source === 'gps_live' &&
    hasRoute &&
    flags.length === 0 &&
    (routeQuality == null || routeQuality.status === 'good')
  ) {
    cards.push({
      id: 'clean-gps',
      title: 'Clean GPS run',
      body: `${sourceLabel} recorded a route with no major integrity flags.`,
      severity: 'positive',
    })
  } else if ((input.source === 'healthkit' || input.source === 'health_connect') && flags.length === 0) {
    cards.push({
      id: 'external-health',
      title: 'Imported workout',
      body: `${sourceLabel} data can make this recap more complete without manual entry.`,
      severity: hasRoute ? 'positive' : 'neutral',
    })
  } else if (input.source === 'manual') {
    cards.push({
      id: 'manual-source',
      title: 'Manual result',
      body: 'This run can still be logged, but device data would make the recap more credible.',
      severity: 'neutral',
    })
  }

  if (flags.length > 0) {
    cards.push({
      id: 'integrity-flags',
      title: 'Data needs a closer look',
      body: `Rally found ${flags.length} signal${flags.length === 1 ? '' : 's'} that may affect precision.`,
      severity: 'warning',
    })
  }

  if (!hasRoute && input.source !== 'manual' && !(input.source === 'gps_live' && routeQuality)) {
    cards.push({
      id: 'summary-only',
      title: 'Summary-only import',
      body: 'Distance and time are available, but route-level insights need GPS route permission.',
      severity: 'neutral',
    })
  }

  if (routeQuality && routeQuality.status !== 'good' && routeQuality.message) {
    cards.push({
      id: `route-quality-${routeQuality.status}`,
      title: routeQuality.status === 'limited' ? 'Route detail limited' : 'Route quality note',
      body: routeQuality.message,
      severity: routeQuality.status === 'limited' ? 'warning' : 'neutral',
    })
  }

  return cards
}

function buildStoryCards(input: BuildRunInsightInput, splits: Split[]): RunInsightCard[] {
  const cards: RunInsightCard[] = []
  if (splits.length >= 2) {
    const splitStory = describeSplitPattern(splits)
    cards.push(splitStory)

    const finalKick = describeFinalKick(input, splits)
    if (finalKick) cards.push(finalKick)

    const wall = describeWallMoment(input, splits)
    if (wall) cards.push(wall)
  } else if (input.distanceMeters && input.movingTimeSeconds && input.paceSecondsPerKm) {
    cards.push({
      id: 'solid-summary',
      title: 'Run summary ready',
      body: 'Rally has enough distance and pace data for a basic recap.',
      severity: 'neutral',
    })
  }

  if ((input.elevationGainMeters ?? 0) >= 80) {
    cards.push({
      id: 'hill-context',
      title: 'Hill tax',
      body: 'Elevation likely made this run harder than the pace alone suggests.',
      severity: 'neutral',
    })
  }

  return cards
}

function buildTrainingTips(
  input: BuildRunInsightInput,
  storyCards: RunInsightCard[],
  history: RunHistoryContext,
): RunInsightCard[] {
  const tips: RunInsightCard[] = []
  const storyIds = new Set(storyCards.map((card) => card.id))

  if (storyIds.has('positive-split')) {
    tips.push({
      id: 'tip-start-slower',
      title: 'Training tip',
      body: 'Try starting 5-10 sec/km slower next time so you can keep more speed for the finish.',
      severity: 'neutral',
    })
  } else if (storyIds.has('negative-split') || storyIds.has('even-split')) {
    tips.push({
      id: 'tip-pace-control',
      title: 'Training tip',
      body: 'Your pacing control is a strength. Keep using this rhythm for races or verified duels.',
      severity: 'positive',
    })
  }

  if (
    (input.perceivedEffort ?? 0) >= 8 &&
    (input.profile?.primaryGoal === 'marathon' || input.profile?.primaryGoal === 'half_marathon')
  ) {
    tips.push({
      id: 'tip-long-run-effort',
      title: 'Training tip',
      body: 'For longer race goals, keep some runs intentionally easy so hard efforts stay sharp.',
      severity: 'neutral',
    })
  }

  if (input.recovery?.sleepMinutes != null && input.recovery.sleepMinutes < 360) {
    tips.push({
      id: 'tip-low-sleep',
      title: 'Private recovery note',
      body: 'Sleep looked low before this effort. Treat this as context, not a score.',
      severity: 'warning',
    })
  }

  const historyTip = buildHistoryTrainingTip(input, history)
  if (historyTip) tips.push(historyTip)

  if (tips.length === 0) {
    tips.push(buildFallbackTrainingTip(input))
  }

  return tips
}

function buildHistoryContext(history: RunInsightHistorySample[] | undefined): RunHistoryContext {
  const samples = (history ?? []).slice(0, 8)
  const usableSamples = samples.filter(hasUsableRunHistory)
  const averagePaceSecondsPerKm = averageNullable(usableSamples.map((sample) => sample.paceSecondsPerKm))
  const averageDistanceMeters = averageNullable(usableSamples.map((sample) => sample.distanceMeters))
  const bestDistanceMeters = usableSamples.length > 0
    ? Math.max(...usableSamples.map((sample) => sample.distanceMeters ?? 0))
    : null

  return {
    provided: Array.isArray(history),
    samples,
    usableSamples,
    sampleSize: usableSamples.length,
    averagePaceSecondsPerKm,
    averageDistanceMeters,
    bestDistanceMeters,
  }
}

function buildHistoryCards(
  input: BuildRunInsightInput,
  history: RunHistoryContext,
): RunInsightCard[] {
  if (!history.provided) return []

  if (history.sampleSize < 3) {
    const needed = 3 - history.sampleSize
    return [{
      id: 'history-baseline-needed',
      title: 'Run history is building',
      body: `Rally saved ${history.sampleSize}/3 runs for trend analysis. ${needed} more run${needed === 1 ? '' : 's'} unlock a steadier pace baseline.`,
      severity: 'neutral',
    }]
  }

  const cards: RunInsightCard[] = []
  const paceDelta = getPaceDelta(input, history)
  if (paceDelta != null && history.averagePaceSecondsPerKm != null) {
    if (paceDelta <= history.averagePaceSecondsPerKm * -0.03) {
      cards.push({
        id: 'pace-trending-up',
        title: 'Faster than recent form',
        body: `This run was ${formatPaceDelta(paceDelta)} versus your recent average pace.`,
        severity: 'positive',
      })
    } else if (paceDelta >= history.averagePaceSecondsPerKm * 0.04) {
      cards.push({
        id: 'pace-under-baseline',
        title: 'Slower than recent form',
        body: `Pace was ${formatPaceDelta(paceDelta)} versus your recent average. Check route, sleep, or effort before calling it a drop.`,
        severity: 'neutral',
      })
    }
  }

  if (
    input.distanceMeters != null &&
    history.bestDistanceMeters != null &&
    input.distanceMeters > history.bestDistanceMeters * 1.02
  ) {
    cards.push({
      id: 'distance-high-score',
      title: 'Distance high score',
      body: `This is your longest saved run in the recent Rally history window.`,
      severity: 'positive',
    })
  }

  if (cards.length === 0) {
    cards.push({
      id: 'steady-base',
      title: 'Stable training base',
      body: 'Distance and pace sit close to your recent saved runs, useful for repeatable training.',
      severity: 'positive',
    })
  }

  return cards
}

function buildStatBoard(
  input: BuildRunInsightInput,
  splits: Split[],
  history: RunHistoryContext,
): RunInsightStat[] {
  const paceDelta = getPaceDelta(input, history)
  const distanceRatio = getDistanceRatio(input, history)

  return [
    {
      id: 'history',
      label: 'History',
      value: history.provided ? `${Math.min(history.sampleSize, 3)}/3` : 'new',
      detail: history.provided
        ? `${history.sampleSize} saved run${history.sampleSize === 1 ? '' : 's'} in analysis`
        : 'No history query attached yet',
      severity: history.sampleSize >= 3 ? 'positive' : 'neutral',
    },
    {
      id: 'pace-code',
      label: 'Pace code',
      value: paceDelta != null ? formatPaceDelta(paceDelta) : (input.paceSecondsPerKm != null ? formatPace(input.paceSecondsPerKm) : '--'),
      detail: history.averagePaceSecondsPerKm != null
        ? `vs recent avg ${formatPace(history.averagePaceSecondsPerKm)}`
        : 'Current pace only until more runs are saved',
      severity: paceDelta == null ? 'neutral' : paceDelta <= -10 ? 'positive' : paceDelta >= 20 ? 'warning' : 'neutral',
    },
    {
      id: 'load-code',
      label: 'Load',
      value: distanceRatio != null ? `${distanceRatio.toFixed(1)}x` : (input.distanceMeters != null ? formatDistance(input.distanceMeters) : '--'),
      detail: history.averageDistanceMeters != null
        ? `distance vs recent avg ${formatDistance(history.averageDistanceMeters)}`
        : 'Distance baseline starts from saved history',
      severity: distanceRatio != null && distanceRatio > 1.25 ? 'warning' : 'neutral',
    },
    {
      id: 'control-code',
      label: 'Control',
      value: getControlCode(splits),
      detail: getControlDetail(splits),
      severity: getControlSeverity(splits),
    },
    {
      id: 'trust-code',
      label: 'Trust',
      value: getTrustCode(input),
      detail: getTrustDetail(input),
      severity: getTrustSeverity(input),
    },
  ]
}

function buildBenchmarkComparisons(
  input: BuildRunInsightInput,
  history: RunHistoryContext,
): RunBenchmarkComparison[] {
  const comparisons: RunBenchmarkComparison[] = []

  const selfComparison = buildSelfBenchmarkComparison(input, history)
  if (selfComparison) comparisons.push(selfComparison)

  const ageGradeComparison = buildAgeGradeComparison(input)
  if (ageGradeComparison) comparisons.push(ageGradeComparison)

  const effortComparison = buildEffortComparison(input)
  if (effortComparison) comparisons.push(effortComparison)

  return comparisons
}

function buildSelfBenchmarkComparison(
  input: BuildRunInsightInput,
  history: RunHistoryContext,
): RunBenchmarkComparison | null {
  if (!history.provided || history.sampleSize < 3) return null

  const paceDelta = getPaceDelta(input, history)
  const distanceRatio = getDistanceRatio(input, history)
  const valueLabel = input.paceSecondsPerKm != null
    ? formatPace(input.paceSecondsPerKm)
    : input.distanceMeters != null
      ? formatDistance(input.distanceMeters)
      : 'current run'
  const referenceLabel = history.averagePaceSecondsPerKm != null
    ? `Recent ${formatPace(history.averagePaceSecondsPerKm)}`
    : history.averageDistanceMeters != null
      ? `Recent ${formatDistance(history.averageDistanceMeters)}`
      : `${history.sampleSize} saved runs`

  return {
    id: 'self-recent-base',
    level: 'self_recent',
    title: 'Your recent base',
    metricLabel: 'RALLY',
    valueLabel,
    referenceLabel,
    deltaLabel: paceDelta != null ? `${formatPaceDelta(paceDelta)} vs recent pace` : null,
    body: distanceRatio != null
      ? `Rally compares your run to ${history.sampleSize} saved runs first. Distance is ${distanceRatio.toFixed(1)}x your recent base.`
      : `Rally compares your run to ${history.sampleSize} saved runs first before any outside context.`,
    status: 'ready',
    severity: paceDelta != null && paceDelta <= -10 ? 'positive' : 'neutral',
    contextOnly: true,
  }
}

function buildAgeGradeComparison(input: BuildRunInsightInput): RunBenchmarkComparison | null {
  const profile = input.profile
  const runYear = getRunYear(input.startedAt)
  const age = getAgeFromBirthYear(profile?.birthYear, runYear)
  const ageGrade = resolveAgeGradeBenchmark({
    distanceMeters: input.distanceMeters,
    movingTimeSeconds: input.movingTimeSeconds,
    age,
    category: profile?.competitionCategory,
  })

  if (ageGrade) {
    const categoryLabel = ageGrade.category === 'women' ? 'women' : 'men'
    return {
      id: `age-grade-${ageGrade.distanceKey}`,
      level: 'web_age_grade',
      title: 'Age-grade context',
      metricLabel: 'AGE',
      valueLabel: `${ageGrade.ageGradePercent.toFixed(1)}%`,
      referenceLabel: `${ageGrade.source.season} ${ageGrade.distanceLabel} road table`,
      deltaLabel: null,
      body: `Age ${ageGrade.age}, ${categoryLabel} table. Context only from road standards, not a skill verdict or points rule.`,
      status: 'ready',
      severity: 'neutral',
      contextOnly: true,
      source: ageGrade.source,
    }
  }

  return null
}

function buildEffortComparison(input: BuildRunInsightInput): RunBenchmarkComparison | null {
  const effort = resolveRunningEffortBenchmark(input.paceSecondsPerKm)
  if (!effort) return null

  return {
    id: 'running-effort-met',
    level: 'web_effort',
    title: 'Effort context',
    metricLabel: 'MET',
    valueLabel: `~${effort.met.toFixed(1)} MET`,
    referenceLabel: `Compendium ${effort.activityCode}`,
    deltaLabel: null,
    body: `Estimated from pace as context only, not medical advice. Matched to ${effort.activityLabel}.`,
    status: 'ready',
    severity: 'neutral',
    contextOnly: true,
    source: effort.source,
  }
}

function buildHistoryTrainingTip(
  input: BuildRunInsightInput,
  history: RunHistoryContext,
): RunInsightCard | null {
  if (!history.provided) return null

  if (history.sampleSize < 3) {
    return {
      id: 'tip-build-history',
      title: 'Build the run file',
      body: 'Save two or three normal runs before judging progress. Rally will compare pace, distance, and trust signals from your own history.',
      severity: 'neutral',
    }
  }

  const paceDelta = getPaceDelta(input, history)
  const distanceRatio = getDistanceRatio(input, history)
  if (paceDelta != null && paceDelta <= -20 && distanceRatio != null && distanceRatio >= 1.05) {
    return {
      id: 'tip-protect-recovery',
      title: 'Coach tip',
      body: 'This was faster and at least as long as your recent base. Make the next run easy or shorter unless you are in a race week.',
      severity: 'positive',
    }
  }

  if (distanceRatio != null && distanceRatio > 1.25) {
    return {
      id: 'tip-long-load',
      title: 'Coach tip',
      body: 'Big distance jump detected. Keep the next effort controlled so the extra load becomes fitness, not fatigue.',
      severity: 'warning',
    }
  }

  return null
}

function buildFallbackTrainingTip(input: BuildRunInsightInput): RunInsightCard {
  if (input.distanceMeters != null && input.distanceMeters < 1000) {
    return {
      id: 'tip-basic-recap',
      title: 'Next run',
      body: 'This run is saved. One slightly longer easy run will give Rally a clearer pacing pattern.',
      severity: 'neutral',
    }
  }

  return {
    id: 'tip-add-context',
    title: 'Next run',
    body: 'Save one more normal run before judging progress. Rally gets clearer once it can compare your own history.',
    severity: 'neutral',
  }
}

function buildShareCandidates(
  input: BuildRunInsightInput,
  storyCards: RunInsightCard[],
  splits: Split[],
): {
  shareCandidates: RunShareCandidate[]
  sensitiveMetrics: RunShareCandidate[]
} {
  const shareCandidates: RunShareCandidate[] = []
  const sensitiveMetrics: RunShareCandidate[] = []

  if (input.distanceMeters != null) {
    shareCandidates.push({
      id: 'distance',
      label: 'Distance',
      value: formatDistance(input.distanceMeters),
      sensitivity: 'public_default',
    })
  }
  if (input.movingTimeSeconds != null) {
    shareCandidates.push({
      id: 'moving-time',
      label: 'Moving time',
      value: formatDuration(input.movingTimeSeconds),
      sensitivity: 'public_default',
    })
  }
  if (input.paceSecondsPerKm != null) {
    shareCandidates.push({
      id: 'avg-pace',
      label: 'Avg pace',
      value: formatPace(input.paceSecondsPerKm),
      sensitivity: 'public_default',
    })
  }

  if (input.pointDelta != null && input.pointDelta > 0) {
    shareCandidates.push({
      id: 'points-earned',
      label: 'Points',
      value: `+${input.pointDelta}`,
      sensitivity: 'public_default',
    })
  }

  shareCandidates.push({
    id: 'source',
    label: 'Source',
    value: sourceLabelFor(input.source),
    sensitivity: 'public_default',
  })

  const bestSplit = splits.length > 0
    ? splits.reduce((best, split) => split.paceSecondsPerKm < best.paceSecondsPerKm ? split : best, splits[0])
    : null
  if (bestSplit) {
    shareCandidates.push({
      id: 'best-split',
      label: `Best km ${bestSplit.km}`,
      value: formatPace(bestSplit.paceSecondsPerKm),
      sensitivity: 'public_default',
    })
  }

  const badge = storyCards.find((card) =>
    card.id === 'negative-split' || card.id === 'even-split' || card.id === 'final-kick'
  )
  if (badge) {
    shareCandidates.push({
      id: `badge-${badge.id}`,
      label: 'Badge',
      value: badge.title,
      sensitivity: 'public_default',
    })
  }

  if (input.avgHeartRate != null) {
    sensitiveMetrics.push({
      id: 'avg-heart-rate',
      label: 'Avg heart rate',
      value: `${Math.round(input.avgHeartRate)} bpm`,
      sensitivity: 'explicit_sensitive',
    })
  }
  if (input.maxHeartRate != null) {
    sensitiveMetrics.push({
      id: 'max-heart-rate',
      label: 'Max heart rate',
      value: `${Math.round(input.maxHeartRate)} bpm`,
      sensitivity: 'explicit_sensitive',
    })
  }
  if (input.recovery?.sleepMinutes != null) {
    sensitiveMetrics.push({
      id: 'sleep-context',
      label: 'Sleep context',
      value: formatDuration(input.recovery.sleepMinutes * 60),
      sensitivity: 'explicit_sensitive',
    })
  }

  return { shareCandidates, sensitiveMetrics }
}

function describeSplitPattern(splits: Split[]): RunInsightCard {
  const midpoint = Math.ceil(splits.length / 2)
  const firstHalf = averagePace(splits.slice(0, midpoint))
  const secondHalf = averagePace(splits.slice(midpoint))

  if (secondHalf <= firstHalf * 0.97) {
    return {
      id: 'negative-split',
      title: 'Negative split',
      body: 'You finished stronger than you started.',
      severity: 'positive',
    }
  }

  if (secondHalf >= firstHalf * 1.05) {
    return {
      id: 'positive-split',
      title: 'Late fade',
      body: 'Your second half was noticeably slower, which is useful pacing feedback.',
      severity: 'warning',
    }
  }

  return {
    id: 'even-split',
    title: 'Even pacing',
    body: 'Your first and second halves stayed close together.',
    severity: 'positive',
  }
}

function describeFinalKick(input: BuildRunInsightInput, splits: Split[]): RunInsightCard | null {
  const last = splits[splits.length - 1]
  const average = input.paceSecondsPerKm ?? averagePace(splits)
  if (last.paceSecondsPerKm <= average * 0.97) {
    return {
      id: 'final-kick',
      title: 'Final kick',
      body: 'Your last kilometer was faster than your average pace.',
      severity: 'positive',
    }
  }
  return null
}

function describeWallMoment(input: BuildRunInsightInput, splits: Split[]): RunInsightCard | null {
  const average = input.paceSecondsPerKm ?? averagePace(splits)
  const lateSplits = splits.slice(Math.floor(splits.length / 2))
  const slowestLate = lateSplits.reduce((slowest, split) =>
    split.paceSecondsPerKm > slowest.paceSecondsPerKm ? split : slowest,
  lateSplits[0])

  if (slowestLate && slowestLate.paceSecondsPerKm >= average * 1.12) {
    return {
      id: 'wall-moment',
      title: `Wall moment: km ${slowestLate.km}`,
      body: 'This was the late split where pace drifted the most.',
      severity: 'neutral',
    }
  }
  return null
}

function averagePace(splits: Split[]): number {
  if (splits.length === 0) return 0
  return splits.reduce((sum, split) => sum + split.paceSecondsPerKm, 0) / splits.length
}

function hasUsableRunHistory(sample: RunInsightHistorySample): boolean {
  return (
    sample.distanceMeters != null &&
    sample.distanceMeters > 0 &&
    sample.paceSecondsPerKm != null &&
    sample.paceSecondsPerKm > 0
  )
}

function averageNullable(values: Array<number | null | undefined>): number | null {
  const usable = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
  if (usable.length === 0) return null
  return usable.reduce((sum, value) => sum + value, 0) / usable.length
}

function getPaceDelta(input: BuildRunInsightInput, history: RunHistoryContext): number | null {
  if (input.paceSecondsPerKm == null || history.averagePaceSecondsPerKm == null) return null
  return input.paceSecondsPerKm - history.averagePaceSecondsPerKm
}

function getDistanceRatio(input: BuildRunInsightInput, history: RunHistoryContext): number | null {
  if (input.distanceMeters == null || history.averageDistanceMeters == null) return null
  return input.distanceMeters / history.averageDistanceMeters
}

function getRunYear(startedAt: string | null | undefined): number {
  if (startedAt) {
    const date = new Date(startedAt)
    const year = date.getUTCFullYear()
    if (Number.isFinite(year)) return year
  }
  return new Date().getUTCFullYear()
}

function getAgeFromBirthYear(birthYear: number | null | undefined, runYear: number): number | null {
  if (birthYear == null || !Number.isFinite(birthYear)) return null
  const age = runYear - birthYear
  return age > 0 ? age : null
}

function getControlCode(splits: Split[]): string {
  if (splits.length < 2) return 'basic'
  const spread = getSplitSpreadRatio(splits)
  if (spread <= 0.04) return 'steady'
  if (spread <= 0.09) return 'mixed'
  return 'spiky'
}

function getControlDetail(splits: Split[]): string {
  if (splits.length < 2) return 'Add split data for pacing control'
  const spread = getSplitSpreadRatio(splits)
  if (spread <= 0.04) return 'Splits stayed tightly grouped'
  if (spread <= 0.09) return 'Splits moved, but stayed readable'
  return 'Split spread is wide enough to review pacing'
}

function getControlSeverity(splits: Split[]): RunInsightStat['severity'] {
  if (splits.length < 2) return 'neutral'
  const spread = getSplitSpreadRatio(splits)
  if (spread <= 0.04) return 'positive'
  if (spread <= 0.09) return 'neutral'
  return 'warning'
}

function getSplitSpreadRatio(splits: Split[]): number {
  const paces = splits.map((split) => split.paceSecondsPerKm)
  const avg = averageNullable(paces) ?? 0
  if (avg <= 0) return 0
  return (Math.max(...paces) - Math.min(...paces)) / avg
}

function getTrustCode(input: BuildRunInsightInput): string {
  const flags = normalizeFlags(input.integrityFlags)
  if (flags.length > 0) return 'review'
  if (input.routeQuality?.status === 'limited') return 'limited'
  if (input.routeQuality?.status === 'review') return 'review'
  if (input.source === 'gps_live' && (input.pathPointCount ?? 0) >= 10) return 'gps'
  if (input.source === 'healthkit' || input.source === 'health_connect' || input.source === 'garmin') return 'sync'
  return 'manual'
}

function getTrustDetail(input: BuildRunInsightInput): string {
  const flags = normalizeFlags(input.integrityFlags)
  if (flags.length > 0) return `${flags.length} signal${flags.length === 1 ? '' : 's'} need review`
  if (input.routeQuality?.status !== 'good' && input.routeQuality?.message) return input.routeQuality.message
  if (input.source === 'gps_live' && (input.pathPointCount ?? 0) >= 10) return 'Phone GPS route can support verification'
  if (input.source === 'healthkit' || input.source === 'health_connect' || input.source === 'garmin') {
    return `${sourceLabelFor(input.source)} import reduces manual entry`
  }
  return 'Manual logs work, but sensor data improves trust'
}

function getTrustSeverity(input: BuildRunInsightInput): RunInsightStat['severity'] {
  const flags = normalizeFlags(input.integrityFlags)
  if (flags.length > 0) return 'warning'
  if (input.routeQuality?.status === 'limited') return 'warning'
  if (input.routeQuality?.status === 'review') return 'neutral'
  if (input.source === 'manual') return 'neutral'
  return 'positive'
}

function sourceLabelFor(source: BuildRunInsightInput['source']): string {
  switch (source) {
    case 'gps_live':
      return 'Rally phone GPS'
    case 'healthkit':
      return 'HealthKit'
    case 'health_connect':
      return 'Health Connect'
    case 'garmin':
      return 'Garmin'
    case 'manual':
    default:
      return 'Manual'
  }
}

function normalizeFlags(flags: unknown[] | undefined): string[] {
  return (flags ?? []).filter((flag): flag is string => typeof flag === 'string' && flag.length > 0)
}

function formatDistance(distanceMeters: number): string {
  return `${(distanceMeters / 1000).toFixed(distanceMeters >= 10_000 ? 1 : 2)} km`
}

function formatDuration(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.round(seconds))
  const hours = Math.floor(wholeSeconds / 3600)
  const minutes = Math.floor((wholeSeconds % 3600) / 60)
  const secs = wholeSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

function formatPace(secondsPerKm: number): string {
  const pace = Math.max(0, Math.round(secondsPerKm))
  const minutes = Math.floor(pace / 60)
  const seconds = pace % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}/km`
}

function formatPaceDelta(deltaSecondsPerKm: number): string {
  const rounded = Math.round(deltaSecondsPerKm)
  const sign = rounded <= 0 ? '-' : '+'
  const absolute = Math.abs(rounded)
  const minutes = Math.floor(absolute / 60)
  const seconds = absolute % 60
  return `${sign}${minutes}:${String(seconds).padStart(2, '0')}/km`
}
