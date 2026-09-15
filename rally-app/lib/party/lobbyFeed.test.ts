import { describe, expect, it } from 'vitest'
import type { MatchLobby } from '@/types/match'
import type { PartySummary } from '@/types/party'
import { buildLobbyFeed, type LobbyFeedFilter } from '@/lib/lobbyFeed'

const party = (id: string, activity: PartySummary['activity_type'], createdAt: string): PartySummary => ({
  id,
  name: id,
  activity_type: activity,
  team_size: 3,
  visibility: 'discoverable',
  status: 'forming',
  expires_at: '2026-08-03T12:00:00.000Z',
  created_at: createdAt,
  activeMemberCount: 1,
  host: null,
})

const match = (id: string, activity: string, createdAt: string): MatchLobby => ({
  id,
  created_by: 'host',
  creator_display_name: 'Host',
  creator_handle: 'host',
  activity_type: activity,
  stake: 0,
  stake_currency: 'leaderboard_point',
  deadline: '2026-08-03T13:00:00.000Z',
  team_size_per_side: 1,
  is_coop: false,
  join_mode: 'open',
  requires_entry_code: false,
  side_a_count: 1,
  side_b_count: 0,
  created_at: createdAt,
})

describe('lobbyFeed', () => {
  it('merges Party and match items newest-first with deterministic ties', () => {
    const items = buildLobbyFeed(
      [match('match-b', 'basketball', '2026-08-03T10:00:00.000Z'), match('match-a', 'basketball', '2026-08-03T10:00:00.000Z')],
      [party('party-z', 'basketball', '2026-08-03T11:00:00.000Z'), party('party-a', 'basketball', '2026-08-03T10:00:00.000Z')],
      'all',
    )

    expect(items.map((item) => `${item.kind}:${item.id}`)).toEqual([
      'party:party-z',
      'match:match-a',
      'match:match-b',
      'party:party-a',
    ])
  })

  it.each([
    ['basketball', ['match:basketball-match', 'party:basketball-party']],
    ['badminton', ['match:badminton-match', 'party:badminton-party']],
  ] as const)('filters both item kinds by sport: %s', (filter, expected) => {
    const items = buildLobbyFeed(
      [match('basketball-match', 'basketball', '2026-08-03T10:00:00.000Z'), match('badminton-match', 'badminton', '2026-08-03T09:00:00.000Z')],
      [party('basketball-party', 'basketball', '2026-08-03T08:00:00.000Z'), party('badminton-party', 'badminton', '2026-08-03T07:00:00.000Z')],
      filter as LobbyFeedFilter,
    )

    expect(items.map((item) => `${item.kind}:${item.id}`)).toEqual(expected)
  })
})
