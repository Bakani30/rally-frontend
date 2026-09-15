/**
 * Client-side calorie ESTIMATE for team-sport recaps (display-only).
 *
 * kcal = MET × weight_kg × hours, using game-play MET values from the 2024
 * Adult Compendium of Physical Activities: basketball "game" (code 15055,
 * MET 8.0) and badminton "competitive" (code 15020, MET 7.0).
 *
 * Honest-estimate rules: duration comes from matches.started_at → the
 * earliest team result submission (closest observable proxy for play end).
 * Anything missing or a duration outside [10 min, 4 h] returns null — the
 * recap hides the row rather than showing a fabricated number. Never used
 * for points, rating, or settlement.
 */

export const MATCH_MET: Record<'basketball' | 'badminton', number> = {
  basketball: 8.0,
  badminton: 7.0,
}

const MIN_DURATION_SECONDS = 10 * 60
const MAX_DURATION_SECONDS = 4 * 3600
const MIN_WEIGHT_KG = 25
const MAX_WEIGHT_KG = 300
const MAX_CALORIES = 10_000

export function estimateMatchCalories(args: {
  activityType: string
  startedAt: string | null | undefined
  endedAt: string | null | undefined
  weightKg: number | null | undefined
}): number | null {
  const met = MATCH_MET[args.activityType as keyof typeof MATCH_MET]
  if (met == null) return null

  const { weightKg } = args
  if (weightKg == null || !Number.isFinite(weightKg)) return null
  if (weightKg < MIN_WEIGHT_KG || weightKg > MAX_WEIGHT_KG) return null

  if (!args.startedAt || !args.endedAt) return null
  const startMs = Date.parse(args.startedAt)
  const endMs = Date.parse(args.endedAt)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null

  const durationSeconds = (endMs - startMs) / 1000
  if (durationSeconds < MIN_DURATION_SECONDS || durationSeconds > MAX_DURATION_SECONDS) return null

  const calories = Math.round(met * weightKg * (durationSeconds / 3600))
  if (calories < 1) return null
  return Math.min(calories, MAX_CALORIES)
}

/** Earliest team result submission time = closest proxy for actual play end. */
export function earliestResultSubmissionAt(
  submissions: ReadonlyArray<{ created_at: string }> | null | undefined,
): string | null {
  if (!submissions || submissions.length === 0) return null
  let earliest: string | null = null
  for (const submission of submissions) {
    if (!submission.created_at) continue
    if (earliest === null || submission.created_at < earliest) {
      earliest = submission.created_at
    }
  }
  return earliest
}
