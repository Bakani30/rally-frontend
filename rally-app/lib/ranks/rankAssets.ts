import type { ImageSourcePropType } from 'react-native'
import type { Tier } from '../leaderboard/tierRules'

// Static ESM import map — Metro needs literal, non-dynamic asset references
// per file, and static `import` (unlike `require()`) resolves through
// Vitest's normal module graph, so it can be exercised by unit tests via
// `vi.mock('../../assets/ranks/<file>.png', ...)` — see rankAssets.test.ts.
import rank1Bronze from '../../assets/ranks/rank-1-bronze.png'
import rank2Silver from '../../assets/ranks/rank-2-silver.png'
import rank3Gold from '../../assets/ranks/rank-3-gold.png'
import rank4Platinum from '../../assets/ranks/rank-4-platinum.png'
import rank5Diamond from '../../assets/ranks/rank-5-diamond.png'
import rank6Immortal from '../../assets/ranks/rank-6-immortal.png'
import rank7Challenger from '../../assets/ranks/rank-7-challenger.png'

const RANK_ICON_BY_TIER: Record<Tier, ImageSourcePropType> = {
  bronze: rank1Bronze,
  silver: rank2Silver,
  gold: rank3Gold,
  platinum: rank4Platinum,
  diamond: rank5Diamond,
  immortal: rank6Immortal,
  challenger: rank7Challenger,
}

export const RANK_FRAME_CODE_BY_TIER: Record<Tier, string> = {
  bronze: 'rank_frame_bronze',
  silver: 'rank_frame_silver',
  gold: 'rank_frame_gold',
  platinum: 'rank_frame_platinum',
  diamond: 'rank_frame_diamond',
  immortal: 'rank_frame_immortal',
  challenger: 'rank_frame_challenger',
}

// `activity` is accepted for a future per-activity icon set (e.g. basketball
// vs. run rank art); v1 only ships the default set, so any/no activity
// resolves to the same default icon.
export function getRankIcon(tier: Tier, _activity?: string): ImageSourcePropType {
  return RANK_ICON_BY_TIER[tier]
}
