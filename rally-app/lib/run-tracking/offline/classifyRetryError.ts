import {
  extractRunSubmitErrorCode,
  isKnownRunSubmitErrorCode,
} from '../session/runSubmitErrorMessages'

/**
 * Retry-queue dead-letter policy. Pure module — MUST stay free of
 * react/react-native/expo imports.
 *
 * This is the SINGLE source of truth for whether a failed submit should keep
 * retrying (transient) or be dead-lettered (permanent). It deliberately does
 * NOT use the copy map's `retryable` flag: that flag means "could succeed
 * after an app/version fix", NOT "retrying the same payload will succeed".
 * Codes like `hash_mismatch` / `path_too_dense` are `retryable: true` yet the
 * identical payload fails forever — under a naive retryable-based loop they
 * would never dead-letter. Classification here is payload-oriented:
 *
 *   (a) no code (network / transport / 5xx without a body) → transient
 *   (b) `internal_error` (server-side gap, may recover)     → transient
 *   (c) rate-limit / auth codes that clear out of band      → transient
 *   (d) ANY other known validation/rejection code           → permanent (code)
 *   (e) present-but-unknown code                            → transient
 *
 * (e) is intentional: a code we do not recognize should not be dead-lettered
 * on sight — it retries until the attempt cap (owned by the queue) instead.
 * Some server rejections currently flatten to `internal_error` (fixed in a
 * later task); those retry as transient until the cap, which is acceptable.
 */

export type RetryErrorClassification =
  | { kind: 'transient' }
  | { kind: 'permanent'; code: string }

/**
 * Known codes whose SAME-payload retry can succeed without an app fix:
 * the rate window passes, the server recovers, or the auth token refreshes.
 */
const TRANSIENT_KNOWN_CODES = new Set<string>([
  'rate_limited',
  'internal_error',
  'unauthorized',
])

export function classifyRetryError(error: unknown): RetryErrorClassification {
  const code = extractRunSubmitErrorCode(error)
  if (!code) return { kind: 'transient' }
  if (TRANSIENT_KNOWN_CODES.has(code)) return { kind: 'transient' }
  if (isKnownRunSubmitErrorCode(code)) return { kind: 'permanent', code }
  return { kind: 'transient' }
}
