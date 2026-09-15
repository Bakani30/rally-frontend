import type { SportPalette } from '@/constants/theme'
import type { RefereeTierAccent } from '@/lib/match/refereeLevels'

export type RefereeTierColors = { fg: string; bg: string; border: string }

// Resolve a tier's accent family into concrete theme colors (fg / soft bg /
// translucent border) so light + dark stay in sync with the rest of the app.
export function refereeTierColors(theme: SportPalette, accent: RefereeTierAccent): RefereeTierColors {
  switch (accent) {
    case 'blue':
      return { fg: theme.blue, bg: theme.blueSoft, border: `${theme.blue}55` }
    case 'green':
      return { fg: theme.green, bg: theme.greenSoft, border: `${theme.green}55` }
    case 'amber':
      return { fg: theme.amber, bg: theme.amberSoft, border: `${theme.amber}55` }
    case 'orange':
      return { fg: theme.orange, bg: theme.orangeSoft, border: `${theme.orange}55` }
    default:
      return { fg: theme.muted, bg: theme.surfaceStrong, border: theme.line }
  }
}
