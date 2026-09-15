import { callListBlockedUsers, callReportUser, callSetUserBlock } from './userSafetyRepository'
import type {
  BlockAction,
  BlockedUser,
  BlockUserResult,
  ReportReason,
  ReportUserResult,
} from './userSafetyTypes'

export function reportUser(input: {
  reportedUserId: string
  reason: ReportReason
  note?: string | null
  evidencePaths?: string[]
}): Promise<ReportUserResult> {
  // Trim note client-side so the server's NULLIF(trim(...)) doesn't get a
  // payload full of whitespace. Empty becomes null so it's stored cleanly.
  const note = input.note?.trim() || null
  return callReportUser({
    reportedUserId: input.reportedUserId,
    reason: input.reason,
    note,
    evidencePaths: input.evidencePaths,
  })
}

export function listBlockedUsers(): Promise<BlockedUser[]> {
  return callListBlockedUsers()
}

export function setUserBlock(input: {
  targetUserId: string
  action: BlockAction
}): Promise<BlockUserResult> {
  return callSetUserBlock(input)
}
