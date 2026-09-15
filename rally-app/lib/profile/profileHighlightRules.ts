export const PROFILE_HIGHLIGHT_MAX_DURATION_SECONDS = 45

export type ProfileHighlightDurationResult =
  | { accepted: true; durationSeconds: number }
  | { accepted: false; reason: 'missing_duration' | 'too_long' }

/**
 * ImagePicker reports video duration in milliseconds. We reject clips whose
 * rounded-up duration is over the product limit instead of transcoding them.
 */
export function validateProfileHighlightDuration(
  durationMs: number | null | undefined,
): ProfileHighlightDurationResult {
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs <= 0) {
    return { accepted: false, reason: 'missing_duration' }
  }

  const durationSeconds = Math.ceil(durationMs / 1000)
  if (durationSeconds > PROFILE_HIGHLIGHT_MAX_DURATION_SECONDS) {
    return { accepted: false, reason: 'too_long' }
  }

  return { accepted: true, durationSeconds }
}
