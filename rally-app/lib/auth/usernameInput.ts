import { USERNAME_REGEX } from '@/types/username'

/**
 * Normalizes a username typed during signup. Trims surrounding whitespace but
 * PRESERVES case — Rally usernames are case-preserving (uniqueness is enforced
 * case-insensitively server-side via the `lower(handle)` unique index and the
 * `handle_new_user` trigger). Do not lowercase here, or "CTO" silently becomes
 * "cto".
 */
export function normalizeUsernameInput(raw: string): string {
  return raw.trim()
}

/** True when the trimmed username matches the shared 3–20 char A-Z a-z 0-9 _ rule. */
export function isValidUsername(raw: string): boolean {
  return USERNAME_REGEX.test(normalizeUsernameInput(raw))
}
