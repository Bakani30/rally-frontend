import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type { AccountDeletionRequest } from './accountDeletionTypes'

export async function callRequestAccountDeletion(
  reason: string | null,
): Promise<AccountDeletionRequest> {
  const { data, error } = await invokeAuthenticatedFunction<AccountDeletionRequest>(
    'request-account-deletion',
    { body: { reason } },
  )
  if (error) {
    throw await extractEdgeFunctionError(
      error,
      'Failed to request account deletion',
    )
  }
  if (!data) throw new Error('Empty request-account-deletion response')
  return data
}
