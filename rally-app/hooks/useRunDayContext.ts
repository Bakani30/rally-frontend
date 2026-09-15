import { useQuery } from '@tanstack/react-query'

import { readDeviceDailyHealthMetrics } from '@/lib/health/dailyHealthSource'

const FIVE_MINUTES_MS = 5 * 60_000

/**
 * Percent of today's total steps that came from this run, clamped to
 * [0, 100] and rounded. Null (not 0%) when either side is missing or the
 * day total is zero — there's nothing to divide by, so "0%" would be a
 * false signal rather than an honest "unknown".
 */
export function computeStepsPercentOfDay(
  runSteps: number | null,
  dailySteps: number | null,
): number | null {
  if (runSteps == null || dailySteps == null || dailySteps <= 0) return null
  const percent = Math.round((100 * runSteps) / dailySteps)
  return Math.min(100, Math.max(0, percent))
}

/**
 * How much of today's step count this run contributed. `readDeviceDailyHealthMetrics`
 * may throw (no HealthKit/Health Connect/pedometer support) — that's not an
 * error for this card, just "no day context available".
 */
export function useRunDayContext(
  runSteps: number | null,
): { data: { stepsPercentOfDay: number | null }; isPending: boolean } {
  const query = useQuery({
    queryKey: ['run-day-context'],
    staleTime: FIVE_MINUTES_MS,
    retry: 1,
    queryFn: () => readDeviceDailyHealthMetrics().catch(() => null),
  })

  return {
    data: { stepsPercentOfDay: computeStepsPercentOfDay(runSteps, query.data?.steps ?? null) },
    isPending: query.isPending,
  }
}
