import { useMutation } from '@tanstack/react-query'
import { createSupportTicket } from '@/lib/support/supportService'
import type {
  CreateSupportTicketInput,
  CreateSupportTicketResult,
} from '@/lib/support/supportTypes'

export function useCreateSupportTicket() {
  return useMutation<CreateSupportTicketResult, Error, CreateSupportTicketInput>({
    mutationFn: (input) => createSupportTicket(input),
  })
}
