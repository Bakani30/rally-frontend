import type { AnalysisProfile } from '@/lib/profile/analysisProfileTypes'
import type { WorkoutBodySamples, WorkoutWindow } from '../sources/workoutBodySamples'
import { buildBodyMetrics, mapAnalysisProfileToBodyProfile } from '../recap/bodyMetrics'
import {
  mapBodyMetricsForSubmit,
  type RunBodyMetricsSubmitPayload,
} from './runBodyMetricsSubmitMapper'

/**
 * Cap on the WHOLE body-metrics computation (HealthKit/Health Connect read +
 * analysis-profile fetch) so neither a slow platform store nor a stalled
 * network can ever hang the run submission — past this the submit proceeds
 * without bodyMetrics.
 */
export const BODY_METRICS_COMPUTE_TIMEOUT_MS = 3000

export type BuildSubmitBodyMetricsParams = {
  startedAt: Date
  endedAt: Date
  distanceMeters: number | null
  pausedDurationSeconds: number
  /** Pedometer/session step count used when the device read has no steps. */
  fallbackSteps: number | null
  deviceCalories: number | null
}

export type BuildSubmitBodyMetricsDeps = {
  readBodySamples: (window: WorkoutWindow) => Promise<WorkoutBodySamples>
  getProfile: () => Promise<AnalysisProfile | null>
  now?: () => Date
  computeTimeoutMs?: number
}

/**
 * Best-effort body-summary computation at submit time (HR zones, intensity,
 * cadence) for the optional `bodyMetrics` field of `submit-run-session`.
 *
 * Guards (binding, mirrors the server's reject-nothing philosophy):
 * - The WHOLE computation is try/caught — any error (device read, profile
 *   fetch, math) resolves to `undefined` and the submission proceeds without
 *   body metrics. Display-only data must never block run evidence.
 * - The ENTIRE computation (device read + profile fetch) is raced against a
 *   single ~3s timeout so submit latency is strictly bounded — neither
 *   HealthKit/Health Connect nor a stalled profile fetch can hang it.
 *
 * Pure orchestration seam: both readers are injected so tests need no
 * react-native/supabase; production wiring lives in
 * {@link file://./computeSubmitBodyMetrics.ts}.
 */
export async function buildSubmitBodyMetrics(
  params: BuildSubmitBodyMetricsParams,
  deps: BuildSubmitBodyMetricsDeps,
): Promise<RunBodyMetricsSubmitPayload | undefined> {
  try {
    const timeoutMs = deps.computeTimeoutMs ?? BODY_METRICS_COMPUTE_TIMEOUT_MS
    const [samples, profile] = await withTimeout(
      Promise.all([
        deps.readBodySamples({ start: params.startedAt, end: params.endedAt }),
        deps.getProfile(),
      ]),
      timeoutMs,
    )

    const movingTimeSeconds = Math.max(
      0,
      Math.round((params.endedAt.getTime() - params.startedAt.getTime()) / 1000) -
        params.pausedDurationSeconds,
    )
    const paceSecondsPerKm =
      params.distanceMeters != null && params.distanceMeters > 0 && movingTimeSeconds > 0
        ? Math.round(movingTimeSeconds / (params.distanceMeters / 1000))
        : null

    const viewModel = buildBodyMetrics({
      movingTimeSeconds,
      distanceMeters: params.distanceMeters,
      paceSecondsPerKm,
      steps: samples.steps ?? params.fallbackSteps,
      hrSamples: samples.hrSamples,
      deviceCalories: params.deviceCalories,
      profile: mapAnalysisProfileToBodyProfile(profile),
      now: deps.now?.() ?? new Date(),
    })
    return mapBodyMetricsForSubmit(viewModel)
  } catch (err) {
    console.warn('[run-tracking] submit body metrics skipped (non-fatal)', err)
    return undefined
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`body metrics computation timed out after ${timeoutMs}ms`)),
      timeoutMs,
    )
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer)
  }) as Promise<T>
}
