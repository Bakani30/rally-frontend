import { TIER_THRESHOLDS, type Tier } from '../leaderboard/tierRules'
import type { LeaderboardActivity } from '../leaderboard/leaderboardConfig'

export type RankFrameTab = 'profile' | LeaderboardActivity

export type RankFrameCellState = 'equipped' | 'equippable' | 'locked_above' | 'locked_passed'

export type RankFrameCell = { tier: Tier; state: RankFrameCellState; lockReason?: string }

// Lowest (bronze) to highest (challenger) — TIER_THRESHOLDS is ordered
// highest-first, so reverse it once here for index/comparison math below.
export const TIERS_LOW_TO_HIGH: Tier[] = [...TIER_THRESHOLDS].reverse().map((t) => t.tier)

export const TIER_LABEL: Record<Tier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  immortal: 'Immortal',
  challenger: 'Challenger',
}

function tierIndex(tier: Tier): number {
  return TIERS_LOW_TO_HIGH.indexOf(tier)
}

/**
 * Builds the 7-tier gating state for the Locker rank-frame picker.
 *
 * - Activity tab: only the user's current tier for that activity is
 *   equippable (or equipped, if it matches `equippedTier`); tiers below are
 *   locked_passed, tiers above are locked_above.
 * - Profile tab: equippable = union of every activity's current tier (or
 *   equipped, if it matches `equippedTier`). For tiers outside that union:
 *   locked_passed only applies to tiers strictly below every current tier
 *   (i.e. below the minimum); everything else that isn't equippable/equipped
 *   resolves to locked_above. This is a judgment call for the "in-between"
 *   case (e.g. running=silver, basketball=diamond -> gold/platinum are above
 *   one activity's tier but not themselves a current tier) — see task spec.
 */
export function buildRankFrameCells(
  userTiers: Partial<Record<LeaderboardActivity, Tier>>,
  tab: RankFrameTab,
  equippedTier: Tier | null,
): RankFrameCell[] {
  const currentTiers: Tier[] =
    tab === 'profile'
      ? Object.values(userTiers).filter((t): t is Tier => !!t)
      : [userTiers[tab] ?? 'bronze']

  const currentTiersOrDefault = currentTiers.length > 0 ? currentTiers : ['bronze' as Tier]
  const equippableSet = new Set(currentTiersOrDefault)
  const minIdx = Math.min(...currentTiersOrDefault.map(tierIndex))

  return TIERS_LOW_TO_HIGH.map((tier) => {
    if (tier === equippedTier) {
      return { tier, state: 'equipped' }
    }
    if (equippableSet.has(tier)) {
      return { tier, state: 'equippable' }
    }
    if (tierIndex(tier) < minIdx) {
      return { tier, state: 'locked_passed', lockReason: 'tier ผ่านมาแล้ว' }
    }
    return { tier, state: 'locked_above', lockReason: `ขึ้น ${TIER_LABEL[tier]} เพื่อปลดล็อก` }
  })
}
