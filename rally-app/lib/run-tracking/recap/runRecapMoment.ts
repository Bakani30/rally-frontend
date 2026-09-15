import type { Split } from '@/lib/run-tracking/gps/gpsTypes'

export type RunRecapTone = 'record' | 'reward' | 'logged'
export type RunRecapPrKind = 'distance' | 'duration' | 'pace'

export type RunPrSample = {
  distanceMeters: number | null
  movingTimeSeconds: number | null
  paceSecondsPerKm: number | null
}

export type RunRecapInput = {
  distanceMeters: number | null
  movingTimeSeconds: number | null
  paceSecondsPerKm: number | null
  pointDelta: number | null
  splits: Split[]
  priorRuns: RunPrSample[]
}

export type RunRecapViewModel = {
  tone: RunRecapTone
  distanceMeters: number | null
  movingTimeSeconds: number | null
  paceSecondsPerKm: number | null
  pointDelta: number
  prs: RunRecapPrKind[]
  splitPaces: number[]
  fastestSplitIndex: number | null
}

// Pace PRs only count for runs long enough that average pace is meaningful;
// a 400m sprint should never set the "fastest" record.
const PACE_PR_MIN_DISTANCE_M = 1_000

function isNum(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function detectPrs(input: RunRecapInput): RunRecapPrKind[] {
  const prs: RunRecapPrKind[] = []
  const priors = input.priorRuns

  if (isNum(input.distanceMeters)) {
    const priorDistances = priors.map((r) => r.distanceMeters).filter(isNum)
    if (priorDistances.length > 0 && input.distanceMeters > Math.max(...priorDistances)) {
      prs.push('distance')
    }
  }

  if (isNum(input.movingTimeSeconds)) {
    const priorDurations = priors.map((r) => r.movingTimeSeconds).filter(isNum)
    if (priorDurations.length > 0 && input.movingTimeSeconds > Math.max(...priorDurations)) {
      prs.push('duration')
    }
  }

  if (isNum(input.paceSecondsPerKm) && isNum(input.distanceMeters) && input.distanceMeters >= PACE_PR_MIN_DISTANCE_M) {
    const priorPaces = priors
      .filter((r) => isNum(r.distanceMeters) && r.distanceMeters >= PACE_PR_MIN_DISTANCE_M)
      .map((r) => r.paceSecondsPerKm)
      .filter(isNum)
    if (priorPaces.length > 0 && input.paceSecondsPerKm < Math.min(...priorPaces)) {
      prs.push('pace')
    }
  }

  return prs
}

function deriveSparkline(splits: Split[]): { splitPaces: number[]; fastestSplitIndex: number | null } {
  const splitPaces = splits.map((s) => s.paceSecondsPerKm).filter(isNum)
  if (splitPaces.length < 2) return { splitPaces: [], fastestSplitIndex: null }
  let fastestSplitIndex = 0
  for (let i = 1; i < splitPaces.length; i += 1) {
    if (splitPaces[i] < splitPaces[fastestSplitIndex]) fastestSplitIndex = i
  }
  return { splitPaces, fastestSplitIndex }
}

export function buildSoloRunRecapMoment(input: RunRecapInput): RunRecapViewModel {
  const prs = detectPrs(input)
  const pointDelta = isNum(input.pointDelta) ? input.pointDelta : 0
  const tone: RunRecapTone = prs.length > 0 ? 'record' : pointDelta > 0 ? 'reward' : 'logged'
  const { splitPaces, fastestSplitIndex } = deriveSparkline(input.splits)

  return {
    tone,
    distanceMeters: input.distanceMeters,
    movingTimeSeconds: input.movingTimeSeconds,
    paceSecondsPerKm: input.paceSecondsPerKm,
    pointDelta,
    prs,
    splitPaces,
    fastestSplitIndex,
  }
}
