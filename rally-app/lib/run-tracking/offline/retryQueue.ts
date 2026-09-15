import {
  countPendingUpload,
  incrementSessionAttempt,
  listPendingUpload,
  markFailed,
  markUploaded,
} from './sessionBuffer'
import { classifyRetryError } from './classifyRetryError'
import { extractRunSubmitErrorCode } from '../session/runSubmitErrorMessages'

/**
 * Retry queue for sessions whose initial submit failed (network error,
 * 5xx, app killed before response). The runner is idempotent: same
 * (userId, source, externalWorkoutId) submitted twice yields
 * `alreadyExists: true` from the server, which we treat as success.
 *
 * Dead-letter policy (see classifyRetryError): a permanent rejection moves the
 * row straight to 'failed'; a transient failure bumps `attempts` and, once it
 * reaches MAX_RETRY_ATTEMPTS, is also dead-lettered. 'failed' rows leave the
 * 'stopped' pool that listPendingUpload/countPendingUpload read, so a run that
 * can never succeed can no longer starve fresh runs. Dead-lettering is reported
 * via `onDeadLetter` so the caller (hook) can fire analytics without this pure
 * module importing React/analytics.
 *
 * Lifecycle triggers live in `hooks/useRunSessionRetryQueue.ts`; this module
 * stays as the pure queue walker so tests can exercise retry behavior without
 * app lifecycle plumbing.
 */

export type RetryRunner = (sessionId: string) => Promise<RetrySessionOutcome>

export type RetrySessionOutcome =
  | { kind: 'uploaded' }
  | { kind: 'already_uploaded' }
  | { kind: 'transient_failure'; error: unknown }
  | { kind: 'permanent_failure'; error: unknown }

export type RetryRunResult = {
  attempted: number
  uploaded: number
  deadLettered: number
  remainingPending: number
}

export type RetryQueueOptions = {
  maxAttemptsPerRun?: number
  /**
   * Session id to skip: the run currently held in memory (e.g. sitting on the
   * post-stop summary). Excluding it stops the retry pass from uploading a run
   * out from under the user before they submit or discard it.
   */
  excludeSessionId?: string | null
  /**
   * Called once per dead-lettered run (permanent rejection or attempt-cap) with
   * the rejection code. Lets the caller fire `run_sync_dead_letter` analytics
   * without this pure module depending on the analytics layer. No UUIDs.
   */
  onDeadLetter?: (code: string) => void
}

export const DEFAULT_RETRY_ATTEMPT_LIMIT = 3

/**
 * Total transient attempts a single run gets before it is dead-lettered. A run
 * that has failed transiently this many times is almost certainly not going to
 * succeed on the same payload, so parking it protects the pending pool.
 */
export const MAX_RETRY_ATTEMPTS = 5

/** Fallback dead-letter code when a run hits the attempt cap with no coded error. */
const MAX_RETRIES_CODE = 'max_retries'

/**
 * Walk a bounded batch of pending sessions and run `submitFn` for each.
 * Successful and already-uploaded sessions are marked uploaded locally.
 * Transient failures stop the pass so reconnect/timer storms do not keep
 * hammering a busy server. Permanent failures (validation rejection) stay
 * pending, but the pass keeps moving so one bad row does not block good runs.
 */
export async function runRetryQueue(
  submitFn: RetryRunner,
  options: RetryQueueOptions = {},
): Promise<RetryRunResult> {
  const pendingCount = await countPendingUpload()
  const maxAttempts = normalizeAttemptLimit(options.maxAttemptsPerRun)
  if (pendingCount === 0 || maxAttempts === 0) {
    return { attempted: 0, uploaded: 0, deadLettered: 0, remainingPending: pendingCount }
  }

  const pending = options.excludeSessionId
    ? await listPendingUpload(maxAttempts, options.excludeSessionId)
    : await listPendingUpload(maxAttempts)
  let attempted = 0
  let uploaded = 0
  let deadLettered = 0
  for (const session of pending) {
    attempted++
    const outcome = await submitFn(session.sessionId)
    if (outcome.kind === 'uploaded' || outcome.kind === 'already_uploaded') {
      await markUploaded(session.sessionId)
      uploaded++
      continue
    }

    const error = 'error' in outcome ? outcome.error : undefined
    const classification = classifyRetryError(error)
    if (classification.kind === 'permanent') {
      await markFailed(session.sessionId, classification.code)
      options.onDeadLetter?.(classification.code)
      deadLettered++
      // Keep the pass moving so one bad row does not block good runs.
      continue
    }

    // Transient: bump the attempt counter, and dead-letter once it hits the cap
    // so a permanently-flaky run can't sit in the pending pool forever.
    const lastErrorCode = extractRunSubmitErrorCode(error)
    await incrementSessionAttempt(session.sessionId, lastErrorCode)
    if (session.attempts + 1 >= MAX_RETRY_ATTEMPTS) {
      const code = lastErrorCode ?? MAX_RETRIES_CODE
      await markFailed(session.sessionId, code)
      options.onDeadLetter?.(code)
      deadLettered++
      continue
    }
    // A live transient failure (network / busy server): stop the pass so
    // reconnect/timer storms do not keep hammering.
    break
  }
  return {
    attempted,
    uploaded,
    deadLettered,
    remainingPending: Math.max(0, pendingCount - uploaded - deadLettered),
  }
}

function normalizeAttemptLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_RETRY_ATTEMPT_LIMIT
  if (!Number.isFinite(limit)) return DEFAULT_RETRY_ATTEMPT_LIMIT
  return Math.max(0, Math.floor(limit))
}
