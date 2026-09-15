export type NotificationActionSummary = {
  latestActionAt: string | null
  pendingInviteCount: number
  incomingFriendRequestCount: number
  matchActionCount: number
  refereeDutyCount: number
}

export type NotificationActionSummaryRpcRow = {
  latest_action_at: string | null
  pending_invite_count: number | null
  incoming_friend_request_count: number | null
  match_action_count: number | null
  referee_duty_count?: number | null
}

export const emptyNotificationActionSummary: NotificationActionSummary = {
  latestActionAt: null,
  pendingInviteCount: 0,
  incomingFriendRequestCount: 0,
  matchActionCount: 0,
  refereeDutyCount: 0,
}

export const notificationSummaryRootQueryKey = ['notification-action-summary'] as const

export function notificationSummaryQueryKey(userId: string | undefined) {
  return [...notificationSummaryRootQueryKey, userId] as const
}

export function normalizeNotificationActionSummary(
  row: NotificationActionSummaryRpcRow | null | undefined,
): NotificationActionSummary {
  if (!row) return emptyNotificationActionSummary
  return {
    latestActionAt: validIsoOrNull(row.latest_action_at),
    pendingInviteCount: nonNegativeCount(row.pending_invite_count),
    incomingFriendRequestCount: nonNegativeCount(row.incoming_friend_request_count),
    matchActionCount: nonNegativeCount(row.match_action_count),
    refereeDutyCount: nonNegativeCount(row.referee_duty_count),
  }
}

function nonNegativeCount(value: number | null | undefined): number {
  return Number.isFinite(value) && value != null && value > 0 ? Math.floor(value) : 0
}

function validIsoOrNull(value: string | null | undefined): string | null {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null
}
