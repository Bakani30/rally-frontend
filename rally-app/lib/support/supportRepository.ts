import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type { CreateSupportTicketInput, CreateSupportTicketResult } from './supportTypes'

export async function callCreateSupportTicket(
  input: CreateSupportTicketInput,
): Promise<CreateSupportTicketResult> {
  const { data, error } = await invokeAuthenticatedFunction<CreateSupportTicketResult>(
    'create-support-ticket',
    { body: input },
  )
  if (error) throw await extractEdgeFunctionError(error, 'Failed to create support ticket')
  if (!data?.ticketId) throw new Error('create-support-ticket returned no ticketId')
  return data
}
