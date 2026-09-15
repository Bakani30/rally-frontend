import type { TierEvent } from './tierEventTypes'

export type TierEventTriageResult = {
  // Queue of celebratory promotions to show as the full-screen
  // PromotionMoment: the LATEST promotion per activity (max 1 per activity),
  // sorted newest-first. Empty if there is no unseen promotion. CRITICAL
  // (spec §3.4 / Task 2 review): a demotion must NEVER end up here.
  momentQueue: TierEvent[]
  // Convenience accessor for the gate — the moment currently at the front of
  // the queue (momentQueue[0]), or null if the queue is empty.
  momentEvent: TierEvent | null
  // Every other unseen promotion (an older promotion for an activity that
  // already has a later promotion in momentQueue) — marked seen immediately,
  // no UI.
  quietSeenIds: string[]
  // Every unseen demotion — never auto-seen here; surfaced as a quiet notice
  // row in the notifications screen and marked seen on view there.
  noticeEvents: TierEvent[]
}

/**
 * Pure triage over a user's unseen tier_events (rank-identity v1, spec §3.4).
 *
 * Rule: the latest promotion PER ACTIVITY (max 1 per activity) becomes a
 * celebratory full-screen moment, queued newest-first — a user who was
 * promoted in both basketball and running sees both moments in sequence.
 * Any older promotion for an activity that already has a later promotion is
 * quietly marked seen. Demotions never trigger a moment or push — they only
 * ever appear as noticeEvents for the notifications screen.
 */
export function triageTierEvents(events: TierEvent[]): TierEventTriageResult {
  const promotions = events.filter((e) => e.direction === 'promotion')
  const demotions = events.filter((e) => e.direction === 'demotion')

  const sortedPromotions = [...promotions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const latestByActivity = new Map<TierEvent['activityType'], TierEvent>()
  const quietSeenIds: string[] = []
  for (const promo of sortedPromotions) {
    if (latestByActivity.has(promo.activityType)) {
      quietSeenIds.push(promo.id)
    } else {
      latestByActivity.set(promo.activityType, promo)
    }
  }

  const momentQueue = sortedPromotions.filter((promo) => latestByActivity.get(promo.activityType) === promo)

  return {
    momentQueue,
    momentEvent: momentQueue[0] ?? null,
    quietSeenIds,
    noticeEvents: demotions,
  }
}
