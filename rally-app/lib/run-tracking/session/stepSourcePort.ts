/**
 * Port interface for the optional pedometer step source. Mirrors the shape of
 * the Wear-OS heart-rate integration (avgHeartRate / withWearMetrics): the
 * service starts/stops the source alongside the GPS tracker, and the value is
 * read once at submit time via the factory's withStepMetrics wrapper.
 *
 * No imports from react-native, expo-*, or supabase. Types only.
 */
export interface StepSourcePort {
  start(startedAt: number): Promise<void>
  stop(): Promise<void>
  /**
   * Total steps for the session, or null if unavailable/denied/no-module.
   *
   * Pause handling (v1): on Android, `watchStepCount` keeps counting while the
   * run is paused — there is no OS-level pause signal for the step sensor, so
   * steps taken during a pause are still folded into the total. The
   * `clampStepsForDistance` sanity check is the backstop against a grossly
   * inflated count from an extended pause.
   */
  read(endedAt: number): Promise<number | null>
}
