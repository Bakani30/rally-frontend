import type { BodyMetricsViewModel } from '../recap/bodyMetrics'

export type RunBodyMetricsSubmitPayload = {
  avgHeartRate: number
  maxHeartRate: number
  zoneSeconds: [number, number, number, number, number]
  intensityScore: number
  cadenceSpm: number | null
}

/**
 * Maps the recap `BodyMetricsViewModel` to the `submit-run-session` wire
 * shape (mirrors the server's tolerant `bodyMetrics` schema). Returns
 * `undefined` whenever the HR-derived fields aren't available — matching the
 * server's reject-nothing philosophy, this never blocks a submission on
 * missing body data.
 *
 * Called from `buildSubmitBodyMetrics` (submitBodyMetrics.ts), which builds
 * the view model at submit time from the session window + device samples +
 * analysis profile; the recap screen's `useRunBodyMetrics` builds the same
 * view model independently for display.
 */
export function mapBodyMetricsForSubmit(
  body: BodyMetricsViewModel | null | undefined,
): RunBodyMetricsSubmitPayload | undefined {
  if (!body) return undefined
  if (body.avgBpm == null || body.maxBpm == null) return undefined
  if (!body.zoneSeconds) return undefined
  if (body.intensityScore == null) return undefined

  return {
    avgHeartRate: Math.round(body.avgBpm),
    maxHeartRate: Math.round(body.maxBpm),
    zoneSeconds: body.zoneSeconds,
    intensityScore: Math.round(body.intensityScore),
    cadenceSpm: body.cadenceSpm != null ? Math.round(body.cadenceSpm) : null,
  }
}
