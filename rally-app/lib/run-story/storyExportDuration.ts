// Pure duration math for exporting a video-background run-story card
// (useRunStoryVideoExport). The on-screen recorder must run at least long
// enough to capture one loop, but never long enough to feel like a
// stalled export — so the source clip's own duration (when known) is
// clamped into [MIN, MAX]; an unknown duration falls back to a safe default.

export const MIN_STORY_EXPORT_DURATION_MS = 3_000
export const MAX_STORY_EXPORT_DURATION_MS = 15_000
const DEFAULT_STORY_EXPORT_DURATION_MS = 6_000

/**
 * Clamps the on-screen recording duration used to export a video-background
 * story card. `sourceDurationSeconds` is the background clip's own duration
 * once the player has loaded it (expo-video `player.duration`); pass `null`
 * before it's known and this returns the safe default loop length.
 */
export function clampStoryExportDurationMs(sourceDurationSeconds: number | null): number {
  if (sourceDurationSeconds == null || !Number.isFinite(sourceDurationSeconds) || sourceDurationSeconds <= 0) {
    return DEFAULT_STORY_EXPORT_DURATION_MS
  }
  const sourceMs = sourceDurationSeconds * 1000
  return Math.min(MAX_STORY_EXPORT_DURATION_MS, Math.max(MIN_STORY_EXPORT_DURATION_MS, sourceMs))
}
