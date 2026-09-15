import { Platform } from 'react-native'

export type ThemeMode = 'light' | 'dark'

export const RallyPalette = {
  orange: '#eb773c',
  mint: '#ffffff',
  blue: '#808bc3',
  red: '#c73f41',
  brown: '#161616',
  // Unified semantic green: use the same vivid green for trust, positive
  // values, and verified markers across the app. Theme variants below keep
  // contrast intact on light/dark surfaces.
  green: '#0fa968',
  amber: '#eac31a',
  deepBrown: '#4d2323',
  lime: '#d9ff4f',
  teal: '#2bb3a3',
} as const

// ── Rally accent model — the app's color identity (Profile anchor) ──────────────
// THE canonical way Rally renders "color". Feature cards, action tiles, category
// markers and prominent badges use a SOLID, vivid accent fill (not a faint alpha
// wash) paired with a FIXED contrast foreground. Both are mode-independent, so the
// same element stays vivid and legible on BOTH a dark and a light background —
// only the neutral layer (bg/surface/ink/line/muted, via useSportTheme) flips.
// Reference screen: Profile (ProfileEntryGrid). See docs/design/rally-design-language.md §3.1.
export const RallyAccent = {
  indigo: '#6155f5',
  indigoSoft: 'rgba(97,85,245,0.14)',
  orange: '#ff8d28',
  yellow: '#ffcc00',
} as const

// Home shortcut tile palette — a vivid warm→cool set used by HomeShortcutRail.
// User-directed redesign: drops the old dull trust-green and spreads the tiles
// across distinct hues so the rail reads playful. Yellow carries dark foreground
// (see shortcutColors); the rest carry white.
export const ShortcutAccent = {
  orange: RallyAccent.orange, // #ff8d28 — Lobby (primary)
  azure: '#2f7df6', // clean blue — Quest (primary)
  coral: '#ff6b5c', // warm pop — Guild
  indigo: RallyAccent.indigo, // #6155f5 — Referee (matches Profile's Referee card)
  yellow: RallyAccent.yellow, // #ffcc00 — Event / arena drops (dark fg)
} as const

// Foreground (text/icon) to place ON a solid accent fill.
export const OnAccent = {
  onColor: '#ffffff', // on dark-enough accents — indigo, orange (and green/red)
  onLight: '#161616', // on light accents — yellow / amber / lime
} as const

// Pick the readable foreground for ANY solid accent fill (handles dynamic accents
// like per-activity colors). Light accents (yellow/lime) get ink, the rest get white.
export function onAccent(hex: string): string {
  const c = hex.replace('#', '')
  if (c.length < 6) return OnAccent.onColor
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? OnAccent.onLight : OnAccent.onColor
}

export const RunArenaLight = {
  background: '#eef4f9',
  surface: '#fbfcf8',
  surfaceSoft: 'rgba(251,252,248,0.94)',
  surfaceRaised: '#ffffff',
  primary: '#d9ff4f',
  primarySoft: 'rgba(217,255,79,0.26)',
  primaryLine: 'rgba(92,108,62,0.24)',
  route: '#d8ff51',
  routeCasing: 'rgba(22,22,22,0.24)',
  danger: RallyPalette.red,
  dangerSoft: 'rgba(199,63,65,0.14)',
  warning: '#d9a441',
  warningSoft: 'rgba(217,164,65,0.14)',
  trust: RallyPalette.green,
  trustSoft: 'rgba(15,169,104,0.12)',
  text: RallyPalette.brown,
  textMuted: '#747b83',
  onPrimary: RallyPalette.brown,
  onDanger: '#fff8f0',
  shadow: 'rgba(71,88,111,0.2)',
  accent: '#d9ff4f',
  accentSoft: 'rgba(217,255,79,0.26)',
  accentLine: 'rgba(92,108,62,0.24)',
  card: '#fbfcf8',
  cardSoft: 'rgba(251,252,248,0.94)',
  cardRaised: '#ffffff',
  mapMist: 'rgba(238,244,249,0.64)',
  chalk: '#fff8f0',
  ink: RallyPalette.brown,
} as const

export const RunArenaDark = {
  background: '#0d1412',
  surface: '#121c19',
  surfaceSoft: 'rgba(18,28,25,0.94)',
  surfaceRaised: '#1b2622',
  primary: '#d9ff4f',
  primarySoft: 'rgba(217,255,79,0.18)',
  primaryLine: 'rgba(217,255,79,0.34)',
  route: '#d8ff51',
  routeCasing: 'rgba(5,8,7,0.72)',
  danger: RallyPalette.red,
  dangerSoft: 'rgba(199,63,65,0.22)',
  warning: '#e3b654',
  warningSoft: 'rgba(227,182,84,0.2)',
  trust: '#2fe39a',
  trustSoft: 'rgba(47,227,154,0.18)',
  text: '#f3f6ee',
  textMuted: 'rgba(243,246,238,0.64)',
  onPrimary: RallyPalette.brown,
  onDanger: '#fff8f0',
  shadow: 'rgba(0,0,0,0.42)',
  accent: '#d9ff4f',
  accentSoft: 'rgba(217,255,79,0.18)',
  accentLine: 'rgba(217,255,79,0.34)',
  card: '#121c19',
  cardSoft: 'rgba(18,28,25,0.94)',
  cardRaised: '#1b2622',
  mapMist: 'rgba(13,20,18,0.68)',
  chalk: '#fff8f0',
  ink: '#f3f6ee',
} as const

export type RunArenaPalette = { [K in keyof typeof RunArenaLight]: string }

export function getRunArenaPalette(mode: ThemeMode): RunArenaPalette {
  return mode === 'dark' ? RunArenaDark : RunArenaLight
}

// Legacy default for modules that have not yet been moved onto useThemeMode.
export const RunArenaPalette = RunArenaLight

const SportArena = {
  arena: '#d66538',
  panel: '#ffffff',
  ink: RallyPalette.brown,
  fightPanel: '#202020',
  fightPanelSoft: '#2a2a2a',
  edge: '#0d0d0d',
  line: 'rgba(22,22,22,0.16)',
  lineStrong: 'rgba(22,22,22,0.42)',
  muted: '#6f5a51',
  mutedSoft: '#9b8b83',
} as const

const SportArenaLight = {
  arenaBg: SportArena.arena,
  arenaBgMuted: '#c9633b',
  // Black-first page bg: near-black in dark, warm-light in light. Orange stays an
  // accent here (unlike arenaBg which floods the page orange in light mode).
  arenaPage: '#f1ece3',
  arenaInk: SportArena.ink,
  panelBg: SportArena.panel,
  economy: RallyPalette.amber,
  onEconomy: SportArena.ink,
  economySoft: 'rgba(234,195,26,0.2)',
  economyGlow: 'rgba(234,195,26,0.38)',
  trust: RallyPalette.green,
  trustSoft: 'rgba(15,169,104,0.14)',
  trustGlow: 'rgba(15,169,104,0.28)',
  success: RallyPalette.green,
  successSoft: 'rgba(15,169,104,0.14)',
  risk: RallyPalette.red,
  riskSoft: 'rgba(199,63,65,0.14)',
  fightBg: SportArena.ink,
  fightPanel: SportArena.fightPanel,
  fightInk: '#ffffff',
  fightInkSoft: '#d7d0cc',
  fightMuted: 'rgba(255,255,255,0.66)',
  fightLine: 'rgba(234,195,26,0.28)',
  bg: SportArena.panel,
  bgElevated: SportArena.panel,
  bgOverlay: 'rgba(255,255,255,0.92)',
  surface: 'rgba(22,22,22,0.05)',
  surfaceStrong: 'rgba(22,22,22,0.09)',
  surfacePressed: 'rgba(22,22,22,0.14)',
  line: SportArena.line,
  lineStrong: SportArena.lineStrong,
  ink: SportArena.ink,
  inkSoft: RallyPalette.deepBrown,
  muted: SportArena.muted,
  mutedSoft: SportArena.mutedSoft,
  chalk: '#ffffff',
  orange: RallyPalette.orange,
  orangeSoft: 'rgba(235,119,60,0.18)',
  red: RallyPalette.red,
  redSoft: 'rgba(199,63,65,0.14)',
  redGlow: 'rgba(199,63,65,0.28)',
  redVivid: '#df2f3d',
  amber: RallyPalette.amber,
  amberSoft: 'rgba(234,195,26,0.2)',
  green: RallyPalette.green,
  greenSoft: 'rgba(15,169,104,0.14)',
  greenVivid: '#0fa968',
  // Neon accept/decline accents — solid + mode-independent (used only by the
  // swipe-row actions and the accept/decline buttons, not the semantic green/red).
  actionAccept: '#B6FF00',
  actionAcceptInk: '#161616',
  actionAcceptSoft: 'rgba(182,255,0,0.16)',
  actionDecline: '#FF6B5C',
  actionDeclineInk: '#ffffff',
  actionDeclineSoft: 'rgba(255,107,92,0.16)',
  blue: RallyPalette.blue,
  blueSoft: 'rgba(128,139,195,0.18)',
  // Soft-surface shadow (Design v2) — light = 3-layer. Import via useSportTheme().shadowSoft.
  shadowSoft: '0 0 0 1px rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.07), 0 6px 16px -4px rgba(0,0,0,0.10)',
  shadowSoftHover: '0 0 0 1px rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.08), 0 2px 4px 0 rgba(0,0,0,0.06)',
  // @deprecated arcade skin — being retired (docs/superpowers/plans/2026-07-14-arcade-retire-migration.md). New screens: shadowSoft + ring 1px, not these.
  arcadeCabinet: SportArena.ink,
  arcadeCabinetEdge: SportArena.edge,
  arcadeHud: RallyPalette.orange,
  arcadeHudAlt: RallyPalette.red,
  arcadePanel: SportArena.panel,
  arcadePanelAlt: '#f4eadf',
  arcadeCta: RallyPalette.amber,
  arcadeCtaText: SportArena.ink,
  arcadeChip: 'rgba(22,22,22,0.07)',
  arcadeChipActive: RallyPalette.amber,
  arcadeGlow: 'rgba(234,195,26,0.34)',
  arcadeShadow: 'rgba(77,35,35,0.36)',
  arcadeHighlight: 'rgba(235,119,60,0.34)',
}

export const SportLight = SportArenaLight

export const SportDark = {
  arenaBg: SportArena.ink,
  arenaBgMuted: '#9d4e34',
  arenaPage: SportArena.ink,
  arenaInk: SportArena.panel,
  panelBg: SportArena.ink,
  economy: RallyPalette.amber,
  onEconomy: SportArena.ink,
  economySoft: 'rgba(234,195,26,0.18)',
  economyGlow: 'rgba(234,195,26,0.38)',
  trust: '#2fe39a',
  trustSoft: 'rgba(47,227,154,0.26)',
  trustGlow: 'rgba(47,227,154,0.34)',
  success: '#2fe39a',
  successSoft: 'rgba(47,227,154,0.26)',
  risk: RallyPalette.red,
  riskSoft: 'rgba(199,63,65,0.22)',
  fightBg: SportArena.ink,
  fightPanel: SportArena.fightPanel,
  fightInk: '#ffffff',
  fightInkSoft: '#d7d0cc',
  fightMuted: 'rgba(255,255,255,0.66)',
  fightLine: 'rgba(234,195,26,0.2)',
  bg: SportArena.ink,
  bgElevated: SportArena.fightPanel,
  bgOverlay: 'rgba(22,22,22,0.92)',
  surface: 'rgba(255,255,255,0.08)',
  surfaceStrong: 'rgba(255,255,255,0.13)',
  surfacePressed: 'rgba(255,255,255,0.18)',
  line: 'rgba(255,255,255,0.14)',
  lineStrong: 'rgba(255,255,255,0.26)',
  ink: '#ffffff',
  inkSoft: '#d7d0cc',
  muted: 'rgba(255,255,255,0.66)',
  mutedSoft: 'rgba(255,255,255,0.42)',
  chalk: '#ffffff',
  orange: RallyPalette.orange,
  orangeSoft: 'rgba(235,119,60,0.22)',
  red: RallyPalette.red,
  redSoft: 'rgba(199,63,65,0.22)',
  redGlow: 'rgba(199,63,65,0.34)',
  redVivid: '#fb4b57',
  amber: RallyPalette.amber,
  amberSoft: 'rgba(234,195,26,0.18)',
  green: '#2fe39a',
  greenSoft: 'rgba(47,227,154,0.26)',
  greenVivid: '#2fe39a',
  // Neon accept/decline accents — solid + mode-independent (used only by the
  // swipe-row actions and the accept/decline buttons, not the semantic green/red).
  actionAccept: '#B6FF00',
  actionAcceptInk: '#161616',
  actionAcceptSoft: 'rgba(182,255,0,0.16)',
  actionDecline: '#FF6B5C',
  actionDeclineInk: '#ffffff',
  actionDeclineSoft: 'rgba(255,107,92,0.16)',
  blue: RallyPalette.blue,
  blueSoft: 'rgba(128,139,195,0.24)',
  // Soft-surface shadow (Design v2) — dark = single ring. Import via useSportTheme().shadowSoft.
  shadowSoft: '0 0 0 1px rgba(255,255,255,0.08)',
  shadowSoftHover: '0 0 0 1px rgba(255,255,255,0.13)',
  // @deprecated arcade skin — being retired (docs/superpowers/plans/2026-07-14-arcade-retire-migration.md). New screens: shadowSoft + ring 1px, not these.
  arcadeCabinet: SportArena.ink,
  arcadeCabinetEdge: SportArena.edge,
  arcadeHud: RallyPalette.orange,
  arcadeHudAlt: RallyPalette.red,
  arcadePanel: SportArena.fightPanel,
  arcadePanelAlt: SportArena.fightPanelSoft,
  arcadeCta: RallyPalette.amber,
  arcadeCtaText: SportArena.ink,
  arcadeChip: 'rgba(255,255,255,0.12)',
  arcadeChipActive: RallyPalette.amber,
  arcadeGlow: 'rgba(234,195,26,0.34)',
  arcadeShadow: 'rgba(0,0,0,0.42)',
  arcadeHighlight: 'rgba(235,119,60,0.28)',
}

export type SportPalette = { [K in keyof typeof SportDark]: string }

export function getSportPalette(mode: ThemeMode): SportPalette {
  return mode === 'dark' ? SportDark : SportLight
}

// Legacy default for modules that have not yet been moved onto useSportTheme.
export const Sport = SportDark

const tintColor = SportLight.orange
export const Colors = {
  light: {
    text: SportLight.ink,
    background: SportLight.bg,
    tint: tintColor,
    icon: SportLight.muted,
    tabIconDefault: SportLight.muted,
    tabIconSelected: tintColor,
  },
  dark: {
    text: SportDark.ink,
    background: SportDark.bg,
    tint: tintColor,
    icon: SportDark.muted,
    tabIconDefault: SportDark.muted,
    tabIconSelected: tintColor,
  },
}

export const ActivityColor: Record<string, string> = {
  running: RallyPalette.lime,
  basketball: RallyPalette.orange,
  badminton: RallyPalette.teal,
}

export const TierColor: Record<string, string> = {
  bronze: '#c58b4b',
  silver: '#c7ccd3',
  gold: '#ffd14a',
  platinum: RallyPalette.blue,
  diamond: RallyPalette.green,
  immortal: RallyPalette.red,
  // NOTE: real asset is dark #161616 base w/ gold #eac31a edge accent — this
  // single-hex table only carries the accent; UI layer applies the dark base.
  challenger: '#eac31a',
}

// Fixed dark chip backing for TierBadge (mirrors PromotionMoment's #161616
// base + the real challenger asset's dark-base-with-accent-edge look). A tier
// hue is NEVER a bare foreground on a theme-flipping neutral surface — it
// always sits on this fixed backing so silver/gold/challenger stay legible in
// light mode and gold-on-gold never happens on the amber podium#1 card.
export const TierChipBg = RallyPalette.brown // #161616

// Foreground for TierBadge icon/label on TierChipBg. Most tiers' raw
// TierColor already clears contrast against the dark chip; diamond (dark
// green) and immortal (dark red) don't, so they borrow the same "Vivid"
// brightened variants SportDark/SportLight already use for text-on-dark-panel
// (theme.greenVivid / theme.redVivid) instead of a new one-off hex.
export const TierColorOnChip: Record<string, string> = {
  ...TierColor,
  diamond: '#2fe39a', // SportDark.greenVivid — readable on TierChipBg
  immortal: '#fb4b57', // SportDark.redVivid — readable on TierChipBg
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
}

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  pill: 999,
}

/**
 * Concentric radius (Design v2): a nested surface's outer radius = inner + padding,
 * so nested corners stay parallel. Applies when padding <= 24; for larger padding
 * treat as separate surfaces and choose radii independently.
 */
export function concentricRadius(innerRadius: number, padding: number): number {
  return padding <= 24 ? innerRadius + padding : innerRadius
}

export const Motion = {
  fast: 180,
  base: 280,
  slow: 480,
  spring: { damping: 18, stiffness: 180, mass: 0.6 },
}

export const Arcade = {
  touchTarget: 44,
  border: {
    hairline: 1,
    panel: 2,
    hero: 3,
  },
  slant: {
    soft: '-6deg',
    softInverse: '6deg',
    hard: '-12deg',
    hardInverse: '12deg',
  },
  // @deprecated arcade hard-edge skin (blur 0) — legacy screens only. New screens use palette.shadowSoft.
  shadow: {
    hardOffset: { width: 7, height: 9 },
    pressedOffset: { width: 4, height: 5 },
    radius: 0,
  },
  panel: {
    radius: Radius.xl,
    padding: Spacing.lg,
  },
  cta: {
    height: 52,
    radius: Radius.md,
    paddingHorizontal: Spacing.lg,
  },
  chip: {
    height: 34,
    radius: Radius.pill,
    paddingHorizontal: Spacing.md,
  },
  hud: {
    heroMinHeight: 236,
    mascotSize: 134,
  },
  text: {
    eyebrow: { size: 10, tracking: 1.8 },
    label: { size: 12, tracking: 0.4 },
    stat: { size: 44, lineHeight: 48 },
    statCompact: { size: 22, lineHeight: 26 },
  },
} as const

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
    number: 'ui-monospace',
    // Thai type — loaded in app/_layout.tsx via @expo-google-fonts. Family names
    // match the export names. English body uses `rounded` (SF Pro Rounded).
    thaiHead: 'Prompt_700Bold',
    thaiBody: 'IBMPlexSansThai_400Regular',
    thaiMedium: 'IBMPlexSansThai_500Medium',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
    number: 'monospace',
    thaiHead: 'Prompt_700Bold',
    thaiBody: 'IBMPlexSansThai_400Regular',
    thaiMedium: 'IBMPlexSansThai_500Medium',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    number: "BinancePlex, BinanceNova, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
    thaiHead: "'Prompt', system-ui, sans-serif",
    thaiBody: "'IBM Plex Sans Thai', system-ui, sans-serif",
    thaiMedium: "'IBM Plex Sans Thai', system-ui, sans-serif",
  },
})
