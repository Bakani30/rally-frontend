export type SupportTicketCategory =
  | 'account'
  | 'match'
  | 'wallet'
  | 'billing'
  | 'gps'
  | 'safety'
  | 'bug'
  | 'other'

export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent'

export type CreateSupportTicketInput = {
  category: SupportTicketCategory
  priority?: SupportTicketPriority
  subject: string
  note?: string | null
  screen?: string | null
  matchId?: string | null
  activitySessionId?: string | null
  appVersion?: string | null
  platform?: string | null
  deviceModel?: string | null
  contactEmail?: string | null
  context?: Record<string, unknown>
}

export type CreateSupportTicketResult = {
  ticketId: string
  status: 'open'
  createdAt: string
}
