// Ranking-screen theme palette derived from the Rally Arcade Arena handoff.
// Points use amber as value, while fight panels carry scoreboard trust.
// Pure data — no React, no Platform-specific styles.

import { RallyPalette, SportDark, SportLight } from '@/constants/theme'

export type RankingMode = 'light' | 'dark'

export type PodiumPalette = {
  card: string
  ink: string
  shadow: string
}

export type RankingTheme = {
  mode: RankingMode
  accent: string

  bg: string
  ink: string
  inkSoft: string
  muted: string

  trophyBg: string
  trophyIcon: string

  tabBg: string
  tabBorderInactive: string
  tabTextInactive: string
  tabIconInactive: string
  tabActiveBg: (color: string) => string
  tabActiveBorder: (color: string) => string
  tabActiveText: (color: string) => string

  podium: Record<1 | 2 | 3, PodiumPalette>
  podiumCrown: string
  podiumAvatarBg: string
  podiumAvatarBorder: string
  podiumAvatarLetter: string

  rowBg: string
  rowBorder: string
  rowYouBg: string
  rowYouBorder: string
  rowYouShadow: string

  rankChipBg: string
  rankChipText: string
  rankChipPodiumBg: (color: string) => string
  rankChipPodiumText: string

  ratingBoxBg: string
  ratingBoxBorder: string
  ratingText: string

  youBadgeBg: string
  youBadgeText: string

  deltaUp: string
  deltaDown: string
}

const PODIUM_LIGHT: Record<1 | 2 | 3, PodiumPalette> = {
  1: { card: RallyPalette.amber, ink: RallyPalette.brown, shadow: 'rgba(234,195,26,0.42)' },
  2: { card: '#eceef2', ink: RallyPalette.brown, shadow: 'rgba(22,22,22,0.14)' },
  3: { card: '#f0b178', ink: RallyPalette.brown, shadow: 'rgba(235,119,60,0.32)' },
}

const PODIUM_DARK: Record<1 | 2 | 3, PodiumPalette> = {
  1: { card: RallyPalette.amber, ink: RallyPalette.brown, shadow: 'rgba(234,195,26,0.5)' },
  2: { card: RallyPalette.blue, ink: SportDark.chalk, shadow: 'rgba(128,139,195,0.44)' },
  3: { card: RallyPalette.orange, ink: SportDark.chalk, shadow: 'rgba(235,119,60,0.42)' },
}

export function buildRankingTheme(mode: RankingMode, accent: string): RankingTheme {
  if (mode === 'light') {
    return {
      mode,
      accent,

      bg: '#fbfaf7',
      ink: SportLight.ink,
      inkSoft: SportLight.inkSoft,
      muted: SportLight.muted,

      trophyBg: SportLight.arcadeCabinet,
      trophyIcon: SportLight.amber,

      tabBg: SportLight.bgElevated,
      tabBorderInactive: SportLight.line,
      tabTextInactive: SportLight.ink,
      tabIconInactive: SportLight.muted,
      tabActiveBg: (c) => (c === RallyPalette.amber ? c : `${c}18`),
      tabActiveBorder: (c) => c,
      tabActiveText: () => SportLight.ink,

      podium: PODIUM_LIGHT,
      podiumCrown: SportLight.amber,
      podiumAvatarBg: SportLight.bgElevated,
      podiumAvatarBorder: SportLight.chalk,
      podiumAvatarLetter: SportLight.ink,

      rowBg: SportLight.bgElevated,
      rowBorder: SportLight.line,
      rowYouBg: '#fff4d6',
      rowYouBorder: RallyPalette.amber,
      rowYouShadow: 'rgba(234,195,26,0.34)',

      rankChipBg: '#f0f0f2',
      rankChipText: SportLight.ink,
      rankChipPodiumBg: (c) => c,
      rankChipPodiumText: SportLight.ink,

      ratingBoxBg: SportLight.arcadeCabinet,
      ratingBoxBorder: SportLight.arcadeCabinet,
      ratingText: SportLight.chalk,

      youBadgeBg: accent,
      youBadgeText: SportLight.chalk,

      deltaUp: SportLight.green,
      deltaDown: SportLight.red,
    }
  }

  // dark / arcade arena fight board
  return {
    mode,
    accent,

    bg: SportDark.fightBg,
    ink: SportDark.fightInk,
    inkSoft: SportDark.fightInkSoft,
    muted: SportDark.fightMuted,

    trophyBg: SportDark.fightPanel,
    trophyIcon: SportDark.amber,

    tabBg: SportDark.fightPanel,
    tabBorderInactive: SportDark.line,
    tabTextInactive: SportDark.fightMuted,
    tabIconInactive: SportDark.fightMuted,
    tabActiveBg: (c) => `${c}30`,
    tabActiveBorder: (c) => c,
    tabActiveText: () => SportDark.chalk,

    podium: PODIUM_DARK,
    podiumCrown: SportDark.amber,
    podiumAvatarBg: SportDark.fightBg,
    podiumAvatarBorder: SportDark.amber,
    podiumAvatarLetter: SportDark.chalk,

    rowBg: SportDark.fightPanel,
    rowBorder: SportDark.line,
    // Your row stays the same dark panel as the rest; the accent border + YOU
    // badge + colored rank tab carry the "this is you" signal instead of a tint.
    rowYouBg: SportDark.fightPanel,
    rowYouBorder: accent,
    rowYouShadow: `${accent}55`,

    rankChipBg: 'rgba(255,255,255,0.1)',
    rankChipText: SportDark.fightInk,
    rankChipPodiumBg: (c) => c,
    rankChipPodiumText: SportDark.arcadeCtaText,

    ratingBoxBg: SportDark.fightPanel,
    ratingBoxBorder: SportDark.lineStrong,
    ratingText: SportDark.fightInk,

    youBadgeBg: accent,
    youBadgeText: SportDark.arcadeCtaText,

    deltaUp: SportDark.trust,
    deltaDown: SportDark.risk,
  }
}

export const RANK_COLOR: Record<1 | 2 | 3, string> = {
  1: RallyPalette.amber,
  2: RallyPalette.blue,
  3: RallyPalette.orange,
}
