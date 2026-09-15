export const RUN_SUBMIT_MIN_DISTANCE_METERS = 100

export type RunSessionSubmitBlockReason = 'distance_too_short'

export class RunSessionSubmitBlockedError extends Error {
  /**
   * Machine-readable rejection code, mirrored from `reason`. Exposed so retry
   * classifiers (`extractRunSubmitErrorCode` / `classifyRetryError`) can tell
   * this client-side permanent rejection from a code-less network failure —
   * otherwise a <100m run is retried to the attempt cap and dead-lettered under
   * the internal `max_retries` sentinel instead of `distance_too_short`.
   */
  readonly code: RunSessionSubmitBlockReason

  constructor(public readonly reason: RunSessionSubmitBlockReason) {
    super(formatRunSessionSubmitBlockMessage(reason))
    this.name = 'RunSessionSubmitBlockedError'
    this.code = reason
  }
}

export function getRunSessionSubmitBlockReason(input: {
  /** Reward distance (pause- and gap-excluded). */
  distanceMeters: number
  /**
   * Pause-INCLUSIVE existence distance ({@link runExistenceDistanceMeters}).
   * Used for the ≥100m gate so a heuristic false-pause can't block a genuine
   * run. Falls back to `distanceMeters` when the caller doesn't supply it.
   */
  existenceDistanceMeters?: number
}): RunSessionSubmitBlockReason | null {
  const existence = input.existenceDistanceMeters ?? input.distanceMeters
  if (!Number.isFinite(existence)) return 'distance_too_short'
  return existence < RUN_SUBMIT_MIN_DISTANCE_METERS ? 'distance_too_short' : null
}

const SHORT_DISTANCE_SERVER_CODES = new Set([
  'distance_too_short',
  'path_distance_too_short',
])

export function getRunSessionSubmitBlockReasonFromError(error: unknown): RunSessionSubmitBlockReason | null {
  const code = typeof (error as { code?: unknown } | null)?.code === 'string'
    ? (error as { code: string }).code
    : null
  if (code && SHORT_DISTANCE_SERVER_CODES.has(code)) return 'distance_too_short'

  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('distance_too_short') || message.includes('path_distance_too_short')) {
    return 'distance_too_short'
  }
  return null
}

export function formatRunSessionSubmitBlockMessage(reason: RunSessionSubmitBlockReason): string {
  switch (reason) {
    case 'distance_too_short':
      return 'ระยะวิ่งไม่ถึง 100 เมตร รอบนี้ส่งผลไม่ได้ ต้องออกแล้วเริ่มใหม่'
  }
}
