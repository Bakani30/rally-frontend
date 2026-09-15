import { Platform } from 'react-native'

export type FitnessTrend = {
  restingHrByDay: { day: string; bpm: number }[] // 'YYYY-MM-DD' UTC, ascending, <=days entries
  spo2ByDay: { day: string; percent: number }[] // 'YYYY-MM-DD' UTC, ascending, <=days entries, 0-100
  hrvByDay: { day: string; ms: number }[] // 'YYYY-MM-DD' UTC, ascending, <=days entries
  latestVo2Max: number | null
}

const EMPTY_TREND: FitnessTrend = { restingHrByDay: [], spo2ByDay: [], hrvByDay: [], latestVo2Max: null }

export async function readFitnessTrend(days: number, now: Date): Promise<FitnessTrend> {
  if (Platform.OS === 'ios') {
    const { readIosFitnessTrend } = await import('./iosFitnessTrendSource')
    return capToMostRecentDays(await readIosFitnessTrend(days, now), days)
  }
  if (Platform.OS === 'android') {
    const { readAndroidFitnessTrend } = await import('./androidFitnessTrendSource')
    return capToMostRecentDays(await readAndroidFitnessTrend(days, now), days)
  }
  return EMPTY_TREND
}

// The rolling [now - days*24h, now] window can span days+1 UTC calendar dates;
// keep only the most recent `days` buckets (each per-day series is already ascending).
export function capToMostRecentDays(trend: FitnessTrend, days: number): FitnessTrend {
  return {
    ...trend,
    restingHrByDay: capSeries(trend.restingHrByDay, days),
    spo2ByDay: capSeries(trend.spo2ByDay, days),
    hrvByDay: capSeries(trend.hrvByDay, days),
  }
}

function capSeries<T>(series: T[], days: number): T[] {
  return series.length <= days ? series : series.slice(-days)
}

// Groups same-day samples by taking the last one (latest timestamp), UTC day boundaries.
export function groupLastPerDay(
  samples: { timestampMs: number; value: number }[],
): { day: string; value: number }[] {
  const lastByDay = new Map<string, { timestampMs: number; value: number }>()
  for (const sample of samples) {
    const day = new Date(sample.timestampMs).toISOString().slice(0, 10)
    const existing = lastByDay.get(day)
    if (!existing || sample.timestampMs > existing.timestampMs) {
      lastByDay.set(day, { timestampMs: sample.timestampMs, value: sample.value })
    }
  }
  return [...lastByDay.entries()]
    .sort(([dayA], [dayB]) => (dayA < dayB ? -1 : dayA > dayB ? 1 : 0))
    .map(([day, { value }]) => ({ day, value }))
}
