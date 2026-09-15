import { useQuery } from '@tanstack/react-query'

import { useAnalytics } from '@/hooks/useAnalytics'
import { useAnalysisProfile } from '@/hooks/useAnalysisProfile'
import { useAuthStore } from '@/stores/authStore'
import type { HrSample } from '@/lib/health/profileMetrics'
import { readWorkoutBodySamples } from '@/lib/run-tracking/sources/workoutBodySamples'
import {
  buildBodyMetrics,
  mapAnalysisProfileToBodyProfile,
  type BodyMetricsViewModel,
} from '@/lib/run-tracking/recap/bodyMetrics'

// Profile→BodyProfile mapping moved to lib/run-tracking/recap/bodyMetrics.ts
// so the non-React submit path (submitBodyMetrics.ts) can reuse it; re-exported
// here to keep the existing hook-level import surface stable.
export {
  mapAnalysisProfileToBodyProfile,
  mapCompetitionCategoryToSex,
} from '@/lib/run-tracking/recap/bodyMetrics'

export function useRunBodyMetrics(params: {
  sessionId: string | undefined
  window: { start: Date; end: Date } | null
  movingTimeSeconds: number | null
  distanceMeters: number | null
  paceSecondsPerKm: number | null
  pedometerSteps: number | null
  deviceCalories: number | null
}): { data: BodyMetricsViewModel | null; isPending: boolean } {
  const {
    sessionId,
    window,
    movingTimeSeconds,
    distanceMeters,
    paceSecondsPerKm,
    pedometerSteps,
    deviceCalories,
  } = params

  const userId = useAuthStore((s) => s.user?.id)
  const profileQuery = useAnalysisProfile(userId)
  const { track } = useAnalytics()

  const query = useQuery({
    queryKey: ['run-body-metrics', sessionId],
    enabled: !!sessionId && !!window && !profileQuery.isPending,
    staleTime: Infinity,
    retry: 1,
    queryFn: async (): Promise<BodyMetricsViewModel> => {
      let hrSamples: HrSample[] = []
      let steps = pedometerSteps
      try {
        const samples = await readWorkoutBodySamples(window!)
        hrSamples = samples.hrSamples
        steps = samples.steps ?? pedometerSteps
      } catch {
        // Celebration screen must never show an error state — fall back to
        // pedometer-only data and just log that the device read failed.
        track({ name: 'run_body_metrics_failed', properties: { reason: 'no_data' } })
      }
      return buildBodyMetrics({
        movingTimeSeconds,
        distanceMeters,
        paceSecondsPerKm,
        steps,
        hrSamples,
        deviceCalories,
        profile: mapAnalysisProfileToBodyProfile(profileQuery.data),
        now: new Date(),
      })
    },
  })

  return { data: query.data ?? null, isPending: query.isPending }
}
