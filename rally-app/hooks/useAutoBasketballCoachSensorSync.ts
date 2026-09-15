import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import { useSyncCoachSensors } from '@/hooks/useCoachActivityInsights'
import { readDeviceBasketballCourtMetrics } from '@/lib/health/basketballCourtHealthSource'
import type { CoachSensorState } from '@/lib/coach/coachTypes'

export function useAutoBasketballCoachSensorSync(input: {
  activitySessionId: string | null | undefined
  startedAt: string | null | undefined
  endedAt: string | null | undefined
  sensorState: CoachSensorState['status'] | null | undefined
  enabled?: boolean
}) {
  const mutation = useSyncCoachSensors(input.activitySessionId)
  const attemptedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!input.enabled || !input.activitySessionId) return
    if (input.sensorState !== 'needs_sync') return
    if (attemptedRef.current === input.activitySessionId) return

    const start = input.startedAt ? new Date(input.startedAt) : null
    const end = input.endedAt && start ? new Date(input.endedAt) : start ? new Date(start.getTime() + 60 * 60 * 1000) : null
    if (!start || !end || end.getTime() <= start.getTime()) return

    const playWindowMs = end.getTime() - start.getTime()
    if (playWindowMs < 5 * 60 * 1000 || playWindowMs > 4 * 60 * 60 * 1000) return
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return

    attemptedRef.current = input.activitySessionId
    let cancelled = false

    void readDeviceBasketballCourtMetrics(start, end)
      .then((metrics) => {
        if (cancelled) return
        mutation.mutate({
          activitySessionId: input.activitySessionId as string,
          playStartedAt: metrics.startedAt,
          playEndedAt: metrics.endedAt,
          source: metrics.source,
          steps: metrics.steps ?? null,
          activeCalories: metrics.activeCalories ?? null,
          avgHeartRate: metrics.avgHeartRate ?? null,
          maxHeartRate: metrics.maxHeartRate ?? null,
          restingHeartRate: metrics.restingHeartRate ?? null,
          heartRateCoverageSeconds: metrics.heartRateCoverageSeconds ?? null,
          cadenceHighSeconds: metrics.cadenceHighSeconds ?? null,
          cadenceMax: metrics.cadenceMax ?? null,
        })
      })
      .catch(() => {
        // Auto-sync is a silent upgrade path. The report keeps the explicit
        // watch-sync card so users can retry intentionally.
      })

    return () => {
      cancelled = true
    }
  }, [
    input.activitySessionId,
    input.enabled,
    input.endedAt,
    input.sensorState,
    input.startedAt,
    mutation,
  ])

  return mutation
}
