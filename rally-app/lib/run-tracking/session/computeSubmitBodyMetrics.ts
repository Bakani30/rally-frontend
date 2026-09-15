import { getUserAnalysisProfile } from '@/lib/profile/analysisProfileService'
import { readWorkoutBodySamples } from '../sources/workoutBodySamples'
import {
  buildSubmitBodyMetrics,
  type BuildSubmitBodyMetricsParams,
} from './submitBodyMetrics'
import type { RunBodyMetricsSubmitPayload } from './runBodyMetricsSubmitMapper'

/**
 * Production wiring for {@link buildSubmitBodyMetrics}: HealthKit/Health
 * Connect via `readWorkoutBodySamples` + analysis profile via the profile
 * service. Shared by the live GPS submit path (runSessionServiceFactory's
 * makeSubmitDeps) and the health-import path (healthImportService), so both
 * compute body metrics identically right before invoking `submit-run-session`.
 *
 * Inherits the seam's guards: best-effort (resolves `undefined` on any
 * error) and a single ~3s cap on the whole computation (device read +
 * profile fetch).
 */
export function computeSubmitBodyMetrics(
  params: BuildSubmitBodyMetricsParams,
): Promise<RunBodyMetricsSubmitPayload | undefined> {
  return buildSubmitBodyMetrics(params, {
    readBodySamples: readWorkoutBodySamples,
    getProfile: getUserAnalysisProfile,
  })
}
