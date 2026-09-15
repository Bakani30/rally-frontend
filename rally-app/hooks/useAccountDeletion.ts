import { useMutation } from '@tanstack/react-query'
import { requestAccountDeletion } from '@/lib/auth/accountDeletionService'
import type { AccountDeletionRequest } from '@/lib/auth/accountDeletionTypes'

export function useRequestAccountDeletion() {
  return useMutation<AccountDeletionRequest, Error, string | null | undefined>({
    mutationFn: (reason) => requestAccountDeletion(reason),
  })
}
