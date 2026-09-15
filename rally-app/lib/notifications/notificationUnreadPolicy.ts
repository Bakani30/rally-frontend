import { latestNotificationActionAt } from './notificationInboxRules'

export function getNotificationUnreadLatestActionAt(input: {
  summaryLatestActionAt: string | null
  pendingInviteSentAts: string[]
  refereeDutyActionAts?: string[]
  demotionActionAts?: string[]
}) {
  return latestNotificationActionAt([
    input.summaryLatestActionAt,
    ...input.pendingInviteSentAts,
    ...(input.refereeDutyActionAts ?? []),
    ...(input.demotionActionAts ?? []),
  ])
}
