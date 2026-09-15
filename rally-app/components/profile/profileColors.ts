// The vivid feature-accent model is now the app-wide color identity and lives in
// constants/theme.ts (RallyAccent / OnAccent). These aliases keep the Profile-scoped
// names; new code should prefer importing RallyAccent/OnAccent directly.
// Why fixed (not theme-flipping): the cards keep a solid colored background in both
// light and dark mode, so their foreground contrast must stay put.
export { RallyAccent as ProfileAccent, OnAccent as ProfileOnAccent } from '@/constants/theme'

// Member card (นามบัตร) palette — a physical-ID look that stays light in both themes.
export const ProfileCard = {
  surface: '#ffffff',
  band: '#6f8bff', // cornflower diagonal band
  bandSoft: '#cdd8ff', // light periwinkle (avatar ring)
  corner: '#7c828d', // grey corner stripe
  cornerSoft: '#aeb3bc', // lighter grey stripe
  border: '#6f8bff', // glowing blue edge
  glow: 'rgba(111,139,255,0.55)',
  ink: '#1b1b1b',
  label: '#1b1b1b',
  muted: '#9aa0ab',
  bar: '#1b1b1b',
} as const
