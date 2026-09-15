import type { MatchLobby } from '@/types/match'
import type { PartySummary } from '@/types/party'

export type LobbyFeedFilter = 'all' | 'running' | 'basketball' | 'badminton'

export type LobbyFeedItem =
  | { kind: 'match'; id: string; createdAt: string; match: MatchLobby }
  | { kind: 'party'; id: string; createdAt: string; party: PartySummary }

type MatchLobbyWithCreatedAt = MatchLobby & { created_at?: string; createdAt?: string }

export function buildLobbyFeed(
  matches: MatchLobby[],
  parties: PartySummary[],
  filter: LobbyFeedFilter,
): LobbyFeedItem[] {
  const items: LobbyFeedItem[] = [
    ...matches
      .filter((match) => filter === 'all' || match.activity_type === filter)
      .map((match) => ({
        kind: 'match' as const,
        id: match.id,
        createdAt: getMatchCreatedAt(match),
        match,
      })),
    ...parties
      .filter((party) => filter === 'all' || party.activity_type === filter)
      .map((party) => ({ kind: 'party' as const, id: party.id, createdAt: party.created_at, party })),
  ]

  return items.sort(compareLobbyFeedItems)
}

function getMatchCreatedAt(match: MatchLobby): string {
  const candidate = match as MatchLobbyWithCreatedAt
  return candidate.createdAt ?? candidate.created_at ?? match.deadline
}

function compareLobbyFeedItems(left: LobbyFeedItem, right: LobbyFeedItem): number {
  const timestampDelta = safeTime(right.createdAt) - safeTime(left.createdAt)
  if (timestampDelta !== 0) return timestampDelta
  const kindDelta = (left.kind === 'match' ? 0 : 1) - (right.kind === 'match' ? 0 : 1)
  if (kindDelta !== 0) return kindDelta
  return left.id.localeCompare(right.id)
}

function safeTime(value: string): number {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}
