import { callRequestAccountDeletion } from './accountDeletionRepository'
import type { AccountDeletionRequest } from './accountDeletionTypes'

export function requestAccountDeletion(
  reason?: string | null,
): Promise<AccountDeletionRequest> {
  const trimmed = reason?.trim() || null
  return callRequestAccountDeletion(trimmed)
}
