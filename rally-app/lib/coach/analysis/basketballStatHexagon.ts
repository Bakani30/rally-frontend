import { buildCoachReportProfileSummary } from '@/lib/coach/coachReportPresentation'
import type {
  BasketballStatLine,
  CoachBenchmarkFormat,
  GetCoachActivityInsightsResult,
} from '@/lib/coach/coachTypes'

export type RpgAxisKey = 'power' | 'vision' | 'grit' | 'guard' | 'range' | 'motor'

// What the dashed comparison line + deltas measure against.
export type StatComparison = 'average' | 'benchmark' | 'opponent'

export type StatHexAxis = {
  key: RpgAxisKey
  rpgLabel: string
  statLabel: string
  value: number | null
  score: number
  comparisonScore: number | null
  delta: number | null
  state: 'ready' | 'missing'
}

export type StatHexagon = {
  axes: StatHexAxis[]
  strongest: RpgAxisKey | null
  weakest: RpgAxisKey | null
}

const RPG_LABEL: Record<RpgAxisKey, string> = {
  power: 'POWER', vision: 'VISION', grit: 'GRIT', guard: 'GUARD', range: 'RANGE', motor: 'MOTOR',
}

// "Hitting your average" fills ~60% of the ring, leaving headroom to exceed it.
const TARGET_FILL = 60

function num(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function axisScore(current: number, reference: number | null): number {
  if (reference == null || reference <= 0) return current > 0 ? 100 : 0
  return Math.max(0, Math.min(100, Math.round((current / reference) * TARGET_FILL)))
}

function rangeKey(format: CoachBenchmarkFormat): keyof BasketballStatLine {
  return format === '3x3' ? 'twoPointersMade' : 'threePointersMade'
}

// The reference stat line the comparison polygon is drawn from.
function referenceLine(
  comparison: StatComparison,
  data: GetCoachActivityInsightsResult,
  format: CoachBenchmarkFormat,
  opponentStats: BasketballStatLine | null | undefined,
): BasketballStatLine {
  if (comparison === 'opponent') return opponentStats ?? {}
  if (comparison === 'benchmark') {
    const line: BasketballStatLine = {}
    for (const axis of buildCoachReportProfileSummary({ data, benchmarkFormat: format }).hexAxes) {
      if (axis.referenceValue != null) line[axis.key] = axis.referenceValue
    }
    return line
  }
  return data.statBaseline.averages ?? {}
}

export function buildStatHexagon(
  data: GetCoachActivityInsightsResult,
  format: CoachBenchmarkFormat,
  comparison: StatComparison = 'average',
  opponentStats: BasketballStatLine | null = null,
): StatHexagon {
  const stats = data.currentContext?.basketballStats ?? {}
  const ref = referenceLine(comparison, data, format, opponentStats)
  const rpe = num(data.currentContext?.rpe ?? null)
  const rk = rangeKey(format)

  const boxAxes: { key: RpgAxisKey; statLabel: string; current: number | null; reference: number | null }[] = [
    { key: 'power', statLabel: 'PTS', current: num(stats.points), reference: num(ref.points) },
    { key: 'vision', statLabel: 'AST', current: num(stats.assists), reference: num(ref.assists) },
    { key: 'grit', statLabel: 'REB', current: num(stats.rebounds), reference: num(ref.rebounds) },
    {
      key: 'guard',
      statLabel: 'STL+BLK',
      current: sumOrNull(num(stats.steals), num(stats.blocks)),
      reference: sumOrNull(num(ref.steals), num(ref.blocks)),
    },
    { key: 'range', statLabel: format === '3x3' ? '2PT' : '3PT', current: num(stats[rk]), reference: num(ref[rk]) },
  ]

  const axes: StatHexAxis[] = boxAxes.map((a) => ({
    key: a.key,
    rpgLabel: RPG_LABEL[a.key],
    statLabel: a.statLabel,
    value: a.current,
    score: axisScore(a.current ?? 0, a.reference),
    comparisonScore: a.reference != null ? axisScore(a.reference, a.reference) : null,
    delta: a.current != null && a.reference != null ? a.current - a.reference : null,
    state: a.current != null ? 'ready' : 'missing',
  }))

  axes.push({
    key: 'motor',
    rpgLabel: RPG_LABEL.motor,
    statLabel: 'EFFORT',
    value: rpe,
    score: rpe != null ? Math.max(0, Math.min(100, rpe * 10)) : 0,
    comparisonScore: null,
    delta: null,
    state: rpe != null ? 'ready' : 'missing',
  })

  const comparable = axes.filter((a) => a.comparisonScore != null && a.state === 'ready')
  const strongest = pickExtreme(comparable, 'max')
  const weakest = pickExtreme(comparable, 'min')

  return { axes, strongest, weakest }
}

function sumOrNull(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null
  return (a ?? 0) + (b ?? 0)
}

function pickExtreme(axes: StatHexAxis[], dir: 'max' | 'min'): RpgAxisKey | null {
  if (axes.length === 0) return null
  let best = axes[0]
  for (const a of axes) {
    const d = a.score - (a.comparisonScore as number)
    const bd = best.score - (best.comparisonScore as number)
    if (dir === 'max' ? d > bd : d < bd) best = a
  }
  return best.key
}
