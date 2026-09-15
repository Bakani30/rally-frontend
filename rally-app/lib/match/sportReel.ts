import type { Activity } from './matchConfig'

export type SportReelKey =
  | Activity
  | 'volleyball'
  | 'tennis'
  | 'golf'
  | 'boxing'

export type SportReelItem = {
  key: SportReelKey
  label: string
  icon: string
  accent: string
  onAccent: string
  background: string
  screenText: string
  cardBackground: string
  cardBorder: string
  cardLabel: string
  cardText: string
  isEnabled: boolean
  activity?: Activity
}

export const LAST_SPORT_REEL_KEY = 'rally.match.lastSportReelKey'

// Accents mirror ActivityColor in constants/theme.ts (basketball orange,
// badminton teal, running lime). Backgrounds stay darker/cohesive per sport.
export const SPORT_REEL_COLORS = {
  running: '#32372d',
  runningAccent: '#d9ff4f',
  basketball: '#d96a43',
  basketballAccent: '#eb773c',
  badminton: '#1f6456',
  badmintonAccent: '#2bb3a3',
  lockedAccent: '#6f5a51',
} as const

export const LOCKED_SPORT_REEL_BACKGROUND = '#c8c4bd'
const INK = '#161616'
const CHALK = '#f9f6f0'

export const SPORT_REEL_ITEMS: SportReelItem[] = [
  {
    key: 'running',
    label: 'Running',
    icon: 'run-fast',
    accent: SPORT_REEL_COLORS.runningAccent,
    onAccent: INK,
    background: SPORT_REEL_COLORS.running,
    screenText: CHALK,
    cardBackground: '#121c19',
    cardBorder: SPORT_REEL_COLORS.runningAccent,
    cardLabel: SPORT_REEL_COLORS.runningAccent,
    cardText: CHALK,
    isEnabled: true,
    activity: 'running',
  },
  {
    key: 'basketball',
    label: 'Basketball',
    icon: 'basketball',
    accent: SPORT_REEL_COLORS.basketballAccent,
    onAccent: INK,
    background: SPORT_REEL_COLORS.basketball,
    screenText: INK,
    cardBackground: '#251611',
    cardBorder: '#dc8a62',
    cardLabel: '#efb08b',
    cardText: CHALK,
    isEnabled: true,
    activity: 'basketball',
  },
  {
    key: 'badminton',
    label: 'Badminton',
    icon: 'badminton',
    accent: SPORT_REEL_COLORS.badmintonAccent,
    onAccent: INK,
    background: SPORT_REEL_COLORS.badminton,
    screenText: CHALK,
    cardBackground: '#0f3b32',
    cardBorder: SPORT_REEL_COLORS.badmintonAccent,
    cardLabel: SPORT_REEL_COLORS.badmintonAccent,
    cardText: CHALK,
    isEnabled: true,
    activity: 'badminton',
  },
  {
    key: 'volleyball',
    label: 'Volleyball',
    icon: 'volleyball',
    accent: SPORT_REEL_COLORS.lockedAccent,
    onAccent: CHALK,
    background: LOCKED_SPORT_REEL_BACKGROUND,
    screenText: INK,
    cardBackground: '#3f3d38',
    cardBorder: '#7a716b',
    cardLabel: '#b7ada6',
    cardText: CHALK,
    isEnabled: false,
  },
  {
    key: 'tennis',
    label: 'Tennis',
    icon: 'tennis',
    accent: SPORT_REEL_COLORS.lockedAccent,
    onAccent: CHALK,
    background: LOCKED_SPORT_REEL_BACKGROUND,
    screenText: INK,
    cardBackground: '#3f3d38',
    cardBorder: '#7a716b',
    cardLabel: '#b7ada6',
    cardText: CHALK,
    isEnabled: false,
  },
  {
    key: 'golf',
    label: 'Golf',
    icon: 'golf',
    accent: SPORT_REEL_COLORS.lockedAccent,
    onAccent: CHALK,
    background: LOCKED_SPORT_REEL_BACKGROUND,
    screenText: INK,
    cardBackground: '#3f3d38',
    cardBorder: '#7a716b',
    cardLabel: '#b7ada6',
    cardText: CHALK,
    isEnabled: false,
  },
  {
    key: 'boxing',
    label: 'Boxing',
    icon: 'boxing-glove',
    accent: SPORT_REEL_COLORS.lockedAccent,
    onAccent: CHALK,
    background: LOCKED_SPORT_REEL_BACKGROUND,
    screenText: INK,
    cardBackground: '#3f3d38',
    cardBorder: '#7a716b',
    cardLabel: '#b7ada6',
    cardText: CHALK,
    isEnabled: false,
  },
]

const SPORT_REEL_KEYS = new Set<string>(SPORT_REEL_ITEMS.map((item) => item.key))

export function isSportReelKey(value: string | null | undefined): value is SportReelKey {
  return !!value && SPORT_REEL_KEYS.has(value)
}

export function getSportReelItem(key: SportReelKey): SportReelItem {
  return SPORT_REEL_ITEMS.find((item) => item.key === key) ?? SPORT_REEL_ITEMS[0]
}

export function getNextSportReelKey(key: SportReelKey, direction: -1 | 1): SportReelKey {
  const currentIndex = SPORT_REEL_ITEMS.findIndex((item) => item.key === key)
  const safeIndex = currentIndex >= 0 ? currentIndex : 0
  const nextIndex = (safeIndex + direction + SPORT_REEL_ITEMS.length) % SPORT_REEL_ITEMS.length
  return SPORT_REEL_ITEMS[nextIndex].key
}

export function getSportReelWindow(key: SportReelKey, radius = 2): SportReelItem[] {
  const currentIndex = SPORT_REEL_ITEMS.findIndex((item) => item.key === key)
  const safeIndex = currentIndex >= 0 ? currentIndex : 0
  const size = radius * 2 + 1
  return Array.from({ length: size }, (_, index) => {
    const offset = index - radius
    const itemIndex = (safeIndex + offset + SPORT_REEL_ITEMS.length) % SPORT_REEL_ITEMS.length
    return SPORT_REEL_ITEMS[itemIndex]
  })
}

export function resolveStoredSportReelKey(value: string | null | undefined): SportReelKey {
  return isSportReelKey(value) ? value : 'running'
}
