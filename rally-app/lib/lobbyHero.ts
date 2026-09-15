import type { PartySummary } from '@/types/party'

export function formatSpendablePoints(value: number | null, loading: boolean): string {
  return loading || value == null ? '—' : value.toLocaleString()
}

export type LobbyHeroPartyState =
  | { kind: 'active'; party: PartySummary }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'empty' }

export function getLobbyHeroPartyState(
  party: PartySummary | null,
  loading: boolean,
  hasError: boolean,
): LobbyHeroPartyState {
  if (party) return { kind: 'active', party }
  if (loading) return { kind: 'loading' }
  if (hasError) return { kind: 'error' }
  return { kind: 'empty' }
}
