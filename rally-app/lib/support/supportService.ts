import { callCreateSupportTicket } from './supportRepository'
import type { CreateSupportTicketInput, CreateSupportTicketResult } from './supportTypes'

export function createSupportTicket(
  input: CreateSupportTicketInput,
): Promise<CreateSupportTicketResult> {
  return callCreateSupportTicket({
    ...input,
    subject: input.subject.trim(),
    note: input.note?.trim() || null,
    screen: input.screen?.trim() || null,
    appVersion: input.appVersion?.trim() || null,
    platform: input.platform?.trim() || null,
    deviceModel: input.deviceModel?.trim() || null,
    contactEmail: input.contactEmail?.trim() || null,
    context: input.context ?? {},
  })
}
