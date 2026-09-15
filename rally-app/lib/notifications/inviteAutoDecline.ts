export const INVITE_AUTO_DECLINE_MS = 30_000

export function getInviteAutoDeclineDelayMs(sentAt: string, nowMs = Date.now()): number {
  const sentMs = new Date(sentAt).getTime()
  if (!Number.isFinite(sentMs)) return 0
  return Math.max(0, sentMs + INVITE_AUTO_DECLINE_MS - nowMs)
}
