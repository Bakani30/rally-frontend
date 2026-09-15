import type { ArenaMapPinSummary } from '@/types/arenaMap'

export type ArenaMapStoryFixture =
  | { kind: 'runtime'; pin: ArenaMapPinSummary; selected?: boolean }
  | { kind: 'conquest'; label: string; initials: string; selected?: boolean }
  | { kind: 'cluster'; count: number; typeMix: Record<'official_venue' | 'community_venue' | 'ad_hoc_arena', number> }

const base = (type: ArenaMapPinSummary['type'], avatar: string | null, host: string | null): ArenaMapPinSummary => ({
  id: `${type === 'ad_hoc_arena' ? 'session' : 'venue'}:${type === 'official_venue' ? '11111111-1111-4111-8111-111111111111' : type === 'community_venue' ? '22222222-2222-4222-8222-222222222222' : '33333333-3333-4333-8333-333333333333'}`,
  type,
  coordinate: { latitude: 13.75, longitude: 100.5 },
  publicIdentity: { label: 'ผู้ดูแลสนาม', partyAvatarUrl: avatar, hostAvatarUrl: host, initials: 'สท', affiliation: null },
  venueId: type === 'ad_hoc_arena' ? null : '44444444-4444-4444-8444-444444444444',
  sessionId: type === 'ad_hoc_arena' ? '33333333-3333-4333-8333-333333333333' : null,
  isFavorite: false,
})

/** Deterministic development fixtures. `conquest` is presentation-only, never runtime data. */
export const arenaMapStoryFixtures: ArenaMapStoryFixture[] = [
  { kind: 'runtime', pin: base('official_venue', null, null) },
  { kind: 'runtime', pin: base('community_venue', null, 'https://example.com/host.png'), selected: true },
  { kind: 'runtime', pin: base('ad_hoc_arena', 'https://example.com/party.png', null) },
  { kind: 'conquest', label: 'แชมป์สนาม', initials: 'ชส' },
  { kind: 'cluster', count: 3, typeMix: { official_venue: 1, community_venue: 1, ad_hoc_arena: 1 } },
]

/** The only path that may render the Conquest presentation-only fixture. */
export function shouldRenderArenaMapPinStory(isDevelopment: boolean) {
  return isDevelopment
}
