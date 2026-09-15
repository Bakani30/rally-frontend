import { TierColor } from '@/constants/theme'
import type { Tier } from '@/lib/leaderboard/tierRules'

// Muted red for demotions — a rank drop reads as information, not failure
// (mock: `--demote:#d98b8f`, not the alarm red used for stake/loss).
export const DEMOTE_COLOR = '#d98b8f'

// Tier accent for the rank page. TierColor is the single source of truth
// (constants/theme.ts); challenger's table hue is its gold edge accent.
export function tierAccent(tier: Tier): string {
  return TierColor[tier] ?? TierColor.bronze
}
