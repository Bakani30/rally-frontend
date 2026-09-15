export function latestNotificationActionAt(
  candidates: Array<string | null | undefined>,
): string | null {
  let latestMs = Number.NEGATIVE_INFINITY

  for (const candidate of candidates) {
    if (!candidate) continue
    const ms = Date.parse(candidate)
    if (!Number.isFinite(ms)) continue
    latestMs = Math.max(latestMs, ms)
  }

  return Number.isFinite(latestMs) ? new Date(latestMs).toISOString() : null
}

export function hasUnreadNotificationAction(
  latestActionAt: string | null,
  openedAt: string | null,
): boolean {
  if (!latestActionAt) return false
  if (!openedAt) return true

  const latestMs = Date.parse(latestActionAt)
  const openedMs = Date.parse(openedAt)
  if (!Number.isFinite(latestMs)) return false
  if (!Number.isFinite(openedMs)) return true

  return latestMs > openedMs
}
