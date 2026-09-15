export type AccountDeletionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'canceled'

export type AccountDeletionRequest = {
  requestId: string
  status: AccountDeletionStatus
  requestedAt: string
  scheduledFor: string
  reused: boolean
}
