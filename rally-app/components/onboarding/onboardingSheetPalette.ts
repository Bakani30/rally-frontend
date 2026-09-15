import { RallyPalette } from '@/constants/theme'

/**
 * Fixed-light palette for the onboarding wizard (founder feedback round 3):
 * the wizard is always white/near-black regardless of the device's system
 * theme — unlike the rest of the app, it does NOT flip with
 * `useSportTheme()`. Mirrors the earlier `fight*` (always-dark) approach,
 * just inverted to always-light. Do not import `useSportTheme()` colors for
 * wizard content — use these instead so contrast never depends on the
 * device's light/dark setting.
 */
export const SheetPalette = {
  scrim: 'rgba(0,0,0,0.45)',
  bg: '#ffffff',
  ink: '#161616',
  muted: '#6b6b6b',
  mutedSoft: '#9a9a9a',
  surface: '#f3f3f3',
  surfaceStrong: '#ececec',
  line: '#e4e4e4',
  orange: RallyPalette.orange,
  orangeSoft: 'rgba(235,119,60,0.14)',
  amber: RallyPalette.amber,
  red: RallyPalette.red,
  ctaBg: RallyPalette.brown,
  ctaText: '#ffffff',
  onOrange: '#ffffff',
} as const
