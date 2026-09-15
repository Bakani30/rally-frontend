/**
 * Unified history feed normalizer — pure merge/normalize/filter layer that
 * Task 3.2's categorized Matches screen consumes. No React/RN imports; the only
 * runtime import is the pure `isVisibleActivity` guard (SSOT for the MVP set).
 *
 * ── Dedupe spike finding (Task 3.1, Step 1) ────────────────────────────────
 * The `activity_sessions` projection in `lib/activities/shared/activitySessionSelect.ts`
 * selects NO link back to a match: there is no `match_id` / `related_match_id`
 * column, and none of the nested relations
 * (running_activity_details / team_sport_activity_details / participants / media /
 * rating_snapshots) carries a match id either. `context` is a free-form jsonb
 * blob, not a typed link, so we do not mine it.
 *   → no link field → keep both, matches take precedence by rendering first.
 * There is no field that lets us collapse a settled match against its session,
 * so both survive the merge; on a date tie the match sorts ahead of the session.
 *
 * ── `date` field choice ────────────────────────────────────────────────────
 * Match → `settled_at ?? updated_at`. `matches.settled_at` exists (migration
 * 20260101000001) and is set on every settle path, and the `listMatchesByIds`
 * fallback now selects it — and the primary RPC `list_my_matches_for_user`
 * also returns it as of migration 20260704120000, so the fallback to
 * `updated_at` now only applies to legacy/offline rows. KNOWN DRIFT of the
 * fallback: `set_match_spectators()`
 * (migration 20260619210000) UPDATEs a settled match with no status guard,
 * bumping `updated_at` — under the fallback that old settled match resurfaces
 * at the top of the feed for a reason unrelated to settlement. Resolved for
 * the RPC path once it returns `settled_at`. Sessions use `started_at` (their
 * natural occurrence time).
 */
import type { MyMatch } from '@/types/match'
import type { ActivityHistoryItem } from '@/lib/activities/history/activityHistoryTypes'
import { isVisibleActivity } from '@/lib/match/matchConfig'

export type FeedCategory = 'all' | 'running' | 'basketball' | 'badminton'

export type FeedItem = {
  /** Unique across kinds, e.g. `match:<id>` / `session:<id>`. */
  key: string
  kind: 'match' | 'session'
  activityType: string
  /** ISO timestamp used for desc sort: match → settled_at ?? updated_at, session → started_at. */
  date: string
  /** Raw source row id (without the `match:` / `session:` prefix). */
  sourceId: string
}

/** Matches sort ahead of sessions on a date tie (spike: matches render first). */
const KIND_ORDER: Record<FeedItem['kind'], number> = { match: 0, session: 1 }

function compareFeed(a: FeedItem, b: FeedItem): number {
  const ta = Date.parse(a.date)
  const tb = Date.parse(b.date)
  if (tb !== ta) return tb - ta // newest first
  return KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
}

/**
 * Normalize settled matches + recorded sessions into one desc-sorted feed.
 * Filters to settled matches and visible-MVP activity types; no dedupe (see
 * spike). `Array.prototype.sort` is stable, so a full date+kind tie preserves
 * input order.
 */
export function buildUnifiedFeed(matches: MyMatch[], sessions: ActivityHistoryItem[]): FeedItem[] {
  const items: FeedItem[] = []

  for (const m of matches) {
    if (m.status !== 'settled') continue
    if (!isVisibleActivity(m.activity_type)) continue
    items.push({
      key: `match:${m.id}`,
      kind: 'match',
      activityType: m.activity_type,
      date: m.settled_at ?? m.updated_at,
      sourceId: m.id,
    })
  }

  for (const s of sessions) {
    if (!isVisibleActivity(s.activity_type)) continue
    // Team-sport sessions always shadow a settled match already in the feed
    // (recorded stats are attached to the match), and analysis is reached via
    // the match card — rendering both reads as a duplicate. Founder call
    // 2026-07-06: only standalone sessions (running) appear here.
    if (s.activity_type === 'basketball' || s.activity_type === 'badminton') continue
    items.push({
      key: `session:${s.id}`,
      kind: 'session',
      activityType: s.activity_type,
      date: s.started_at,
      sourceId: s.id,
    })
  }

  return items.sort(compareFeed)
}

/** Pure category test shared by the feed filter and the raw lobby/live match lists. */
export function matchesCategory(activityType: string, category: FeedCategory): boolean {
  return category === 'all' || activityType === category
}

/** Filter by activity category; `'all'` returns every item unchanged. */
export function filterByCategory(items: FeedItem[], category: FeedCategory): FeedItem[] {
  if (category === 'all') return items
  return items.filter((item) => matchesCategory(item.activityType, category))
}
