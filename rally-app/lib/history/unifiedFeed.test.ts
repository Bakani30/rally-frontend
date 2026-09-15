import { describe, expect, it } from 'vitest'
import type { MyMatch } from '@/types/match'
import type { ActivityHistoryItem } from '@/lib/activities/history/activityHistoryTypes'
import { buildUnifiedFeed, filterByCategory } from './unifiedFeed'

/**
 * Minimal factories — buildUnifiedFeed only reads a handful of fields, so we
 * cast partials to keep fixtures readable instead of stamping out the full
 * (very wide) row shapes.
 */
function match(over: Partial<MyMatch>): MyMatch {
  return {
    id: 'm1',
    activity_type: 'running',
    status: 'settled',
    updated_at: '2026-07-01T10:00:00.000Z',
    ...over,
  } as MyMatch
}

function session(over: Partial<ActivityHistoryItem>): ActivityHistoryItem {
  return {
    id: 's1',
    activity_type: 'running',
    started_at: '2026-07-01T10:00:00.000Z',
    ...over,
  } as ActivityHistoryItem
}

describe('buildUnifiedFeed', () => {
  it('merges matches and sessions and sorts by date desc', () => {
    const feed = buildUnifiedFeed(
      [match({ id: 'm1', updated_at: '2026-07-01T00:00:00.000Z' })],
      [
        session({ id: 's-old', started_at: '2026-06-01T00:00:00.000Z' }),
        session({ id: 's-new', started_at: '2026-07-03T00:00:00.000Z' }),
      ],
    )

    expect(feed.map((f) => f.sourceId)).toEqual(['s-new', 'm1', 's-old'])
    expect(feed.map((f) => f.key)).toEqual(['session:s-new', 'match:m1', 'session:s-old'])
  })

  it('keeps both a match and a session (no session→match link field), matches rendering first on a date tie', () => {
    // Spike reality: activity_sessions has no match_id/related_match_id in the
    // selected projection, so we cannot dedupe — both rows survive, and the
    // match wins the tie by rendering first.
    const sameDate = '2026-07-02T12:00:00.000Z'
    const feed = buildUnifiedFeed(
      [match({ id: 'm1', updated_at: sameDate })],
      [session({ id: 's1', started_at: sameDate })],
    )

    expect(feed).toHaveLength(2)
    expect(feed[0].kind).toBe('match')
    expect(feed[1].kind).toBe('session')
  })

  it('sorts a settled match by settled_at even when updated_at drifted newer (set_match_spectators bump)', () => {
    // Drift scenario: set_match_spectators() UPDATEs a settled match with no
    // status guard, bumping updated_at. The match must NOT resurface above
    // newer items — settled_at wins when present.
    const feed = buildUnifiedFeed(
      [
        match({
          id: 'm-drifted',
          settled_at: '2026-06-10T00:00:00.000Z',
          updated_at: '2026-07-04T00:00:00.000Z', // spectator bump, newer than the session
        }),
      ],
      [session({ id: 's-recent', started_at: '2026-07-01T00:00:00.000Z' })],
    )

    expect(feed.map((f) => f.sourceId)).toEqual(['s-recent', 'm-drifted'])
    expect(feed[1].date).toBe('2026-06-10T00:00:00.000Z')
  })

  it('falls back to updated_at when settled_at is absent (RPC does not return it yet)', () => {
    const feed = buildUnifiedFeed(
      [match({ id: 'm-no-settled-at', settled_at: null, updated_at: '2026-07-02T00:00:00.000Z' })],
      [],
    )

    expect(feed[0].date).toBe('2026-07-02T00:00:00.000Z')
  })

  it('excludes non-settled matches', () => {
    const feed = buildUnifiedFeed(
      [match({ id: 'm-pending', status: 'pending' }), match({ id: 'm-settled', status: 'settled' })],
      [],
    )

    expect(feed.map((f) => f.sourceId)).toEqual(['m-settled'])
  })

  it('excludes activity types outside the visible MVP set', () => {
    const feed = buildUnifiedFeed(
      [match({ id: 'm-meditation', activity_type: 'meditation' })],
      [session({ id: 's-cycling', activity_type: 'cycling' })],
    )

    expect(feed).toEqual([])
  })

  it('excludes team-sport sessions (they shadow the settled match card)', () => {
    const feed = buildUnifiedFeed(
      [match({ id: 'm-bball', activity_type: 'basketball' })],
      [
        session({ id: 's-bball', activity_type: 'basketball' }),
        session({ id: 's-bad', activity_type: 'badminton' }),
        session({ id: 's-run', activity_type: 'running' }),
      ],
    )

    expect(feed.map((f) => f.sourceId).sort()).toEqual(['m-bball', 's-run'])
  })

  it('is deterministic on a full date + kind tie (stable input order preserved)', () => {
    const sameDate = '2026-07-02T12:00:00.000Z'
    const feed = buildUnifiedFeed(
      [],
      [
        session({ id: 's-a', started_at: sameDate }),
        session({ id: 's-b', started_at: sameDate }),
      ],
    )

    expect(feed.map((f) => f.sourceId)).toEqual(['s-a', 's-b'])
  })
})

describe('filterByCategory', () => {
  const feed = buildUnifiedFeed(
    [match({ id: 'm-bball', activity_type: 'basketball', updated_at: '2026-07-03T00:00:00.000Z' })],
    [
      session({ id: 's-run', activity_type: 'running', started_at: '2026-07-02T00:00:00.000Z' }),
      session({ id: 's-bad', activity_type: 'badminton', started_at: '2026-07-01T00:00:00.000Z' }),
    ],
  )

  it("returns only running items for 'running'", () => {
    expect(filterByCategory(feed, 'running').map((f) => f.sourceId)).toEqual(['s-run'])
  })

  it("returns everything for 'all'", () => {
    expect(filterByCategory(feed, 'all')).toEqual(feed)
  })

  it("returns only basketball items for 'basketball'", () => {
    expect(filterByCategory(feed, 'basketball').map((f) => f.sourceId)).toEqual(['m-bball'])
  })
})
