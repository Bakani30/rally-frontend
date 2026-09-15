import type { ArenaMapPinDetail, ArenaMapPinSummary } from '@/types/arenaMap'

export const ARENA_MAP_PREVIEW_SCENARIOS = ['live', 'idle', 'expiring', 'stale', 'error'] as const
export type ArenaMapPreviewScenario = (typeof ARENA_MAP_PREVIEW_SCENARIOS)[number]

export function nextArenaMapPreviewTheme(theme: 'light' | 'dark') {
  return theme === 'light' ? 'dark' : 'light'
}

export function parseArenaMapPreviewTheme(value: string | string[] | undefined): 'light' | 'dark' | null {
  const candidate = Array.isArray(value) ? value[0] : value
  return candidate === 'light' || candidate === 'dark' ? candidate : null
}

type ArenaMapPreviewFixture = {
  label: string
  pins: ArenaMapPinSummary[]
  selectedPinId: string
  detail: ArenaMapPinDetail | null
  isStale: boolean
  hasBlockingError: boolean
}

const OFFICIAL_ID = 'venue:11111111-1111-4111-8111-111111111111'
const COMMUNITY_ID = 'venue:22222222-2222-4222-8222-222222222222'
const AD_HOC_ID = 'session:33333333-3333-4333-8333-333333333333'
const OFFICIAL_VENUE_ID = '11111111-1111-4111-8111-111111111111'
const COMMUNITY_VENUE_ID = '22222222-2222-4222-8222-222222222222'

const identities = {
  official: {
    label: 'Bangkok Ballers',
    partyAvatarUrl: null,
    hostAvatarUrl: null,
    initials: 'BB',
    affiliation: null,
  },
  community: {
    label: 'Ari Hoop Club',
    partyAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128',
    hostAvatarUrl: null,
    initials: 'AH',
    affiliation: null,
  },
  adHoc: {
    label: 'Keng Ari',
    partyAvatarUrl: null,
    hostAvatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128',
    initials: 'KA',
    affiliation: null,
  },
} as const

const basePins: ArenaMapPinSummary[] = [
  {
    id: OFFICIAL_ID,
    type: 'official_venue',
    coordinate: { latitude: 13.7791, longitude: 100.5448 },
    publicIdentity: identities.official,
    venueId: OFFICIAL_VENUE_ID,
    sessionId: null,
    isFavorite: false,
  },
  {
    id: COMMUNITY_ID,
    type: 'community_venue',
    coordinate: { latitude: 13.7757, longitude: 100.5401 },
    publicIdentity: identities.community,
    venueId: COMMUNITY_VENUE_ID,
    sessionId: null,
    isFavorite: true,
  },
  {
    id: AD_HOC_ID,
    type: 'ad_hoc_arena',
    coordinate: { latitude: 13.7738, longitude: 100.5485 },
    publicIdentity: identities.adHoc,
    venueId: null,
    sessionId: '33333333-3333-4333-8333-333333333333',
    isFavorite: false,
  },
]

const liveDetail: ArenaMapPinDetail = {
  id: OFFICIAL_ID,
  name: 'Rally Court Ari',
  type: 'official_venue',
  format: '3v3',
  venueId: OFFICIAL_VENUE_ID,
  isFavorite: false,
  ownerOrHost: identities.official,
  liveScore: { homeLabel: 'ARI BALLERS', homeScore: 12, awayLabel: 'RAMA V', awayScore: 9 },
  queuePreview: { teams: ['Siam Heat', 'BKK North'], remainingCount: 2 },
  deadline: null,
  additionalSessionCount: 1,
  sessionNavigationOptions: [
    { sessionId: 'session:44444444-4444-4444-8444-444444444444', label: '3v3 · กำลังแข่ง' },
    { sessionId: 'session:55555555-5555-4555-8555-555555555555', label: '3v3 · คิวถัดไป' },
  ],
  serverTime: '2026-08-25T10:00:00.000Z',
  updatedAt: '2026-08-25T09:59:48.000Z',
}

const idleDetail: ArenaMapPinDetail = {
  id: COMMUNITY_ID,
  name: 'Ari Community Court',
  type: 'community_venue',
  format: '5v5',
  venueId: COMMUNITY_VENUE_ID,
  isFavorite: true,
  ownerOrHost: identities.community,
  liveScore: null,
  queuePreview: { teams: [], remainingCount: 0 },
  deadline: null,
  additionalSessionCount: 0,
  sessionNavigationOptions: [],
  serverTime: '2026-08-25T10:00:00.000Z',
  updatedAt: '2026-08-25T09:59:55.000Z',
}

const expiringDetail: ArenaMapPinDetail = {
  id: AD_HOC_ID,
  name: 'Pickup 3v3 หลังสวน',
  type: 'ad_hoc_arena',
  format: '3v3',
  venueId: null,
  isFavorite: false,
  ownerOrHost: identities.adHoc,
  liveScore: { homeLabel: 'KENG CREW', homeScore: 8, awayLabel: 'ARI WEST', awayScore: 7 },
  queuePreview: { teams: ['Victory Five'], remainingCount: 0 },
  deadline: { kind: 'drain', at: '2026-08-25T10:07:00.000Z' },
  additionalSessionCount: 0,
  sessionNavigationOptions: [],
  serverTime: '2026-08-25T10:00:00.000Z',
  updatedAt: '2026-08-25T09:59:42.000Z',
}

const staleDetail: ArenaMapPinDetail = {
  ...liveDetail,
  updatedAt: '2026-08-25T09:54:00.000Z',
}

const fixtureByScenario: Record<ArenaMapPreviewScenario, Omit<ArenaMapPreviewFixture, 'pins'>> = {
  live: { label: 'กำลังแข่ง', selectedPinId: OFFICIAL_ID, detail: liveDetail, isStale: false, hasBlockingError: false },
  idle: { label: 'สนามว่าง', selectedPinId: COMMUNITY_ID, detail: idleDetail, isStale: false, hasBlockingError: false },
  expiring: { label: 'ใกล้หมดเวลา', selectedPinId: AD_HOC_ID, detail: expiringDetail, isStale: false, hasBlockingError: false },
  stale: { label: 'ข้อมูลยังไม่ล่าสุด', selectedPinId: OFFICIAL_ID, detail: staleDetail, isStale: true, hasBlockingError: false },
  error: { label: 'โหลดไม่สำเร็จ', selectedPinId: OFFICIAL_ID, detail: null, isStale: false, hasBlockingError: true },
}

export function canUseArenaMapPreview(isDevelopment: boolean) {
  return isDevelopment
}

export function parseArenaMapPreviewScenario(value: string | string[] | undefined): ArenaMapPreviewScenario {
  const candidate = Array.isArray(value) ? value[0] : value
  return ARENA_MAP_PREVIEW_SCENARIOS.includes(candidate as ArenaMapPreviewScenario)
    ? candidate as ArenaMapPreviewScenario
    : 'live'
}

export function arenaMapPreviewScenarioForPin(pinId: string): ArenaMapPreviewScenario | null {
  if (pinId === OFFICIAL_ID) return 'live'
  if (pinId === COMMUNITY_ID) return 'idle'
  if (pinId === AD_HOC_ID) return 'expiring'
  return null
}

export function getArenaMapPreviewFixture(scenario: ArenaMapPreviewScenario): ArenaMapPreviewFixture {
  const selected = fixtureByScenario[scenario]
  return {
    ...selected,
    pins: basePins.map((pin) => ({
      ...pin,
      isFavorite: pin.venueId === selected.detail?.venueId ? selected.detail.isFavorite : pin.isFavorite,
    })),
  }
}
