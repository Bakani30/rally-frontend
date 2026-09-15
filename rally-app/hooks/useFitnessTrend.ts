import { useQuery } from '@tanstack/react-query'

import { readFitnessTrend, type FitnessTrend } from '@/lib/health/fitnessTrendSource'

const FIFTEEN_MINUTES_MS = 15 * 60_000
const EMPTY_TREND: FitnessTrend = { restingHrByDay: [], spo2ByDay: [], hrvByDay: [], latestVo2Max: null }

/**
 * Rolling resting-HR / VO2max trend for the recap fitness card. Device reads
 * (HealthKit / Health Connect) can fail for many reasons — permission,
 * unsupported device, no data — none of which should surface as an error in
 * a celebration screen, so any failure collapses to an empty trend.
 */
export function useFitnessTrend(days = 7): { data: FitnessTrend | null; isPending: boolean } {
  const query = useQuery({
    queryKey: ['fitness-trend', days],
    staleTime: FIFTEEN_MINUTES_MS,
    retry: 1,
    queryFn: () => readFitnessTrend(days, new Date()).catch(() => EMPTY_TREND),
  })

  return { data: query.data ?? null, isPending: query.isPending }
}
