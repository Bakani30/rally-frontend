export type ReportReason =
  | 'harassment'
  | 'impersonation'
  | 'cheating'
  | 'spam'
  | 'inappropriate_content'
  | 'underage'
  | 'other'

export type ReportUserInput = {
  reportedUserId: string
  reason: ReportReason
  note?: string | null
  evidencePaths?: string[]
}

export type ReportUserResult = {
  reportId: string
}

export type BlockAction = 'block' | 'unblock'

export type BlockUserInput = {
  targetUserId: string
  action: BlockAction
}

export type BlockUserResult = {
  targetUserId: string
  action: BlockAction
}

export type BlockedUser = {
  blockedId: string
  displayName: string | null
  handle: string | null
  avatarUrl: string | null
  blockedAt: string
}
